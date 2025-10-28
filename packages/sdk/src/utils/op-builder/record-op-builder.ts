/**
 * 操作构建器 - 参考 Teable 的 OpBuilder
 * 用于构建 ShareDB 操作
 */

import { OTOperation } from '../../core/sharedb/document.js'

/**
 * 记录操作构建器
 */
export class RecordOpBuilder {
  static editor = {
    /**
     * 设置记录字段值
     */
    setRecord: {
      build(params: { 
        fieldId: string
        newCellValue: any
        oldCellValue: any
      }): OTOperation {
        return {
          p: ['fields', params.fieldId],
          oi: params.newCellValue,
          od: params.oldCellValue
        }
      }
    },

    /**
     * 插入记录字段
     */
    insertRecord: {
      build(params: {
        fieldId: string
        value: any
        position?: number
      }): OTOperation {
        return {
          p: ['fields', params.fieldId],
          oi: params.value
        }
      }
    },

    /**
     * 删除记录字段
     */
    deleteRecord: {
      build(params: {
        fieldId: string
        oldValue: any
      }): OTOperation {
        return {
          p: ['fields', params.fieldId],
          od: params.oldValue
        }
      }
    },

    /**
     * 数字字段加法
     */
    addNumber: {
      build(params: {
        fieldId: string
        delta: number
      }): OTOperation {
        return {
          p: ['fields', params.fieldId],
          na: params.delta
        }
      }
    }
  }

  /**
   * 批量构建操作
   */
  static batch(operations: OTOperation[]): OTOperation[] {
    return operations
  }

  /**
   * 构建字段更新操作
   */
  static buildFieldUpdate(
    fieldId: string,
    newValue: any,
    oldValue: any
  ): OTOperation {
    return this.editor.setRecord.build({
      fieldId,
      newCellValue: newValue,
      oldCellValue: oldValue
    })
  }

  /**
   * 构建字段插入操作
   */
  static buildFieldInsert(
    fieldId: string,
    value: any
  ): OTOperation {
    return this.editor.insertRecord.build({
      fieldId,
      value
    })
  }

  /**
   * 构建字段删除操作
   */
  static buildFieldDelete(
    fieldId: string,
    oldValue: any
  ): OTOperation {
    return this.editor.deleteRecord.build({
      fieldId,
      oldValue
    })
  }

  /**
   * 构建数字字段加法操作
   */
  static buildNumberAdd(
    fieldId: string,
    delta: number
  ): OTOperation {
    return this.editor.addNumber.build({
      fieldId,
      delta
    })
  }
}
