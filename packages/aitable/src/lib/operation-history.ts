/**
 * Operation History Manager
 * 占位符实现 - 待完善
 */

export interface IOperation {
  type: string;
  data: any;
  timestamp?: number;
}

export interface IHistoryEntry {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  userId?: string;
  description?: string;
}

export class OperationHistory {
  private history: IHistoryEntry[] = [];
  private currentIndex: number = -1;
  private maxSize: number = 100;
  private changeListeners: Array<(history: IHistoryEntry[]) => void> = [];

  constructor(config: number | { maxSize?: number; autoSave?: boolean; storageKey?: string } = 100) {
    if (typeof config === 'number') {
      this.maxSize = config;
    } else {
      this.maxSize = config.maxSize || 100;
    }
  }

  push(operation: IOperation | IHistoryEntry): void {
    // 移除当前位置之后的所有操作
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // 添加新操作
    const entry: IHistoryEntry = {
      id: 'id' in operation ? operation.id : `op_${Date.now()}`,
      type: operation.type,
      data: operation.data,
      timestamp: operation.timestamp || Date.now(),
    };
    
    this.history.push(entry);

    // 限制历史记录大小
    if (this.history.length > this.maxSize) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
    
    this.notifyChange();
  }

  undo(): IHistoryEntry | null {
    if (this.canUndo()) {
      const operation = this.history[this.currentIndex];
      this.currentIndex--;
      this.notifyChange();
      return operation;
    }
    return null;
  }

  redo(): IHistoryEntry | null {
    if (this.canRedo()) {
      this.currentIndex++;
      this.notifyChange();
      return this.history[this.currentIndex];
    }
    return null;
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.notifyChange();
  }

  getHistory(): IHistoryEntry[] {
    return this.history.slice(0, this.currentIndex + 1);
  }

  getRecordHistory(recordId: string): IHistoryEntry[] {
    return this.getHistory().filter(entry => 
      entry.data?.recordId === recordId
    );
  }

  getFieldHistory(recordId: string, fieldId: string): IHistoryEntry[] {
    return this.getHistory().filter(entry => 
      entry.data?.recordId === recordId && entry.data?.fieldId === fieldId
    );
  }

  // onChange 事件
  onChange(callback: (history: IHistoryEntry[]) => void): () => void {
    this.changeListeners.push(callback);
    // 返回取消订阅函数
    return () => {
      const index = this.changeListeners.indexOf(callback);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  private notifyChange(): void {
    const currentHistory = this.getHistory();
    this.changeListeners.forEach(listener => listener(currentHistory));
  }
}

export function createOperationHistory(config?: { maxSize?: number; autoSave?: boolean; storageKey?: string }): OperationHistory {
  return new OperationHistory(config?.maxSize);
}
