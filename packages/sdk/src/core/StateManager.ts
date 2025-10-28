/**
 * 状态管理器
 * 负责管理客户端的状态和状态转换
 */

export type ClientState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'disconnected'

export interface StateTransition {
  from: ClientState
  to: ClientState
  timestamp: Date
  reason?: string
}

export interface StateStats {
  currentState: ClientState
  stateHistory: StateTransition[]
  timeInCurrentState: number
  totalTransitions: number
  lastTransition?: StateTransition
}

export class StateManager {
  private currentState: ClientState = 'idle'
  private stateHistory: StateTransition[] = []
  private stateEnterTime: Date = new Date()
  private listeners: Map<string, Function[]> = new Map()
  private maxHistorySize: number = 100

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize
  }

  /**
   * 转换状态
   */
  transition(to: ClientState, reason?: string): void {
    if (to === this.currentState) {
      return
    }

    const transition: StateTransition = {
      from: this.currentState,
      to,
      timestamp: new Date(),
      reason
    }

    // 记录状态转换
    this.stateHistory.push(transition)
    
    // 限制历史记录大小
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift()
    }

    const previousState = this.currentState
    this.currentState = to
    this.stateEnterTime = new Date()

    // 触发事件
    this.emit('stateChange', {
      from: previousState,
      to,
      transition,
      stats: this.getStats()
    })

    // 触发特定状态事件
    this.emit(`state:${to}`, transition)
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): ClientState {
    return this.currentState
  }

  /**
   * 检查是否处于特定状态
   */
  isInState(state: ClientState): boolean {
    return this.currentState === state
  }

  /**
   * 检查是否可以转换到目标状态
   */
  canTransitionTo(targetState: ClientState): boolean {
    const validTransitions: Record<ClientState, ClientState[]> = {
      'idle': ['connecting', 'disconnected'],
      'connecting': ['connected', 'error', 'disconnected'],
      'connected': ['reconnecting', 'disconnected', 'error'],
      'reconnecting': ['connected', 'error', 'disconnected'],
      'error': ['connecting', 'disconnected', 'idle'],
      'disconnected': ['connecting', 'idle']
    }

    return validTransitions[this.currentState]?.includes(targetState) ?? false
  }

  /**
   * 安全转换状态（检查有效性）
   */
  safeTransition(to: ClientState, reason?: string): boolean {
    if (!this.canTransitionTo(to)) {
      console.warn(`Invalid state transition from ${this.currentState} to ${to}`)
      return false
    }

    this.transition(to, reason)
    return true
  }

  /**
   * 获取状态统计信息
   */
  getStats(): StateStats {
    const now = new Date()
    const timeInCurrentState = now.getTime() - this.stateEnterTime.getTime()

    return {
      currentState: this.currentState,
      stateHistory: [...this.stateHistory],
      timeInCurrentState,
      totalTransitions: this.stateHistory.length,
      lastTransition: this.stateHistory[this.stateHistory.length - 1]
    }
  }

  /**
   * 获取状态历史
   */
  getStateHistory(): StateTransition[] {
    return [...this.stateHistory]
  }

  /**
   * 获取在特定状态中花费的时间
   */
  getTimeInState(state: ClientState): number {
    let totalTime = 0
    let stateStartTime: Date | null = null

    for (const transition of this.stateHistory) {
      if (transition.to === state && !stateStartTime) {
        stateStartTime = transition.timestamp
      } else if (transition.from === state && stateStartTime) {
        totalTime += transition.timestamp.getTime() - stateStartTime.getTime()
        stateStartTime = null
      }
    }

    // 如果当前状态是目标状态，加上当前时间
    if (this.currentState === state && stateStartTime) {
      totalTime += Date.now() - stateStartTime.getTime()
    }

    return totalTime
  }

  /**
   * 获取状态分布
   */
  getStateDistribution(): Record<ClientState, number> {
    const distribution: Record<ClientState, number> = {
      'idle': 0,
      'connecting': 0,
      'connected': 0,
      'reconnecting': 0,
      'error': 0,
      'disconnected': 0
    }

    for (const transition of this.stateHistory) {
      distribution[transition.to]++
    }

    return distribution
  }

  /**
   * 添加状态监听器
   */
  onStateChange(listener: (event: any) => void): () => void {
    this.on('stateChange', listener)
    return () => this.off('stateChange', listener)
  }

  /**
   * 添加特定状态监听器
   */
  onState(state: ClientState, listener: (transition: StateTransition) => void): () => void {
    this.on(`state:${state}`, listener)
    return () => this.off(`state:${state}`, listener)
  }

  /**
   * 添加事件监听器
   */
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(listener)
  }

  /**
   * 移除事件监听器
   */
  off(event: string, listener: Function): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args)
        } catch (error) {
          console.error(`Error in state manager event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * 重置状态管理器
   */
  reset(): void {
    this.currentState = 'idle'
    this.stateHistory = []
    this.stateEnterTime = new Date()
    this.listeners.clear()
  }

  /**
   * 获取状态描述
   */
  getStateDescription(): string {
    const descriptions: Record<ClientState, string> = {
      'idle': '客户端处于空闲状态',
      'connecting': '正在连接到服务器',
      'connected': '已连接到服务器',
      'reconnecting': '正在重新连接',
      'error': '连接出现错误',
      'disconnected': '已断开连接'
    }

    return descriptions[this.currentState] || '未知状态'
  }

  /**
   * 检查是否处于稳定状态
   */
  isStable(): boolean {
    return this.currentState === 'connected' || this.currentState === 'idle'
  }

  /**
   * 检查是否处于连接状态
   */
  isConnected(): boolean {
    return this.currentState === 'connected'
  }

  /**
   * 检查是否处于错误状态
   */
  hasError(): boolean {
    return this.currentState === 'error'
  }
}
