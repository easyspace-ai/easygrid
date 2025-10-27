/**
 * Date Field Filter
 * 日期字段过滤器
 */

import { BaseFilter, type IFilterConfig } from './BaseFilter';
import type { Field } from '../field/Field';
import type { RecordModel } from '../record/Record';

export class DateFilter extends BaseFilter {
  constructor(field: Field, config: IFilterConfig) {
    super(field, config);
  }

  match(record: RecordModel): boolean {
    const { operator } = this.config;

    switch (operator) {
      case 'isEmpty':
        return this.matchIsEmpty(record);
      case 'isNotEmpty':
        return this.matchIsNotEmpty(record);
      case 'is':
        return this.matchIs(record);
      case 'isNot':
        return !this.matchIs(record);
      case 'isBefore':
        return this.matchIsBefore(record);
      case 'isAfter':
        return this.matchIsAfter(record);
      case 'isOnOrBefore':
        return this.matchIsOnOrBefore(record);
      case 'isOnOrAfter':
        return this.matchIsOnOrAfter(record);
      case 'isBetween':
        return this.matchIsBetween(record);
      case 'isToday':
        return this.matchIsToday(record);
      case 'isTomorrow':
        return this.matchIsTomorrow(record);
      case 'isYesterday':
        return this.matchIsYesterday(record);
      case 'isThisWeek':
        return this.matchIsThisWeek(record);
      case 'isLastWeek':
        return this.matchIsLastWeek(record);
      case 'isNextWeek':
        return this.matchIsNextWeek(record);
      case 'isThisMonth':
        return this.matchIsThisMonth(record);
      case 'isLastMonth':
        return this.matchIsLastMonth(record);
      case 'isNextMonth':
        return this.matchIsNextMonth(record);
      case 'isThisYear':
        return this.matchIsThisYear(record);
      case 'isLastYear':
        return this.matchIsLastYear(record);
      case 'isNextYear':
        return this.matchIsNextYear(record);
      default:
        return false;
    }
  }

  getDisplayText(): string {
    const { operator, value, value2 } = this.config;
    const fieldName = this.field.name;

    switch (operator) {
      case 'isEmpty':
        return `${fieldName} 为空`;
      case 'isNotEmpty':
        return `${fieldName} 不为空`;
      case 'is':
        return `${fieldName} 是 ${this.formatDate(value)}`;
      case 'isNot':
        return `${fieldName} 不是 ${this.formatDate(value)}`;
      case 'isBefore':
        return `${fieldName} 早于 ${this.formatDate(value)}`;
      case 'isAfter':
        return `${fieldName} 晚于 ${this.formatDate(value)}`;
      case 'isOnOrBefore':
        return `${fieldName} 不晚于 ${this.formatDate(value)}`;
      case 'isOnOrAfter':
        return `${fieldName} 不早于 ${this.formatDate(value)}`;
      case 'isBetween':
        return `${fieldName} 在 ${this.formatDate(value)} 和 ${this.formatDate(value2)} 之间`;
      case 'isToday':
        return `${fieldName} 是今天`;
      case 'isTomorrow':
        return `${fieldName} 是明天`;
      case 'isYesterday':
        return `${fieldName} 是昨天`;
      case 'isThisWeek':
        return `${fieldName} 是本周`;
      case 'isLastWeek':
        return `${fieldName} 是上周`;
      case 'isNextWeek':
        return `${fieldName} 是下周`;
      case 'isThisMonth':
        return `${fieldName} 是本月`;
      case 'isLastMonth':
        return `${fieldName} 是上月`;
      case 'isNextMonth':
        return `${fieldName} 是下月`;
      case 'isThisYear':
        return `${fieldName} 是今年`;
      case 'isLastYear':
        return `${fieldName} 是去年`;
      case 'isNextYear':
        return `${fieldName} 是明年`;
      default:
        return '';
    }
  }

  private formatDate(value: unknown): string {
    if (!value) {return '';}
    const date = new Date(value as string | number | Date);
    return date.toLocaleDateString('zh-CN');
  }

