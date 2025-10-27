/**
 * Base Filter Class
 * 所有字段过滤器的基类
 */

import type { Field } from '../field/Field';
import type { RecordModel } from '../record/Record';

export type FilterOperator = 
  // 通用操作符
  | 'is' | 'isNot' | 'isEmpty' | 'isNotEmpty'
  // 文本操作符
  | 'contains' | 'doesNotContain' | 'startsWith' | 'endsWith'
  // 数字操作符
  | 'equal' | 'notEqual' | 'greaterThan' | 'greaterThanOrEqual' | 'lessThan' | 'lessThanOrEqual'
  // 日期操作符
  | 'isToday' | 'isTomorrow' | 'isYesterday' | 'isThisWeek' | 'isLastWeek' | 'isNextWeek'
  | 'isThisMonth' | 'isLastMonth' | 'isNextMonth' | 'isThisYear' | 'isLastYear' | 'isNextYear'
  | 'isBefore' | 'isAfter' | 'isOnOrBefore' | 'isOnOrAfter' | 'isBetween'
  // 选择操作符
  | 'isAnyOf' | 'isNoneOf' | 'hasAnyOf' | 'hasAllOf' | 'hasNoneOf' | 'isExactly'
  // 关系操作符
  | 'hasRecord' | 'hasNoRecord';

export interface IFilterConfig {
  operator: FilterOperator;
  value?: unknown;
  value2?: unknown; // For 'isBetween' operator
}

export abstract class BaseFilter {
  protected field: Field;
  protected config: IFilterConfig;

  constructor(field: Field, config: IFilterConfig) {
    this.field = field;
    this.config = config;
  }

  /**
   * 检查记录是否匹配过滤条件
   */
  abstract match(record: RecordModel): boolean;

  /**
   * 获取过滤器的显示文本
   */
  abstract getDisplayText(): string;

  /**
   * 获取字段值
   */
  protected getValue(record: RecordModel): unknown {
    return record.getCellValue(this.field.id);
  }

  /**
   * 检查值是否为空
   */
  protected isEmpty(value: unknown): boolean {
    return value === null || value === undefined || value === '';
  }

  /**
   * 通用 isEmpty 操作符
   */
  protected matchIsEmpty(record: RecordModel): boolean {
    const value = this.getValue(record);
    return this.isEmpty(value);
  }

  /**
   * 通用 isNotEmpty 操作符
   */
  protected matchIsNotEmpty(record: RecordModel): boolean {
    return !this.matchIsEmpty(record);
  }

  /**
   * 验证过滤器配置
   */
  validate(): boolean {
    const { operator, value } = this.config;
    
    // isEmpty 和 isNotEmpty 不需要 value
    if (operator === 'isEmpty' || operator === 'isNotEmpty') {
      return true;
    }
    
    // 其他操作符需要 value
    return value !== undefined && value !== null;
  }
}


