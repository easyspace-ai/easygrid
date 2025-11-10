import type { Cell } from "../types/data-grid"
import type { DiceCellVariant } from './fieldMapper'

/**
 * 根据单元格类型构建正确的 Cell 类型
 */
export function buildCellType(
  variant: DiceCellVariant,
  options: {
    options?: Array<{ label: string; value: string }>
    min?: number
    max?: number
    expression?: string
    [key: string]: unknown
  }
): Cell {
  switch (variant) {
    case 'short-text':
      return { variant: 'short-text' }
    
    case 'long-text':
      return { variant: 'long-text' }
    
    case 'number':
      return {
        variant: 'number',
        ...(options.min !== undefined && { min: options.min }),
        ...(options.max !== undefined && { max: options.max }),
      }
    
    case 'select':
      return {
        variant: 'select',
        options: options.options || [],
      }
    
    case 'multi-select':
      return {
        variant: 'multi-select',
        options: options.options || [],
      }
    
    case 'checkbox':
      return { variant: 'checkbox' }
    
    case 'date':
      return { variant: 'date' }
    
    case 'link':
      return {
        variant: 'link',
        ...(options.foreignTableId && { foreignTableId: String(options.foreignTableId) }),
        ...(options.relationship && { relationship: String(options.relationship) }),
        ...(options.lookupFieldId && { lookupFieldId: String(options.lookupFieldId) }),
        ...(options.allowMultiple !== undefined && { allowMultiple: Boolean(options.allowMultiple) }),
        ...(options.isUrl !== undefined && { isUrl: Boolean(options.isUrl) }),
      }
    
    case 'email':
      return { variant: 'email' }
    
    case 'phone':
      return { variant: 'phone' }
    
    case 'rating':
      return {
        variant: 'rating',
        ...(options.max !== undefined && { max: options.max }),
      }
    
    case 'user':
      return {
        variant: 'user',
        ...(options.options && { options: (options.options as any[]).map((opt: any) => ({ id: String(opt.id ?? opt.value ?? ''), name: String(opt.name ?? opt.label ?? ''), avatar: opt.avatar })) as Array<{ id: string; name: string; avatar?: string }> }),
      }
    
    case 'attachment':
      return { variant: 'attachment' }
    
    case 'formula':
      return {
        variant: 'formula',
        ...(options.expression && { expression: options.expression }),
      }
    
    case 'ai':
      return {
        variant: 'ai',
        ...(options.task && { task: options.task as any }),
        ...(options.prompt !== undefined && { prompt: String(options.prompt) }),
        ...(options.dependencies && { dependencies: (options.dependencies as any[]).map(String) }),
        ...(options.trigger && { trigger: options.trigger as any }),
        ...(options.cache !== undefined && { cache: Boolean(options.cache) }),
        ...(options.maxRetries !== undefined && { maxRetries: Number(options.maxRetries) }),
      }
    
    default:
      return { variant: 'short-text' }
  }
}

