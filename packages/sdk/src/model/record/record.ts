/**
 * Record 类 - 实现乐观更新、错误回滚、计算字段处理
 * 参考 Teable 的 Record 实现
 */

import { RecordCore, IRecord, IFieldInstance } from './record-core.js'
import { ShareDBDoc, OTOperation } from './sharedb-types.js'
import { SDKErrorHandler } from '../../core/error-handler.js'

export interface UpdateRecordRequest {
  fieldKeyType: 'id' | 'name'
  record: {
    fields: { [fieldId: string]: any }
  }
}

export interface UpdateRecordResponse {
  data: IRecord
  computedFields?: { [fieldId: string]: any }
}

export type FieldKeyType = 'id' | 'name'

/**
 * 乐观更新回调函数类型
 */
export type CommitLocalCallback = (fieldId: string, value: any, isRollback?: boolean) => void

/**
 * Record 类 - 支持乐观更新的记录模型
 */
export class Record extends RecordCore {
  protected doc: ShareDBDoc<IRecord>
  protected fieldMap: { [fieldId: string]: IFieldInstance }
  protected onCommitLocal: CommitLocalCallback
  protected pendingUpdates: Map<string, any> = new Map()

  constructor(
    data: IRecord,
    doc: ShareDBDoc<IRecord>,
    fieldMap: { [fieldId: string]: IFieldInstance },
    onCommitLocal: CommitLocalCallback
  ) {
    super(data)
    this.doc = doc
    this.fieldMap = fieldMap
    this.onCommitLocal = onCommitLocal
  }

  /**
   * 乐观更新单元格
   * 参考 Teable 的 updateCell 实现
   */
  async updateCell(
    fieldId: string,
    cellValue: unknown,
    options?: {
      skipValidation?: boolean
      skipComputedFields?: boolean
    }
  ): Promise<void> {
    const oldValue = this.fields[fieldId]
    const skipValidation = options?.skipValidation ?? false
    const skipComputedFields = options?.skipComputedFields ?? false

    try {
      // 1. 验证字段值（如果需要）
      if (!skipValidation) {
        this.validateFieldValue(fieldId, cellValue)
      }

      // 2. 立即更新本地状态（乐观更新）
      this.onCommitLocal(fieldId, cellValue)
      this.fields[fieldId] = cellValue
      this.pendingUpdates.set(fieldId, cellValue)

      // 3. HTTP API 保存
      const res = await this.updateRecordAPI({
        fieldKeyType: 'id' as FieldKeyType,
        record: {
          fields: {
            [fieldId]: cellValue === undefined ? null : cellValue
          }
        }
      })

      // 4. 处理计算字段（如果需要）
      if (!skipComputedFields && res.computedFields) {
        this.updateComputedFields(res.computedFields)
      }

      // 5. 清除待更新标记
      this.pendingUpdates.delete(fieldId)

      console.log(`✅ 字段 ${fieldId} 更新成功:`, { oldValue, newValue: cellValue })

    } catch (error) {
      // 6. 错误回滚
      console.error(`❌ 字段 ${fieldId} 更新失败:`, error)
      this.onCommitLocal(fieldId, oldValue, true)
      this.fields[fieldId] = oldValue
      this.pendingUpdates.delete(fieldId)
      
      // 使用错误处理器
      await SDKErrorHandler.handleUpdateError(
        error,
        () => {
          this.onCommitLocal(fieldId, oldValue, true)
          this.fields[fieldId] = oldValue
        },
        {
          showToast: true,
          autoRetry: false
        }
      )
      
      throw error
    }
  }

