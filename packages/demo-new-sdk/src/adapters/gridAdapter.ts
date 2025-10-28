/**
 * 数据适配器：新SDK → Canvas表格
 * 将新 SDK 的数据格式转换为 Canvas 表格所需格式
 */

import { CellType } from '@easygrid/aitable'

// SDK 数据格式类型
export interface SDKRecord {
  id: string
  fields: Record<string, any>
  createdAt?: string
  updatedAt?: string
}

export interface SDKField {
  id: string
  name: string
  type: string
  description?: string
  required?: boolean
  options?: any
}

// Canvas 表格数据格式类型
export interface GridColumn {
  id: string
  name: string
  type: CellType
  width?: number
  frozen?: boolean
  hidden?: boolean
  description?: string
  required?: boolean
  options?: any
}

export interface GridRow {
  id: string
  cells: Record<string, any>
  createdAt?: string
  updatedAt?: string
}

export interface GridData {
  columns: GridColumn[]
  rows: GridRow[]
}

// 单元格变更事件类型
export interface CellChangeEvent {
  rowId: string
  columnId: string
  oldValue: any
  newValue: any
}

/**
 * 将 SDK 字段类型映射到 Canvas 表格的 CellType
 */
function mapFieldTypeToCellType(fieldType: string): CellType {
  const typeMap: Record<string, CellType> = {
    'text': CellType.Text,
    'singleLineText': CellType.Text,
    'multiLineText': CellType.Text,
    'number': CellType.Number,
    'currency': CellType.Number,
    'percent': CellType.Number,
    'boolean': CellType.Boolean,
    'checkbox': CellType.Boolean,
    'date': CellType.Date,
    'datetime': CellType.Date,
    'select': CellType.Select,
    'multiSelect': CellType.MultiSelect,
    'link': CellType.Link,
    'url': CellType.Link,
    'email': CellType.Link,
    'phone': CellType.Link,
    'image': CellType.Image,
    'attachment': CellType.Attachment,
    'user': CellType.User,
    'rating': CellType.Rating,
    'button': CellType.Button,
    'formula': CellType.Formula,
    'lookup': CellType.Lookup,
    'rollup': CellType.Rollup,
  }
  
  return typeMap[fieldType] || CellType.Text
}

/**
 * 将 SDK 字段转换为 Canvas 表格列
 */
export function adaptFieldsToColumns(fields: SDKField[]): GridColumn[] {
  return fields.map(field => ({
    id: field.id,
    name: field.name,
    type: mapFieldTypeToCellType(field.type),
    width: 150, // 默认宽度
    frozen: false,
    hidden: false,
    description: field.description,
    required: field.required,
    options: field.options
  }))
}

/**
 * 将 SDK 记录转换为 Canvas 表格行
 */
export function adaptRecordsToRows(records: SDKRecord[]): GridRow[] {
  return records.map(record => ({
    id: record.id,
    cells: record.fields,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  }))
}

/**
 * 将 SDK 数据转换为 Canvas 表格数据
 */
export function adaptRecordsToGrid(records: SDKRecord[], fields: SDKField[]): GridData {
  return {
    columns: adaptFieldsToColumns(fields),
    rows: adaptRecordsToRows(records)
  }
}

/**
 * 将 Canvas 表格的单元格变更转换为 SDK 操作
 */
export function adaptCellChangeToOp(change: CellChangeEvent) {
  return {
    recordId: change.rowId,
    fieldId: change.columnId,
    oldValue: change.oldValue,
    newValue: change.newValue
  }
}

/**
 * 将 SDK 操作转换为 Canvas 表格的单元格变更事件
 */
export function adaptOpToCellChange(op: {
  recordId: string
  fieldId: string
  oldValue: any
  newValue: any
}): CellChangeEvent {
  return {
    rowId: op.recordId,
    columnId: op.fieldId,
    oldValue: op.oldValue,
    newValue: op.newValue
  }
}

/**
 * 创建默认的测试数据（用于开发调试）
 */
export function createDefaultTestData(): GridData {
  const fields: SDKField[] = [
    {
      id: 'fld_name',
      name: '姓名',
      type: 'text',
      description: '用户姓名',
      required: true
    },
    {
      id: 'fld_age',
      name: '年龄',
      type: 'number',
      description: '用户年龄'
    },
    {
      id: 'fld_email',
      name: '邮箱',
      type: 'email',
      description: '用户邮箱'
    },
    {
      id: 'fld_active',
      name: '是否激活',
      type: 'boolean',
      description: '用户是否激活'
    },
    {
      id: 'fld_role',
      name: '角色',
      type: 'select',
      description: '用户角色',
      options: {
        choices: [
          { id: 'admin', name: '管理员' },
          { id: 'user', name: '普通用户' },
          { id: 'guest', name: '访客' }
        ]
      }
    }
  ]

  const records: SDKRecord[] = [
    {
      id: 'rec_1',
      fields: {
        fld_name: '张三',
        fld_age: 25,
        fld_email: 'zhangsan@example.com',
        fld_active: true,
        fld_role: 'admin'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'rec_2',
      fields: {
        fld_name: '李四',
        fld_age: 30,
        fld_email: 'lisi@example.com',
        fld_active: false,
        fld_role: 'user'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'rec_3',
      fields: {
        fld_name: '王五',
        fld_age: 28,
        fld_email: 'wangwu@example.com',
        fld_active: true,
        fld_role: 'guest'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]

  return adaptRecordsToGrid(records, fields)
}

/**
 * 验证数据适配是否正确
 */
export function validateGridData(gridData: GridData): boolean {
  if (!gridData.columns || !Array.isArray(gridData.columns)) {
    console.error('GridData.columns 必须是数组')
    return false
  }

  if (!gridData.rows || !Array.isArray(gridData.rows)) {
    console.error('GridData.rows 必须是数组')
    return false
  }

  // 检查列是否有必需的字段
  for (const column of gridData.columns) {
    if (!column.id || !column.name || !column.type) {
      console.error('列缺少必需字段:', column)
      return false
    }
  }

  // 检查行是否有必需的字段
  for (const row of gridData.rows) {
    if (!row.id || !row.cells) {
      console.error('行缺少必需字段:', row)
      return false
    }
  }

  return true
}
