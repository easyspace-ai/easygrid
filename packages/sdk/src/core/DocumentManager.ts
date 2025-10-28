/**
 * 文档管理器
 * 负责管理 ShareDB 文档的生命周期和缓存
 */

import { EasyGridClient, ShareDBSnapshot } from './EasyGridClient.js'

export interface DocumentInfo {
  collection: string
  docId: string
  snapshot?: ShareDBSnapshot
  subscribers: Set<(snapshot: ShareDBSnapshot) => void>
  lastAccessed: Date
  refCount: number
}

export class DocumentManager {
  private client: EasyGridClient
  private documents: Map<string, DocumentInfo> = new Map()
  private unsubscribeFunctions: Map<string, () => void> = new Map()

  constructor(client: EasyGridClient) {
    this.client = client
  }

  /**
   * 获取或创建文档
   */
  getOrCreateDoc(collection: string, docId: string): DocumentInfo {
    const key = this.getDocumentKey(collection, docId)
    
    if (!this.documents.has(key)) {
      const doc: DocumentInfo = {
        collection,
        docId,
        subscribers: new Set(),
        lastAccessed: new Date(),
        refCount: 0,
      }
      this.documents.set(key, doc)
    }
    
    const doc = this.documents.get(key)!
    doc.lastAccessed = new Date()
    doc.refCount++
    
    return doc
  }

  /**
   * 订阅文档
   */
  subscribe(collection: string, docId: string, callback: (snapshot: ShareDBSnapshot) => void): () => void {
    const doc = this.getOrCreateDoc(collection, docId)
    const key = this.getDocumentKey(collection, docId)
    
    // 添加订阅者
    doc.subscribers.add(callback)
    
    // 如果还没有订阅 ShareDB，则开始订阅
    if (!this.unsubscribeFunctions.has(key)) {
      const unsubscribe = this.client.subscribe(collection, docId, (snapshot) => {
        // 更新文档快照
        doc.snapshot = snapshot
        
        // 通知所有订阅者
        doc.subscribers.forEach(cb => {
          try {
            cb(snapshot)
          } catch (error) {
            console.error('Error in document subscriber:', error)
          }
        })
      })
      
      this.unsubscribeFunctions.set(key, unsubscribe)
    }
    
    // 如果已有快照，立即通知订阅者
    if (doc.snapshot) {
      try {
        callback(doc.snapshot)
      } catch (error) {
        console.error('Error in initial document callback:', error)
      }
    }
    
    // 返回取消订阅函数
    return () => {
      this.unsubscribe(collection, docId, callback)
    }
  }

  /**
   * 取消订阅文档
   */
  unsubscribe(collection: string, docId: string, callback: (snapshot: ShareDBSnapshot) => void): void {
    const key = this.getDocumentKey(collection, docId)
    const doc = this.documents.get(key)
    
    if (!doc) {
      return
    }
    
    // 移除订阅者
    doc.subscribers.delete(callback)
    doc.refCount--
    
    // 如果没有订阅者了，取消 ShareDB 订阅
    if (doc.subscribers.size === 0) {
      const unsubscribe = this.unsubscribeFunctions.get(key)
      if (unsubscribe) {
        unsubscribe()
        this.unsubscribeFunctions.delete(key)
      }
      
      // 从文档映射中移除
      this.documents.delete(key)
    }
  }

  /**
   * 释放文档引用
   */
  releaseDoc(collection: string, docId: string): void {
    const key = this.getDocumentKey(collection, docId)
    const doc = this.documents.get(key)
    
    if (doc) {
      doc.refCount--
      
      // 如果引用计数为0且没有订阅者，则清理文档
      if (doc.refCount <= 0 && doc.subscribers.size === 0) {
        const unsubscribe = this.unsubscribeFunctions.get(key)
        if (unsubscribe) {
          unsubscribe()
          this.unsubscribeFunctions.delete(key)
        }
        
        this.documents.delete(key)
      }
    }
  }

  /**
   * 获取文档快照
   */
  async fetch(collection: string, docId: string): Promise<ShareDBSnapshot> {
    const snapshot = await this.client.fetch(collection, docId)
    
    // 更新本地缓存
    const key = this.getDocumentKey(collection, docId)
    const doc = this.documents.get(key)
    if (doc) {
      doc.snapshot = snapshot
    }
    
    return snapshot
  }

  /**
   * 更新文档
   */
  async update(collection: string, docId: string, op: any[], version?: number): Promise<void> {
    await this.client.submitOp(collection, docId, op, version)
  }

  /**
   * 获取文档数量
   */
  getDocumentCount(): number {
    return this.documents.size
  }

  /**
   * 获取活跃文档列表
   */
  getActiveDocuments(): DocumentInfo[] {
    return Array.from(this.documents.values())
  }

  /**
   * 清理过期文档
   */
  cleanup(maxAge: number = 5 * 60 * 1000): void { // 默认5分钟
    const now = new Date()
    const cutoff = new Date(now.getTime() - maxAge)
    
    for (const [key, doc] of this.documents.entries()) {
      if (doc.lastAccessed < cutoff && doc.subscribers.size === 0) {
        // 清理过期且无订阅者的文档
        const unsubscribe = this.unsubscribeFunctions.get(key)
        if (unsubscribe) {
          unsubscribe()
          this.unsubscribeFunctions.delete(key)
        }
        
        this.documents.delete(key)
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const docs = Array.from(this.documents.values())
    
    return {
      totalDocuments: docs.length,
      totalSubscribers: docs.reduce((sum, doc) => sum + doc.subscribers.size, 0),
      totalRefCount: docs.reduce((sum, doc) => sum + doc.refCount, 0),
      documentsWithSnapshots: docs.filter(doc => doc.snapshot).length,
    }
  }

  /**
   * 清空所有文档
   */
  clear(): void {
    // 取消所有订阅
    for (const unsubscribe of this.unsubscribeFunctions.values()) {
      unsubscribe()
    }
    
    this.unsubscribeFunctions.clear()
    this.documents.clear()
  }

  /**
   * 获取文档键
   */
  private getDocumentKey(collection: string, docId: string): string {
    return `${collection}:${docId}`
  }
}
