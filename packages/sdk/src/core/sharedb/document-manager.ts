/**
 * ShareDB 文档管理器
 * 管理文档实例池、生命周期和版本控制
 */

import type { 
  ShareDBMessage, 
  OTOperation, 
  ShareDBSnapshot, 
  DocumentConfig 
} from '../../types/sharedb.js';
import type { EventBus, OperationEvent, SnapshotEvent } from '../../types/events.js';
import { OperationTransformer } from './operation-transformer.js';

export interface DocumentInstance {
  collection: string;
  docId: string;
  snapshot?: ShareDBSnapshot;
  version: number;
  localVersion: number;
  isSubscribed: boolean;
  pendingOperations: OTOperation[];
  lastActivity: number;
}

export interface DocumentManagerConfig {
  maxDocuments?: number;
  documentTimeout?: number;
  operationTimeout?: number;
  enableVersionControl?: boolean;
}

export class DocumentManager {
  private documents: Map<string, DocumentInstance> = new Map();
  private eventBus: EventBus;
  private config: DocumentManagerConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(eventBus: EventBus, config: DocumentManagerConfig = {}) {
    this.eventBus = eventBus;
    this.config = {
      maxDocuments: 100,
      documentTimeout: 300000, // 5 minutes
      operationTimeout: 10000, // 10 seconds
      enableVersionControl: true,
      ...config
    };

    this.startCleanup();
  }

  /**
   * 创建或获取文档实例
   */
  createDocument(collection: string, docId: string): DocumentInstance {
    const key = this.getDocumentKey(collection, docId);
    
    if (this.documents.has(key)) {
      const doc = this.documents.get(key)!;
      doc.lastActivity = Date.now();
      return doc;
    }

    // 检查文档数量限制
    if (this.documents.size >= (this.config.maxDocuments || 100)) {
      this.cleanupOldDocuments();
    }

    const document: DocumentInstance = {
      collection,
      docId,
      version: 0,
      localVersion: 0,
      isSubscribed: false,
      pendingOperations: [],
      lastActivity: Date.now()
    };

    this.documents.set(key, document);
    return document;
  }

  /**
   * 获取文档实例
   */
  getDocument(collection: string, docId: string): DocumentInstance | undefined {
    const key = this.getDocumentKey(collection, docId);
    return this.documents.get(key);
  }

  /**
   * 更新文档快照
   */
  updateSnapshot(collection: string, docId: string, snapshot: ShareDBSnapshot): void {
    const doc = this.getDocument(collection, docId);
    if (doc) {
      doc.snapshot = snapshot;
      doc.version = snapshot.v;
      doc.localVersion = snapshot.v;
      doc.lastActivity = Date.now();

      // 触发快照事件
      this.eventBus.emit('snapshot', {
        type: 'snapshot-received',
        timestamp: Date.now(),
        collection,
        docId,
        snapshot,
        version: snapshot.v
      } as SnapshotEvent);
    }
  }

  /**
   * 添加操作到文档
   */
  addOperation(collection: string, docId: string, operation: OTOperation): void {
    const doc = this.getDocument(collection, docId);
    if (!doc) {
      console.warn(`[DocumentManager] 文档不存在: ${collection}/${docId}`);
      return;
    }

    // 验证操作
    if (!this.validateOperation(operation, doc.snapshot?.data)) {
      console.error(`[DocumentManager] 无效操作:`, operation);
      return;
    }

    // 应用操作到本地版本
    if (doc.snapshot) {
      try {
        const newData = OperationTransformer.applyOperation(doc.snapshot.data, operation);
        doc.snapshot.data = newData;
        doc.localVersion++;
        doc.lastActivity = Date.now();
      } catch (error) {
        console.error(`[DocumentManager] 应用操作失败:`, error);
        return;
      }
    }

    // 添加到待处理操作队列
    doc.pendingOperations.push(operation);

    // 触发操作事件
    this.eventBus.emit('operation', {
      type: 'operation-received',
      timestamp: Date.now(),
      collection,
      docId,
      operation: [operation],
      version: doc.localVersion
    } as OperationEvent);
  }

