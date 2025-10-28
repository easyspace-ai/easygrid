/**
 * 字段操作构建器
 */

import { OTOperation } from '../../core/sharedb/document.js'

/**
 * 字段操作构建器
 */
export class FieldOpBuilder {
  static editor = {
    /**
     * 设置字段属性
     */
    setField: {
      build(params: {
        fieldId: string
        property: string
        newValue: any
        oldValue: any
      }): OTOperation {
        return {
          p: ['fields', params.fieldId, params.property],
          oi: params.newValue,
          od: params.oldValue
        }
      }
    },

    /**
     * 插入字段
     */
    insertField: {
      build(params: {
        fieldId: string
        fieldData: any
        position?: number
      }): OTOperation {
        return {
          p: ['fields', params.fieldId],
          oi: params.fieldData
        }
      }
    },

    /**
     * 删除字段
     */
    deleteField: {
      build(params: {
        fieldId: string
        oldFieldData: any
      }): OTOperation {
        return {
          p: ['fields', params.fieldId],
          od: params.oldFieldData
        }
      }
    },

    /**
     * 移动字段位置
     */
    moveField: {
      build(params: {
        fieldId: string
        fromIndex: number
        toIndex: number
      }): OTOperation {
        return {
          p: ['fields', params.fieldId],
          oi: params.toIndex
        }
      }
    }
  }

  /**
   * 构建字段属性更新操作
   */
  static buildFieldPropertyUpdate(
    fieldId: string,
    property: string,
    newValue: any,
    oldValue: any
  ): OTOperation {
    return this.editor.setField.build({
      fieldId,
      property,
      newValue,
      oldValue
    })
  }

  /**
   * 构建字段名称更新操作
   */
  static buildFieldNameUpdate(
    fieldId: string,
    newName: string,
    oldName: string
  ): OTOperation {
    return this.buildFieldPropertyUpdate(fieldId, 'name', newName, oldName)
  }

  /**
   * 构建字段类型更新操作
   */
  static buildFieldTypeUpdate(
    fieldId: string,
    newType: string,
    oldType: string
  ): OTOperation {
    return this.buildFieldPropertyUpdate(fieldId, 'type', newType, oldType)
  }

  /**
   * 构建字段选项更新操作
   */
  static buildFieldOptionsUpdate(
    fieldId: string,
    newOptions: any,
    oldOptions: any
  ): OTOperation {
    return this.buildFieldPropertyUpdate(fieldId, 'options', newOptions, oldOptions)
  }

  /**
   * 构建字段插入操作
   */
  static buildFieldInsert(
    fieldId: string,
    fieldData: any
  ): OTOperation {
    return this.editor.insertField.build({
      fieldId,
      fieldData
    })
  }

  /**
   * 构建字段删除操作
   */
  static buildFieldDelete(
    fieldId: string,
    oldFieldData: any
  ): OTOperation {
    return this.editor.deleteField.build({
      fieldId,
      oldFieldData
    })
  }

  /**
   * 构建字段移动操作
   */
  static buildFieldMove(
    fieldId: string,
    fromIndex: number,
    toIndex: number
  ): OTOperation {
    return this.editor.moveField.build({
      fieldId,
      fromIndex,
      toIndex
    })
  }
}
