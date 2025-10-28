/**
 * 视图操作构建器
 */

import { OTOperation } from '../../core/sharedb/document.js'

/**
 * 视图操作构建器
 */
export class ViewOpBuilder {
  static editor = {
    /**
     * 设置视图属性
     */
    setView: {
      build(params: {
        viewId: string
        property: string
        newValue: any
        oldValue: any
      }): OTOperation {
        return {
          p: ['views', params.viewId, params.property],
          oi: params.newValue,
          od: params.oldValue
        }
      }
    },

    /**
     * 插入视图
     */
    insertView: {
      build(params: {
        viewId: string
        viewData: any
      }): OTOperation {
        return {
          p: ['views', params.viewId],
          oi: params.viewData
        }
      }
    },

    /**
     * 删除视图
     */
    deleteView: {
      build(params: {
        viewId: string
        oldViewData: any
      }): OTOperation {
        return {
          p: ['views', params.viewId],
          od: params.oldViewData
        }
      }
    }
  }

  /**
   * 构建视图名称更新操作
   */
  static buildViewNameUpdate(
    viewId: string,
    newName: string,
    oldName: string
  ): OTOperation {
    return this.editor.setView.build({
      viewId,
      property: 'name',
      newValue: newName,
      oldValue: oldName
    })
  }

  /**
   * 构建视图类型更新操作
   */
  static buildViewTypeUpdate(
    viewId: string,
    newType: string,
    oldType: string
  ): OTOperation {
    return this.editor.setView.build({
      viewId,
      property: 'type',
      newValue: newType,
      oldValue: oldType
    })
  }

  /**
   * 构建视图过滤器更新操作
   */
  static buildViewFilterUpdate(
    viewId: string,
    newFilter: any,
    oldFilter: any
  ): OTOperation {
    return this.editor.setView.build({
      viewId,
      property: 'filter',
      newValue: newFilter,
      oldValue: oldFilter
    })
  }

  /**
   * 构建视图排序更新操作
   */
  static buildViewSortUpdate(
    viewId: string,
    newSort: any,
    oldSort: any
  ): OTOperation {
    return this.editor.setView.build({
      viewId,
      property: 'sort',
      newValue: newSort,
      oldValue: oldSort
    })
  }

  /**
   * 构建视图插入操作
   */
  static buildViewInsert(
    viewId: string,
    viewData: any
  ): OTOperation {
    return this.editor.insertView.build({
      viewId,
      viewData
    })
  }

  /**
   * 构建视图删除操作
   */
  static buildViewDelete(
    viewId: string,
    oldViewData: any
  ): OTOperation {
    return this.editor.deleteView.build({
      viewId,
      oldViewData
    })
  }
}
