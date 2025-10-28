/**
 * RecordCore - 记录核心基类
 * 提供基础的字段访问和操作能力
 */

export interface IRecord {
  id: string
  tableId: string
  fields: { [fieldId: string]: any }
  createdAt?: string
  updatedAt?: string
}

export interface IFieldInstance {
  id: string
  name: string
  type: string
  options?: any
}

export class RecordCore {
  public readonly id: string
  public readonly tableId: string
  public fields: { [fieldId: string]: any }
  public readonly createdAt?: string
  public readonly updatedAt?: string

  constructor(data: IRecord) {
    this.id = data.id
    this.tableId = data.tableId
    this.fields = { ...data.fields }
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
  }

  /**
   * 获取字段值
   */
  getFieldValue(fieldId: string): any {
    return this.fields[fieldId]
  }

  /**
   * 设置字段值（仅本地，不保存）
   */
  setFieldValue(fieldId: string, value: any): void {
    this.fields[fieldId] = value
  }

  /**
   * 检查字段是否存在
   */
  hasField(fieldId: string): boolean {
    return fieldId in this.fields
  }

  /**
   * 获取所有字段
   */
  getAllFields(): { [fieldId: string]: any } {
    return { ...this.fields }
  }

  /**
   * 转换为 JSON
   */
  toJSON(): IRecord {
    return {
      id: this.id,
      tableId: this.tableId,
      fields: { ...this.fields },
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
}