  private getDateValue(record: RecordModel): Date | null {
    const value = this.getValue(record);
    if (this.isEmpty(value)) {return null;}
    
    const date = new Date(value as string | number | Date);
    return isNaN(date.getTime()) ? null : date;
  }

  private getFilterDate(): Date | null {
    const { value } = this.config;
    if (!value) {return null;}
    
    const date = new Date(value as string | number | Date);
    return isNaN(date.getTime()) ? null : date;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  private matchIs(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    const filterValue = this.getFilterDate();
    
    if (!value || !filterValue) {return false;}
    
    return this.isSameDay(value, filterValue);
  }

  private matchIsBefore(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    const filterValue = this.getFilterDate();
    
    if (!value || !filterValue) {return false;}
    
    return value < filterValue;
  }

  private matchIsAfter(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    const filterValue = this.getFilterDate();
    
    if (!value || !filterValue) {return false;}
    
    return value > filterValue;
  }

  private matchIsOnOrBefore(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    const filterValue = this.getFilterDate();
    
    if (!value || !filterValue) {return false;}
    
    return value <= filterValue;
  }

  private matchIsOnOrAfter(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    const filterValue = this.getFilterDate();
    
    if (!value || !filterValue) {return false;}
    
    return value >= filterValue;
  }

  private matchIsBetween(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    const { value: start, value2: end } = this.config;
    
    if (!value || !start || !end) {return false;}
    
    const startDate = new Date(start as string | number | Date);
    const endDate = new Date(end as string | number | Date);
    
    return value >= startDate && value <= endDate;
  }

  private matchIsToday(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    if (!value) {return false;}
    
    const today = new Date();
    return this.isSameDay(value, today);
  }

  private matchIsTomorrow(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    if (!value) {return false;}
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.isSameDay(value, tomorrow);
  }

  private matchIsYesterday(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    if (!value) {return false;}
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.isSameDay(value, yesterday);
  }

  private matchIsThisWeek(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    if (!value) {return false;}
    
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    return value >= startOfWeek && value < endOfWeek;
  }

  private matchIsLastWeek(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    if (!value) {return false;}
    
    const now = new Date();
    const startOfLastWeek = new Date(now);
    startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
    startOfLastWeek.setHours(0, 0, 0, 0);
    
    const endOfLastWeek = new Date(startOfLastWeek);
    endOfLastWeek.setDate(startOfLastWeek.getDate() + 7);
    
    return value >= startOfLastWeek && value < endOfLastWeek;
  }

  private matchIsNextWeek(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    if (!value) {return false;}
    
    const now = new Date();
    const startOfNextWeek = new Date(now);
    startOfNextWeek.setDate(now.getDate() - now.getDay() + 7);
    startOfNextWeek.setHours(0, 0, 0, 0);
    
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 7);
    
    return value >= startOfNextWeek && value < endOfNextWeek;
  }

  private matchIsThisMonth(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    if (!value) {return false;}
    
    const now = new Date();
    return value.getFullYear() === now.getFullYear() &&
           value.getMonth() === now.getMonth();
  }

  private matchIsLastMonth(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    if (!value) {return false;}
    
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    
    return value.getFullYear() === lastMonth.getFullYear() &&
           value.getMonth() === lastMonth.getMonth();
  }

  private matchIsNextMonth(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    if (!value) {return false;}
    
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1);
    
    return value.getFullYear() === nextMonth.getFullYear() &&
           value.getMonth() === nextMonth.getMonth();
  }

  private matchIsThisYear(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    if (!value) {return false;}
    
    const now = new Date();
    return value.getFullYear() === now.getFullYear();
  }

  private matchIsLastYear(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    if (!value) {return false;}
    
    const now = new Date();
    return value.getFullYear() === now.getFullYear() - 1;
  }

  private matchIsNextYear(record: RecordModel): boolean {
    const value = this.getDateValue(record);
    if (!value) {return false;}
    
    const now = new Date();
    return value.getFullYear() === now.getFullYear() + 1;
  }
}


