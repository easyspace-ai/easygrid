/**
 * 查询缓存
 * 负责缓存 ShareDB 查询结果，避免重复查询
 */

export interface QueryOptions {
  filter?: any
  sort?: any
  limit?: number
  skip?: number
  projection?: Record<string, boolean>
}

export interface QueryResult {
  collection: string
  query: QueryOptions
  results: Array<{
    docId: string
    data: any
    version: number
  }>
  lastUpdated: Date
  subscribers: Set<(results: QueryResult['results']) => void>
}

export class QueryCache {
  private cache: Map<string, QueryResult> = new Map()
  private maxCacheSize: number = 100
  private maxAge: number = 5 * 60 * 1000 // 5分钟

  constructor(maxCacheSize: number = 100, maxAge: number = 5 * 60 * 1000) {
    this.maxCacheSize = maxCacheSize
    this.maxAge = maxAge
  }

  /**
   * 生成查询键
   */
  generateKey(collection: string, query: QueryOptions): string {
    const queryStr = JSON.stringify(query)
    return `${collection}:${this.hashString(queryStr)}`
  }

  /**
   * 获取缓存结果
   */
  get(key: string): QueryResult | undefined {
    const result = this.cache.get(key)
    
    if (result) {
      // 检查是否过期
      if (Date.now() - result.lastUpdated.getTime() > this.maxAge) {
        this.cache.delete(key)
        return undefined
      }
      
      return result
    }
    
    return undefined
  }

  /**
   * 设置缓存结果
   */
  set(key: string, collection: string, query: QueryOptions, results: QueryResult['results']): QueryResult {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest()
    }

    const result: QueryResult = {
      collection,
      query,
      results,
      lastUpdated: new Date(),
      subscribers: new Set(),
    }

    this.cache.set(key, result)
    return result
  }

  /**
   * 订阅查询结果
   */
  subscribe(key: string, callback: (results: QueryResult['results']) => void): () => void {
    const result = this.cache.get(key)
    
    if (result) {
      result.subscribers.add(callback)
      
      // 返回取消订阅函数
      return () => {
        result.subscribers.delete(callback)
        
        // 如果没有订阅者了，可以考虑清理缓存
        if (result.subscribers.size === 0) {
          // 延迟清理，给其他可能的订阅者一些时间
          setTimeout(() => {
            const currentResult = this.cache.get(key)
            if (currentResult && currentResult.subscribers.size === 0) {
              this.cache.delete(key)
            }
          }, 1000)
        }
      }
    }
    
    // 如果缓存中没有结果，返回空函数
    return () => {}
  }

  /**
   * 更新查询结果
   */
  updateResults(key: string, results: QueryResult['results']): void {
    const result = this.cache.get(key)
    
    if (result) {
      result.results = results
      result.lastUpdated = new Date()
      
      // 通知所有订阅者
      result.subscribers.forEach(callback => {
        try {
          callback(results)
        } catch (error) {
          console.error('Error in query subscriber:', error)
        }
      })
    }
  }

  /**
   * 添加单个结果到查询缓存
   */
  addResult(key: string, docId: string, data: any, version: number): void {
    const result = this.cache.get(key)
    
    if (result) {
      // 查找是否已存在
      const existingIndex = result.results.findIndex(r => r.docId === docId)
      
      if (existingIndex >= 0) {
        // 更新现有结果
        result.results[existingIndex] = { docId, data, version }
      } else {
        // 添加新结果
        result.results.push({ docId, data, version })
      }
      
      result.lastUpdated = new Date()
      
      // 通知订阅者
      result.subscribers.forEach(callback => {
        try {
          callback(result.results)
        } catch (error) {
          console.error('Error in query subscriber:', error)
        }
      })
    }
  }

  /**
   * 从查询缓存中移除结果
   */
  removeResult(key: string, docId: string): void {
    const result = this.cache.get(key)
    
    if (result) {
      const index = result.results.findIndex(r => r.docId === docId)
      
      if (index >= 0) {
        result.results.splice(index, 1)
        result.lastUpdated = new Date()
        
        // 通知订阅者
        result.subscribers.forEach(callback => {
          try {
            callback(result.results)
          } catch (error) {
            console.error('Error in query subscriber:', error)
          }
        })
      }
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now()
    
    for (const [key, result] of this.cache.entries()) {
      if (now - result.lastUpdated.getTime() > this.maxAge) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const results = Array.from(this.cache.values())
    
    return {
      totalQueries: results.length,
      totalSubscribers: results.reduce((sum, result) => sum + result.subscribers.size, 0),
      totalResults: results.reduce((sum, result) => sum + result.results.length, 0),
      oldestQuery: results.length > 0 ? Math.min(...results.map(r => r.lastUpdated.getTime())) : 0,
      newestQuery: results.length > 0 ? Math.max(...results.map(r => r.lastUpdated.getTime())) : 0,
    }
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 删除最旧的缓存条目
   */
  private evictOldest(): void {
    let oldestKey: string | undefined
    let oldestTime = Date.now()
    
    for (const [key, result] of this.cache.entries()) {
      if (result.lastUpdated.getTime() < oldestTime) {
        oldestTime = result.lastUpdated.getTime()
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * 字符串哈希函数
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash).toString(36)
  }
}
