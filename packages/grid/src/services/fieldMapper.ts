import type { FieldType, FieldOptions } from '@easygrid/sdk'

/**
 * Dice 单元格类型定义
 */
export type DiceCellVariant =
  | 'short-text'
  | 'long-text'
  | 'number'
  | 'select'
  | 'multi-select'
  | 'checkbox'
  | 'date'
  | 'link'
  | 'email'
  | 'phone'
  | 'rating'
  | 'user'
  | 'attachment'
  | 'formula'
  | 'ai'

/**
 * 将 SDK 字段类型映射到 Dice 单元格类型
 */
export function mapFieldTypeToCellVariant(
  fieldType: FieldType,
  options?: FieldOptions
): DiceCellVariant {
  switch (fieldType) {
    case 'singleLineText':
    case 'text':
      return 'short-text'
    
    case 'longText':
      return 'long-text'
    
    case 'number':
    case 'currency':
    case 'percent':
    case 'rating':
      return fieldType === 'rating' ? 'rating' : 'number'
    
    case 'singleSelect':
    case 'select':
      return 'select'
    
    case 'multipleSelect':
      return 'multi-select'
    
    case 'boolean':
    case 'checkbox':
      return 'checkbox'
    
    case 'date':
      return 'date'
    
    case 'datetime':
      // 日期时间也使用 date 类型，可以通过 options 区分
      return 'date'
    
    case 'email':
      return 'email'
    
    case 'url':
      // URL 链接类型
      return 'link'
    case 'link':
      // 关联字段类型：检查是否有 link 选项
      if (options && ((options as any).link || (options as any).Link)) {
        return 'link'
      }
      // 如果没有 link 选项，可能是 URL 链接，也返回 'link'
      return 'link'
    
    case 'phone':
      return 'phone'
    
    case 'user':
      return 'user'
    
    case 'attachment':
      return 'attachment'
    
    case 'formula':
      return 'formula'
    
    case 'ai':
      return 'ai'
    
    default:
      // 默认使用短文本
      return 'short-text'
  }
}

/**
 * 将 Dice 单元格类型映射回 SDK 字段类型
 */
export function mapCellVariantToFieldType(
  cellVariant: DiceCellVariant,
  options?: any
): FieldType {
  switch (cellVariant) {
    case 'short-text':
      return 'singleLineText'
    
    case 'long-text':
      return 'longText'
    
    case 'number':
      return 'number'
    
    case 'select':
      return 'singleSelect'
    
    case 'multi-select':
      return 'multipleSelect'
    
    case 'checkbox':
      return 'checkbox'
    
    case 'date':
      return 'date'
    
    case 'email':
      return 'email'
    
    case 'link':
      // 检查 options 中是否有 link 或 Link 选项，如果有则是关联字段，否则是 URL 链接
      if (options && ((options as any).link || (options as any).Link)) {
        return 'link'
      }
      // 如果没有 link 选项，返回 'url'（URL 链接字段）
      return 'url'
    
    case 'phone':
      return 'phone'
    
    case 'rating':
      return 'rating'
    
    case 'user':
      return 'user'
    
    case 'attachment':
      return 'attachment'
    
    case 'formula':
      return 'formula'
    
    case 'ai':
      return 'ai'
    
    default:
      return 'singleLineText'
  }
}

/**
 * 将 SDK 字段选项转换为 Dice 单元格选项
 */
export function mapFieldOptionsToCellOptions(options?: FieldOptions): {
  options?: Array<{ label: string; value: string }>
  min?: number
  max?: number
  expression?: string
  // 关联字段选项
  foreignTableId?: string
  relationship?: string
  lookupFieldId?: string
  allowMultiple?: boolean
  isUrl?: boolean
  [key: string]: any
} {
  if (!options) return {}

  const cellOptions: {
    options?: Array<{ label: string; value: string }>
    min?: number
    max?: number
    expression?: string
    foreignTableId?: string
    relationship?: string
    lookupFieldId?: string
    allowMultiple?: boolean
    isUrl?: boolean
    [key: string]: any
  } = {}

  // 处理选择字段的选项
  if (options.choices && Array.isArray(options.choices)) {
    cellOptions.options = options.choices.map((choice) => ({
      label: choice.name || choice.id,
      value: choice.id || choice.name,
    }))
  }

  // 处理数字字段的范围
  if (options.min !== undefined) {
    cellOptions.min = options.min
  }
  if (options.max !== undefined) {
    cellOptions.max = options.max
  }

  // 处理公式字段的表达式
  // 支持多种格式：扁平格式 options.expression 或嵌套格式 options.Formula.expression / options.formula.expression
  let expression: string | undefined
  if (options.expression) {
    // 扁平格式：options.expression
    expression = options.expression
  } else if ((options as any).Formula?.expression) {
    // 嵌套格式：options.Formula.expression（大写F）
    expression = (options as any).Formula.expression
  } else if ((options as any).formula?.expression) {
    // 嵌套格式：options.formula.expression（小写f）
    expression = (options as any).formula.expression
  }
  
  if (expression) {
    cellOptions.expression = expression
  }

  // 处理关联字段选项（LinkOptions）
  const linkOptions = (options as any).link || (options as any).Link
  if (linkOptions) {
    // 提取关联字段配置
    if (linkOptions.linked_table_id || linkOptions.foreignTableId) {
      cellOptions.foreignTableId = linkOptions.linked_table_id || linkOptions.foreignTableId
    }
    if (linkOptions.relationship) {
      cellOptions.relationship = linkOptions.relationship
    }
    if (linkOptions.lookupFieldId || linkOptions.lookup_field_id) {
      cellOptions.lookupFieldId = linkOptions.lookupFieldId || linkOptions.lookup_field_id
    }
    if (linkOptions.allowMultiple !== undefined) {
      cellOptions.allowMultiple = linkOptions.allowMultiple
    } else if (linkOptions.allow_multiple !== undefined) {
      cellOptions.allowMultiple = linkOptions.allow_multiple
    } else {
      // 根据 relationship 判断是否允许多选
      const relationship = linkOptions.relationship || linkOptions.relationship_type
      if (relationship === 'manyMany' || relationship === 'oneMany' || relationship === 'many_to_many' || relationship === 'one_to_many') {
        cellOptions.allowMultiple = true
      } else {
        cellOptions.allowMultiple = false
      }
    }
    // 标记为关联字段（不是 URL 链接）
    cellOptions.isUrl = false
  } else {
    // 如果没有 link 选项，可能是 URL 链接类型
    cellOptions.isUrl = true
  }

  // 保留其他选项
  Object.keys(options).forEach((key) => {
    if (!['choices', 'min', 'max', 'expression', 'link', 'Link'].includes(key)) {
      cellOptions[key] = (options as any)[key]
    }
  })

  return cellOptions
}

