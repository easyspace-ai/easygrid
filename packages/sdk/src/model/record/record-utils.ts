/**
 * Record 工厂函数和工具函数
 */

import { Record } from './record.js'
import { IRecord, IFieldInstance } from './record-core.js'
import { ShareDBDoc } from './sharedb-types.js'

/**
 * 创建 Record 实例
 */
export function createRecordInstance(
  data: IRecord,
  doc: ShareDBDoc<IRecord>,
  fieldMap: { [fieldId: string]: IFieldInstance },
  onCommitLocal: (fieldId: string, value: any, isRollback?: boolean) => void
): Record {
  return new Record(data, doc, fieldMap, onCommitLocal)
}

/**
 * 将 Record 实例映射为字段值对象
 * 用于 UI 组件显示
 */
export function recordInstanceFieldMap(
  record: Record,
  fieldMap: { [fieldId: string]: IFieldInstance }
): { [fieldId: string]: any } {
  const result: { [fieldId: string]: any } = {}
  
  for (const [fieldId, fieldInstance] of Object.entries(fieldMap)) {
    result[fieldId] = record.getFieldValue(fieldId)
  }
  
  return result
}

/**
 * 批量创建 Record 实例
 */
export function createRecordInstances(
  recordsData: IRecord[],
  docMap: Map<string, ShareDBDoc<IRecord>>,
  fieldMap: { [fieldId: string]: IFieldInstance },
  onCommitLocal: (fieldId: string, value: any, isRollback?: boolean) => void
): Record[] {
  return recordsData.map(recordData => {
    const docKey = `rec_${recordData.tableId}:${recordData.id}`
    const doc = docMap.get(docKey)
    
    if (!doc) {
      throw new Error(`ShareDB 文档未找到: ${docKey}`)
    }
    
    return createRecordInstance(recordData, doc, fieldMap, onCommitLocal)
  })
}

/**
 * 检查记录是否有未保存的更改
 */
export function hasUnsavedChanges(record: Record): boolean {
  return record.getPendingUpdates().length > 0
}

/**
 * 获取记录的所有字段值（包括计算字段）
 */
export function getAllFieldValues(record: Record): { [fieldId: string]: any } {
  return record.getAllFields()
}

/**
 * 验证记录数据完整性
 */
export function validateRecordData(
  recordData: IRecord,
  fieldMap: { [fieldId: string]: IFieldInstance }
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // 检查必需字段
  if (!recordData.id) {
    errors.push('记录 ID 不能为空')
  }
  
  if (!recordData.tableId) {
    errors.push('表格 ID 不能为空')
  }
  
  // 检查字段值类型
  for (const [fieldId, value] of Object.entries(recordData.fields)) {
    const field = fieldMap[fieldId]
    if (field) {
      if (field.type === 'number' && value !== null && value !== undefined && typeof value !== 'number') {
        errors.push(`字段 ${field.name} 必须是数字类型`)
      }
      
      if (field.type === 'text' && value !== null && value !== undefined && typeof value !== 'string') {
        errors.push(`字段 ${field.name} 必须是文本类型`)
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

