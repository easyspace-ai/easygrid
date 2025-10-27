/**
 * Filter Manager
 * 管理多个过滤器的组合和执行
 */

import type { Field } from '../field/Field';
import type { RecordModel } from '../record/Record';
import type { BaseFilter, IFilterConfig } from './BaseFilter';
import { createFilterInstance } from './factory';

export type FilterConjunction = 'and' | 'or';

export interface IFilterGroup {
  conjunction: FilterConjunction;
  filters: IFilterItem[];
}

export interface IFilterItem {
  id: string;
  fieldId: string;
  config: IFilterConfig;
}

export class FilterManager {
  private filterGroup: IFilterGroup;
  private fields: Map<string, Field>;

  constructor(filterGroup: IFilterGroup, fields: Field[]) {
    this.filterGroup = filterGroup;
    this.fields = new Map(fields.map(f => [f.id, f]));
  }

  /**
   * 检查记录是否匹配过滤条件
   */
  match(record: RecordModel): boolean {
    const { conjunction, filters } = this.filterGroup;

    if (filters.length === 0) {
      return true; // 没有过滤器，所有记录都匹配
    }

    const filterInstances = this.createFilterInstances(filters);

    if (conjunction === 'and') {
      // AND: 所有过滤器都必须匹配
      return filterInstances.every(filter => filter.match(record));
    } else {
      // OR: 至少一个过滤器匹配
      return filterInstances.some(filter => filter.match(record));
    }
  }

  /**
   * 过滤记录数组
   */
  filter(records: RecordModel[]): RecordModel[] {
    if (this.filterGroup.filters.length === 0) {
      return records; // 没有过滤器，返回所有记录
    }

    return records.filter(record => this.match(record));
  }

  /**
   * 获取过滤器的显示文本
   */
  getDisplayText(): string {
    const { conjunction, filters } = this.filterGroup;

    if (filters.length === 0) {
      return '';
    }

    const filterInstances = this.createFilterInstances(filters);
    const texts = filterInstances.map(f => f.getDisplayText());

    const conjunctionText = conjunction === 'and' ? ' 且 ' : ' 或 ';
    return texts.join(conjunctionText);
  }

  /**
   * 添加过滤器
   */
  addFilter(filter: IFilterItem): void {
    this.filterGroup.filters.push(filter);
  }

  /**
   * 移除过滤器
   */
  removeFilter(filterId: string): void {
    this.filterGroup.filters = this.filterGroup.filters.filter(f => f.id !== filterId);
  }

  /**
   * 更新过滤器
   */
  updateFilter(filterId: string, config: Partial<IFilterConfig>): void {
    const filter = this.filterGroup.filters.find(f => f.id === filterId);
    if (filter) {
      filter.config = { ...filter.config, ...config };
    }
  }

  /**
   * 清空所有过滤器
   */
  clearFilters(): void {
    this.filterGroup.filters = [];
  }

  /**
   * 设置连接类型
   */
  setConjunction(conjunction: FilterConjunction): void {
    this.filterGroup.conjunction = conjunction;
  }

  /**
   * 获取过滤器数量
   */
  getFilterCount(): number {
    return this.filterGroup.filters.length;
  }

  /**
   * 验证所有过滤器
   */
  validate(): boolean {
    const filterInstances = this.createFilterInstances(this.filterGroup.filters);
    return filterInstances.every(filter => filter.validate());
  }

  /**
   * 创建过滤器实例
   */
  private createFilterInstances(filters: IFilterItem[]): BaseFilter[] {
    return filters
      .map(filterItem => {
        const field = this.fields.get(filterItem.fieldId);
        if (!field) {
          console.warn(`Field ${filterItem.fieldId} not found`);
          return null;
        }
        return createFilterInstance(field, filterItem.config);
      })
      .filter((filter): filter is BaseFilter => filter !== null);
  }
}