  /**
   * 提交操作
   */
  async submitOperation(collection: string, docId: string, operations: OTOperation[]): Promise<void> {
    const doc = this.getDocument(collection, docId);
    if (!doc) {
      throw new Error(`文档不存在: ${collection}/${docId}`);
    }

    // 检查版本冲突
    if (this.config.enableVersionControl) {
      const conflicts = this.checkVersionConflicts(doc, operations);
      if (conflicts.length > 0) {
        console.warn(`[DocumentManager] 检测到版本冲突:`, conflicts);
        // 这里可以实现更复杂的冲突解决策略
      }
    }

    // 应用操作
    for (const operation of operations) {
      this.addOperation(collection, docId, operation);
    }

    // 清空待处理操作
    doc.pendingOperations = [];
  }

  /**
   * 订阅文档
   */
  subscribeDocument(collection: string, docId: string): void {
    const doc = this.getDocument(collection, docId);
    if (doc) {
      doc.isSubscribed = true;
      doc.lastActivity = Date.now();
    }
  }

  /**
   * 取消订阅文档
   */
  unsubscribeDocument(collection: string, docId: string): void {
    const doc = this.getDocument(collection, docId);
    if (doc) {
      doc.isSubscribed = false;
    }
  }

  /**
   * 删除文档
   */
  removeDocument(collection: string, docId: string): void {
    const key = this.getDocumentKey(collection, docId);
    this.documents.delete(key);
  }

  /**
   * 获取所有文档
   */
  getAllDocuments(): DocumentInstance[] {
    return Array.from(this.documents.values());
  }

  /**
   * 获取活跃文档
   */
  getActiveDocuments(): DocumentInstance[] {
    return this.getAllDocuments().filter(doc => doc.isSubscribed);
  }

  /**
   * 清理文档管理器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.documents.clear();
  }

  /**
   * 获取文档键
   */
  private getDocumentKey(collection: string, docId: string): string {
    return `${collection}:${docId}`;
  }

  /**
   * 验证操作
   */
  private validateOperation(operation: OTOperation, document?: any): boolean {
    if (!operation || typeof operation !== 'object') {
      return false;
    }

    if (!Array.isArray(operation.p)) {
      return false;
    }

    // 检查路径是否有效
    if (operation.p.length === 0) {
      return false;
    }

    // 至少需要有一个操作类型
    const hasOperation = 'oi' in operation || 'od' in operation || 
                        'li' in operation || 'ld' in operation || 
                        'lm' in operation || 'na' in operation;
    
    if (!hasOperation) {
      return false;
    }

    // 如果有文档，验证操作是否可以应用
    if (document) {
      return OperationTransformer.validateOperation(operation, document);
    }

    return true;
  }

  /**
   * 检查版本冲突
   */
  private checkVersionConflicts(doc: DocumentInstance, operations: OTOperation[]): any[] {
    const conflicts: any[] = [];

    // 简单的版本冲突检查
    if (doc.pendingOperations.length > 0) {
      conflicts.push({
        type: 'pending_operations',
        message: '有未提交的操作',
        count: doc.pendingOperations.length
      });
    }

    return conflicts;
  }

  /**
   * 清理旧文档
   */
  private cleanupOldDocuments(): void {
    const now = Date.now();
    const timeout = this.config.documentTimeout || 300000;
    
    const toRemove: string[] = [];
    
    for (const [key, doc] of this.documents) {
      if (!doc.isSubscribed && (now - doc.lastActivity) > timeout) {
        toRemove.push(key);
      }
    }

    for (const key of toRemove) {
      this.documents.delete(key);
    }

    if (toRemove.length > 0) {
      console.log(`[DocumentManager] 清理了 ${toRemove.length} 个旧文档`);
    }
  }

  /**
   * 开始清理定时器
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldDocuments();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 获取文档统计信息
   */
  getStats(): {
    totalDocuments: number;
    activeDocuments: number;
    pendingOperations: number;
  } {
    const allDocs = this.getAllDocuments();
    const activeDocs = this.getActiveDocuments();
    const totalPending = allDocs.reduce((sum, doc) => sum + doc.pendingOperations.length, 0);

    return {
      totalDocuments: allDocs.length,
      activeDocuments: activeDocs.length,
      pendingOperations: totalPending
    };
  }
}