  /**
   * 批量更新多个字段
   */
  async updateFields(
    updates: { [fieldId: string]: any },
    options?: {
      skipValidation?: boolean
      skipComputedFields?: boolean
    }
  ): Promise<void> {
    const oldValues: { [fieldId: string]: any } = {}
    const skipValidation = options?.skipValidation ?? false
    const skipComputedFields = options?.skipComputedFields ?? false

    try {
      // 1. 保存旧值并立即更新本地状态
      for (const [fieldId, value] of Object.entries(updates)) {
        oldValues[fieldId] = this.fields[fieldId]
        
        if (!skipValidation) {
          this.validateFieldValue(fieldId, value)
        }

        this.onCommitLocal(fieldId, value)
        this.fields[fieldId] = value
        this.pendingUpdates.set(fieldId, value)
      }

      // 2. HTTP API 批量保存
      const res = await this.updateRecordAPI({
        fieldKeyType: 'id' as FieldKeyType,
        record: {
          fields: Object.fromEntries(
            Object.entries(updates).map(([fieldId, value]) => [
              fieldId,
              value === undefined ? null : value
            ])
          )
        }
      })

      // 3. 处理计算字段
      if (!skipComputedFields && res.computedFields) {
        this.updateComputedFields(res.computedFields)
      }

      // 4. 清除待更新标记
      Object.keys(updates).forEach(fieldId => {
        this.pendingUpdates.delete(fieldId)
      })

      console.log(`✅ 批量更新成功:`, updates)

    } catch (error) {
      // 5. 错误回滚
      console.error(`❌ 批量更新失败:`, error)
      
      // 使用错误处理器
      await SDKErrorHandler.handleUpdateError(
        error,
        () => {
          for (const [fieldId, oldValue] of Object.entries(oldValues)) {
            this.onCommitLocal(fieldId, oldValue, true)
            this.fields[fieldId] = oldValue
            this.pendingUpdates.delete(fieldId)
          }
        },
        {
          showToast: true,
          autoRetry: false
        }
      )
      
      throw error
    }
  }

  /**
   * 检查字段是否有待更新的值
   */
  hasPendingUpdate(fieldId: string): boolean {
    return this.pendingUpdates.has(fieldId)
  }

  /**
   * 获取所有待更新的字段
   */
  getPendingUpdates(): { [fieldId: string]: any } {
    return Object.fromEntries(this.pendingUpdates)
  }

  /**
   * 获取字段映射
   */
  getFieldMap(): { [fieldId: string]: IFieldInstance } {
    return this.fieldMap
  }

  /**
   * 验证字段值
   */
  private validateFieldValue(fieldId: string, value: any): void {
    console.log('🔍 validateFieldValue 调试:', {
      fieldId: fieldId,
      fieldMapKeys: Object.keys(this.fieldMap),
      fieldMap: this.fieldMap,
      hasField: !!this.fieldMap[fieldId]
    })
    const field = this.fieldMap[fieldId]
    if (!field) {
      throw new Error(`字段 ${fieldId} 不存在`)
    }

    // 基础验证逻辑
    if (field.type === 'number' && value !== null && value !== undefined && typeof value !== 'number') {
      throw new Error(`字段 ${field.name} 必须是数字类型`)
    }

    if (field.type === 'text' && value !== null && value !== undefined && typeof value !== 'string') {
      throw new Error(`字段 ${field.name} 必须是文本类型`)
    }

    // 可以添加更多验证规则
  }

  /**
   * 更新计算字段
   */
  private updateComputedFields(computedFields: { [fieldId: string]: any }): void {
    for (const [fieldId, value] of Object.entries(computedFields)) {
      if (this.fieldMap[fieldId]?.type === 'computed') {
        this.fields[fieldId] = value
        this.onCommitLocal(fieldId, value)
      }
    }
  }

  /**
   * HTTP API 更新记录
   * 调用实际的 HTTP 客户端更新记录
   */
  private async updateRecordAPI(request: UpdateRecordRequest): Promise<UpdateRecordResponse> {
    // 获取全局 SDK 实例
    const sdk = (window as any).getEasyGridSDK?.()
    if (!sdk) {
      throw new Error('SDK 未初始化')
    }

    // 调用 RecordClient 的 update 方法
    const response = await sdk.records.update(
      this.tableId,
      this.id,
      {
        record: {
          fields: request.record.fields
        }
      }
    )

    return {
      data: {
        id: this.id,
        tableId: this.tableId,
        fields: response.data?.fields || this.fields,
        createdAt: this.createdAt,
        updatedAt: response.data?.updatedAt || this.updatedAt
      },
      computedFields: response.data?.computedFields || {}
    }
  }

  /**
   * 应用 ShareDB 操作到记录
   */
  applyOperation(operation: OTOperation): void {
    if (operation.p[0] === 'fields' && operation.p[1]) {
      const fieldId = operation.p[1]
      
      if (operation.oi !== undefined) {
        // 插入/更新字段值
        this.fields[fieldId] = operation.oi
        this.onCommitLocal(fieldId, operation.oi)
      } else if (operation.od !== undefined) {
        // 删除字段值
        delete this.fields[fieldId]
        this.onCommitLocal(fieldId, undefined)
      }
    }
  }

  /**
   * 获取字段实例
   */
  getFieldInstance(fieldId: string): IFieldInstance | undefined {
    return this.fieldMap[fieldId]
  }

  /**
   * 获取所有字段实例
   */
  getAllFieldInstances(): { [fieldId: string]: IFieldInstance } {
    return { ...this.fieldMap }
  }
}
