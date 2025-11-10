import type { RecordResponse } from '@easygrid/sdk'
import { luckdbClient } from '../config/client'
import type { LinkCellValue } from '../types/data-grid'

/**
 * 关联字段选项
 */
export interface LinkFieldOptions {
  foreignTableId: string              // 关联表ID
  relationship?: string               // 关系类型：oneOne, manyMany, oneMany, manyOne
  lookupFieldId?: string              // 显示字段ID
  allowMultiple?: boolean              // 是否允许多选
  filterByViewId?: string             // 视图过滤
  visibleFieldIds?: string[]           // 可见字段列表
  filter?: any                         // 复杂过滤条件
}

/**
 * 关联记录服务
 * 用于从关联表加载记录列表
 */
export class LinkService {
  /**
   * 从关联表加载记录列表
   * @param tableId 关联表ID
   * @param options 关联字段选项
   * @returns LinkCellValue 数组
   */
  async loadLinkedRecords(
    tableId: string,
    options: LinkFieldOptions
  ): Promise<LinkCellValue[]> {
    try {
      console.log('[LinkService] 开始加载关联记录', {
        tableId,
        lookupFieldId: options.lookupFieldId,
        relationship: options.relationship,
      });
      
      // 获取关联表的所有记录
      const records = await luckdbClient.records.getFullList(tableId)
      
      console.log('[LinkService] 获取到记录数量:', records?.length || 0);
      
      if (!records || records.length === 0) {
        console.warn('[LinkService] 关联表中没有记录');
        return [];
      }
      
      // 转换为 LinkCellValue 数组
      const linkValues: LinkCellValue[] = records.map((record) => {
        const linkValue: LinkCellValue = {
          id: record.id,
        }
        
        // 如果有 lookupFieldId，提取显示文本
        if (options.lookupFieldId && record.data) {
          const lookupValue = record.data[options.lookupFieldId]
          if (lookupValue !== undefined && lookupValue !== null) {
            // 转换为字符串
            linkValue.title = String(lookupValue)
          }
        }
        
        // 如果没有 lookupFieldId 或提取失败，尝试使用第一个非空字段值作为标题
        if (!linkValue.title && record.data) {
          // 尝试找到第一个非空字段值
          const firstFieldValue = Object.values(record.data).find(
            (value) => value !== null && value !== undefined && value !== ''
          );
          if (firstFieldValue !== undefined) {
            linkValue.title = String(firstFieldValue);
          }
        }
        
        // 如果还是没有标题，使用记录ID作为标题
        if (!linkValue.title) {
          linkValue.title = record.id
        }
        
        return linkValue
      })
      
      console.log('[LinkService] 转换后的 LinkCellValue 数量:', linkValues.length);
      
      return linkValues
    } catch (error) {
      console.error('[LinkService] 加载关联记录失败:', error);
      if (error instanceof Error) {
        console.error('[LinkService] 错误详情:', error.message, error.stack);
      }
      return []
    }
  }

  /**
   * 根据记录ID加载单个关联记录
   * @param tableId 关联表ID
   * @param recordId 记录ID
   * @param options 关联字段选项
   * @returns LinkCellValue 或 null
   */
  async loadLinkedRecordById(
    tableId: string,
    recordId: string,
    options: LinkFieldOptions
  ): Promise<LinkCellValue | null> {
    try {
      // 获取单个记录
      const record = await luckdbClient.records.getOne(tableId, recordId)
      
      const linkValue: LinkCellValue = {
        id: record.id,
      }
      
      // 如果有 lookupFieldId，提取显示文本
      if (options.lookupFieldId && record.data) {
        const lookupValue = record.data[options.lookupFieldId]
        if (lookupValue !== undefined && lookupValue !== null) {
          linkValue.title = String(lookupValue)
        }
      }
      
      // 如果没有 lookupFieldId 或提取失败，使用记录ID作为标题
      if (!linkValue.title) {
        linkValue.title = record.id
      }
      
      return linkValue
    } catch (error) {
      console.error('加载关联记录失败:', error)
      return null
    }
  }

  /**
   * 根据记录ID列表批量加载关联记录
   * @param tableId 关联表ID
   * @param recordIds 记录ID列表
   * @param options 关联字段选项
   * @returns LinkCellValue 数组
   */
  async loadLinkedRecordsByIds(
    tableId: string,
    recordIds: string[],
    options: LinkFieldOptions
  ): Promise<LinkCellValue[]> {
    if (recordIds.length === 0) {
      return []
    }
    
    try {
      // 获取所有记录
      const allRecords = await luckdbClient.records.getFullList(tableId)
      
      // 过滤出匹配的记录
      const matchedRecords = allRecords.filter((record) =>
        recordIds.includes(record.id)
      )
      
      // 转换为 LinkCellValue 数组
      const linkValues: LinkCellValue[] = matchedRecords.map((record) => {
        const linkValue: LinkCellValue = {
          id: record.id,
        }
        
        // 如果有 lookupFieldId，提取显示文本
        if (options.lookupFieldId && record.data) {
          const lookupValue = record.data[options.lookupFieldId]
          if (lookupValue !== undefined && lookupValue !== null) {
            linkValue.title = String(lookupValue)
          }
        }
        
        // 如果没有 lookupFieldId 或提取失败，使用记录ID作为标题
        if (!linkValue.title) {
          linkValue.title = record.id
        }
        
        return linkValue
      })
      
      return linkValues
    } catch (error) {
      console.error('批量加载关联记录失败:', error)
      return []
    }
  }

  /**
   * 搜索关联记录
   * @param tableId 关联表ID
   * @param searchQuery 搜索查询
   * @param options 关联字段选项
   * @returns LinkCellValue 数组
   */
  async searchLinkedRecords(
    tableId: string,
    searchQuery: string,
    options: LinkFieldOptions
  ): Promise<LinkCellValue[]> {
    try {
      // 获取所有记录
      const allRecords = await luckdbClient.records.getFullList(tableId)
      
      // 过滤匹配的记录
      const matchedRecords = allRecords.filter((record) => {
        // 如果搜索查询为空，返回所有记录
        if (!searchQuery) {
          return true
        }
        
        // 在 lookupFieldId 字段中搜索
        if (options.lookupFieldId && record.data) {
          const lookupValue = record.data[options.lookupFieldId]
          if (lookupValue !== undefined && lookupValue !== null) {
            const searchText = String(lookupValue).toLowerCase()
            return searchText.includes(searchQuery.toLowerCase())
          }
        }
        
        // 在记录ID中搜索
        return record.id.toLowerCase().includes(searchQuery.toLowerCase())
      })
      
      // 转换为 LinkCellValue 数组
      const linkValues: LinkCellValue[] = matchedRecords.map((record) => {
        const linkValue: LinkCellValue = {
          id: record.id,
        }
        
        // 如果有 lookupFieldId，提取显示文本
        if (options.lookupFieldId && record.data) {
          const lookupValue = record.data[options.lookupFieldId]
          if (lookupValue !== undefined && lookupValue !== null) {
            linkValue.title = String(lookupValue)
          }
        }
        
        // 如果没有 lookupFieldId 或提取失败，使用记录ID作为标题
        if (!linkValue.title) {
          linkValue.title = record.id
        }
        
        return linkValue
      })
      
      return linkValues
    } catch (error) {
      console.error('搜索关联记录失败:', error)
      return []
    }
  }
}

// 导出单例
export const linkService = new LinkService()

