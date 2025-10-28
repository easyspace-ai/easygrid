/**
 * 表格操作构建器
 */

import { OTOperation } from '../../core/sharedb/document.js'

/**
 * 表格操作构建器
 */
export class TableOpBuilder {
  static editor = {
    /**
     * 设置表格属性
     */
    setTable: {
      build(params: {
        property: string
        newValue: any
        oldValue: any
      }): OTOperation {
        return {
          p: [params.property],
          oi: params.newValue,
          od: params.oldValue
        }
      }
    },

    /**
     * 插入表格
     */
    insertTable: {
      build(params: {
        tableId: string
        tableData: any
      }): OTOperation {
        return {
          p: ['tables', params.tableId],
          oi: params.tableData
        }
      }
    },

    /**
     * 删除表格
     */
    deleteTable: {
      build(params: {
        tableId: string
        oldTableData: any
      }): OTOperation {
        return {
          p: ['tables', params.tableId],
          od: params.oldTableData
        }
      }
    }
  }

  /**
   * 构建表格名称更新操作
   */
  static buildTableNameUpdate(
    newName: string,
    oldName: string
  ): OTOperation {
    return this.editor.setTable.build({
      property: 'name',
      newValue: newName,
      oldValue: oldName
    })
  }

  /**
   * 构建表格描述更新操作
   */
  static buildTableDescriptionUpdate(
    newDescription: string,
    oldDescription: string
  ): OTOperation {
    return this.editor.setTable.build({
      property: 'description',
      newValue: newDescription,
      oldValue: oldDescription
    })
  }

  /**
   * 构建表格插入操作
   */
  static buildTableInsert(
    tableId: string,
    tableData: any
  ): OTOperation {
    return this.editor.insertTable.build({
      tableId,
      tableData
    })
  }

  /**
   * 构建表格删除操作
   */
  static buildTableDelete(
    tableId: string,
    oldTableData: any
  ): OTOperation {
    return this.editor.deleteTable.build({
      tableId,
      oldTableData
    })
  }
}
