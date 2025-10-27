/**
 * Sort Manager
 * 管理多字段排序
 */

import type { Field } from '../field/Field';
import type { RecordModel } from '../record/Record';
import { FieldType } from '../../types/field';

export type SortDirection = 'asc' | 'desc';

export interface ISortConfig {
  fieldId: string;
  direction: SortDirection;
}

export class SortManager {
  private sortConfigs: ISortConfig[];
  private fields: Map<string, Field>;

  constructor(sortConfigs: ISortConfig[], fields: Field[]) {
    this.sortConfigs = sortConfigs;
    this.fields = new Map(fields.map(f => [f.id, f]));
  }

  /**
   * 对记录数组进行排序
   */
  sort(records: RecordModel[]): RecordModel[] {
    if (this.sortConfigs.length === 0) {
      return records; // 没有排序配置，返回原数组
    }

    const sortedRecords = [...records];

    sortedRecords.sort((a, b) => {
      for (const config of this.sortConfigs) {
        const comparison = this.compare(a, b, config);
        if (comparison !== 0) {
          return comparison;
        }
      }
      return 0; // 所有字段都相等
    });

    return sortedRecords;
  }

  /**
   * 添加排序配置
   */
  addSort(config: ISortConfig): void {
    // 如果该字段已有排序配置，先移除
    this.removeSort(config.fieldId);
    this.sortConfigs.push(config);
  }

  /**
   * 移除排序配置
   */
  removeSort(fieldId: string): void {
    this.sortConfigs = this.sortConfigs.filter(c => c.fieldId !== fieldId);
  }

  /**
   * 更新排序配置
   */
  updateSort(fieldId: string, direction: SortDirection): void {
    const config = this.sortConfigs.find(c => c.fieldId === fieldId);
    if (config) {
      config.direction = direction;
    }
  }

  /**
   * 清空所有排序
   */
  clearSorts(): void {
    this.sortConfigs = [];
  }

  /**
   * 获取排序数量
   */
  getSortCount(): number {
    return this.sortConfigs.length;
  }

  /**
   * 获取字段的排序方向
   */
  getSortDirection(fieldId: string): SortDirection | null {
    const config = this.sortConfigs.find(c => c.fieldId === fieldId);
    return config ? config.direction : null;
  }

  /**
   * 获取字段的排序索引（用于显示排序顺序）
   */
  getSortIndex(fieldId: string): number {
    return this.sortConfigs.findIndex(c => c.fieldId === fieldId);
  }

  /**
   * 比较两条记录的字段值
   */
  private compare(a: RecordModel, b: RecordModel, config: ISortConfig): number {
    const field = this.fields.get(config.fieldId);
    if (!field) {return 0;}

    const valueA = a.getCellValue(config.fieldId);
    const valueB = b.getCellValue(config.fieldId);

    // 处理空值：空值始终排在最后
    if (valueA == null && valueB == null) {return 0;}
    if (valueA == null) {return 1;}
    if (valueB == null) {return -1;}

    let comparison = 0;

    // 根据字段类型进行比较
    switch (field.type) {
      case FieldType.Number:
      case FieldType.Rating:
        comparison = this.compareNumbers(valueA, valueB);
        break;
      
      case FieldType.Date:
      case FieldType.CreatedTime:
      case FieldType.LastModifiedTime:
        comparison = this.compareDates(valueA, valueB);
        break;
      
      case FieldType.Checkbox:
        comparison = this.compareBooleans(valueA, valueB);
        break;
      
      case FieldType.SingleSelect:
      case FieldType.MultipleSelect:
        comparison = this.compareSelects(valueA, valueB, field);
        break;
      
      case FieldType.SingleLineText:
      case FieldType.LongText:
      default:
        comparison = this.compareStrings(valueA, valueB);
        break;
    }

    // 应用排序方向
    return config.direction === 'asc' ? comparison : -comparison;
  }

  /**
   * 比较数字
   */
  private compareNumbers(a: unknown, b: unknown): number {
    const numA = typeof a === 'number' ? a : parseFloat(String(a));
    const numB = typeof b === 'number' ? b : parseFloat(String(b));
    
    if (isNaN(numA) && isNaN(numB)) {return 0;}
    if (isNaN(numA)) {return 1;}
    if (isNaN(numB)) {return -1;}
    
    return numA - numB;
  }

  /**
   * 比较日期
   */
  private compareDates(a: unknown, b: unknown): number {
    const dateA = new Date(a as string | number | Date);
    const dateB = new Date(b as string | number | Date);
    
    const timeA = dateA.getTime();
    const timeB = dateB.getTime();
    
    if (isNaN(timeA) && isNaN(timeB)) {return 0;}
    if (isNaN(timeA)) {return 1;}
    if (isNaN(timeB)) {return -1;}
    
    return timeA - timeB;
  }

  /**
   * 比较布尔值
   */
  private compareBooleans(a: unknown, b: unknown): number {
    const boolA = Boolean(a);
    const boolB = Boolean(b);
    
    if (boolA === boolB) {return 0;}
    return boolA ? -1 : 1; // true 在前，false 在后
  }

  /**
   * 比较字符串
   */
  private compareStrings(a: unknown, b: unknown): number {
    const strA = String(a).toLowerCase();
    const strB = String(b).toLowerCase();
    
    return strA.localeCompare(strB, 'zh-CN');
  }

  /**
   * 比较选择字段
   */
  private compareSelects(a: unknown, b: unknown, field: Field): number {
    // 对于选择字段，按照选项定义的顺序排序
    const options = (field.options as any)?.choices || [];
    const optionOrder: Map<string, number> = new Map(options.map((opt: any, index: number) => [opt.id || opt.name, index]));

    const getOptionIndex = (value: unknown): number => {
      if (value == null) {return Infinity;}
      
      // 多选字段：取第一个选项的顺序
      if (Array.isArray(value)) {
        if (value.length === 0) {return Infinity;}
        const firstValue = value[0];
        const index: number | undefined = optionOrder.get(firstValue);
        return (index !== undefined ? index : Infinity);
      }
      
      // 单选字段
      const index: number | undefined = optionOrder.get(value as any);
      return (index !== undefined ? index : Infinity);
    };

    const indexA: number = getOptionIndex(a);
    const indexB: number = getOptionIndex(b);
    
    return indexA - indexB;
  }
}


