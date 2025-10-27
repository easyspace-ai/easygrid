/**
 * Group Manager
 * 管理记录分组功能，支持嵌套分组和折叠展开
 */

import type { Field } from '../field/Field';
import type { RecordModel } from '../record/Record';
import { FieldType } from '../../types/field';
import type { SortDirection } from '../sort/SortManager';

export interface IGroupConfig {
  fieldId: string;
  direction?: SortDirection;
}

export interface IGroupedRecord {
  record: RecordModel;
  level: number; // 嵌套层级
  groupPath: string[]; // 分组路径
}

export interface IGroupNode {
  id: string;
  fieldId: string;
  value: unknown;
  displayValue: string;
  level: number;
  records: RecordModel[];
  children: IGroupNode[];
  collapsed: boolean;
  count: number;
}

export class GroupManager {
  private groupConfigs: IGroupConfig[];
  private fields: Map<string, Field>;
  private collapsedGroups: Set<string>;

  constructor(groupConfigs: IGroupConfig[], fields: Field[]) {
    this.groupConfigs = groupConfigs;
    this.fields = new Map(fields.map(f => [f.id, f]));
    this.collapsedGroups = new Set();
  }

  /**
   * 对记录进行分组
   */
  group(records: RecordModel[]): IGroupNode[] {
    if (this.groupConfigs.length === 0) {
      return []; // 没有分组配置
    }

    return this.groupRecursive(records, 0);
  }

  /**
   * 获取扁平化的分组记录列表（用于渲染）
   */
  getFlattenedRecords(records: RecordModel[]): IGroupedRecord[] {
    const grouped = this.group(records);
    const flattened: IGroupedRecord[] = [];

    const flatten = (nodes: IGroupNode[], path: string[] = []) => {
      for (const node of nodes) {
        const currentPath = [...path, node.displayValue];
        
        // 添加当前组的所有记录
        for (const record of node.records) {
          flattened.push({
            record,
            level: node.level,
            groupPath: currentPath,
          });
        }

        // 如果该组未折叠，递归处理子组
        if (!this.isCollapsed(node.id) && node.children.length > 0) {
          flatten(node.children, currentPath);
        }
      }
    };

    flatten(grouped);
    return flattened;
  }

  /**
   * 获取分组摘要信息
   */
  getGroupSummaries(records: RecordModel[]): Map<string, number> {
    const summaries = new Map<string, number>();
    const grouped = this.group(records);

    const collect = (nodes: IGroupNode[]) => {
      for (const node of nodes) {
        summaries.set(node.id, node.count);
        if (node.children.length > 0) {
          collect(node.children);
        }
      }
    };

    collect(grouped);
    return summaries;
  }

  /**
   * 添加分组配置
   */
  addGroup(config: IGroupConfig): void {
    // 如果该字段已有分组配置，先移除
    this.removeGroup(config.fieldId);
    this.groupConfigs.push(config);
  }

  /**
   * 移除分组配置
   */
  removeGroup(fieldId: string): void {
    this.groupConfigs = this.groupConfigs.filter(c => c.fieldId !== fieldId);
  }

  /**
   * 清空所有分组
   */
  clearGroups(): void {
    this.groupConfigs = [];
    this.collapsedGroups.clear();
  }

  /**
   * 获取分组数量
   */
  getGroupCount(): number {
    return this.groupConfigs.length;
  }

  /**
   * 折叠/展开分组
   */
  toggleCollapse(groupId: string): void {
    if (this.collapsedGroups.has(groupId)) {
      this.collapsedGroups.delete(groupId);
    } else {
      this.collapsedGroups.add(groupId);
    }
  }

  /**
   * 折叠指定分组
   */
  collapse(groupId: string): void {
    this.collapsedGroups.add(groupId);
  }

  /**
   * 展开指定分组
   */
  expand(groupId: string): void {
    this.collapsedGroups.delete(groupId);
  }

  /**
   * 检查分组是否折叠
   */
  isCollapsed(groupId: string): boolean {
    return this.collapsedGroups.has(groupId);
  }

  /**
   * 折叠所有分组
   */
  collapseAll(): void {
    const grouped = this.group([]);
    const collectIds = (nodes: IGroupNode[]) => {
      for (const node of nodes) {
        this.collapsedGroups.add(node.id);
        if (node.children.length > 0) {
          collectIds(node.children);
        }
      }
    };
    collectIds(grouped);
  }

  /**
   * 展开所有分组
   */
  expandAll(): void {
    this.collapsedGroups.clear();
  }

  /**
   * 递归分组函数
   */
  private groupRecursive(records: RecordModel[], level: number): IGroupNode[] {
    if (level >= this.groupConfigs.length) {
      return []; // 已达到最大分组层级
    }

    const config = this.groupConfigs[level];
    const field = this.fields.get(config.fieldId);

    if (!field) {
      console.warn(`Field ${config.fieldId} not found`);
      return [];
    }

    // 按字段值分组
    const groups = new Map<string, RecordModel[]>();
    
    for (const record of records) {
      const value = record.getCellValue(config.fieldId);
      const key = this.getGroupKey(value);
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    }

    // 创建分组节点
    const nodes: IGroupNode[] = [];
    
    for (const [key, groupRecords] of groups) {
      const value = groupRecords[0]?.getCellValue(config.fieldId);
      const displayValue = this.getDisplayValue(value, field);
      const nodeId = this.generateGroupId(level, key);

      const node: IGroupNode = {
        id: nodeId,
        fieldId: config.fieldId,
        value,
        displayValue,
        level,
        records: groupRecords,
        children: this.groupRecursive(groupRecords, level + 1),
        collapsed: this.isCollapsed(nodeId),
        count: groupRecords.length,
      };

      nodes.push(node);
    }

    // 排序分组
    this.sortGroups(nodes, config.direction || 'asc');

    return nodes;
  }

  /**
   * 获取分组键
   */
  private getGroupKey(value: unknown): string {
    if (value === null || value === undefined) {
      return '__empty__';
    }

    if (Array.isArray(value)) {
      // 多选字段：按第一个值分组
      return value.length > 0 ? String(value[0]) : '__empty__';
    }

    return String(value);
  }

  /**
   * 获取显示值
   */
  private getDisplayValue(value: unknown, field: Field): string {
    if (value === null || value === undefined || value === '') {
      return '(空)';
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {return '(空)';}
      
      // 多选字段：显示所有选项
      return value.join(', ');
    }

    // 对于选择字段，可以从选项中获取显示名称
    if (field.type === 'singleSelect' || field.type === 'multipleSelect') {
      const options = (field.options as any)?.choices || [];
      const option = options.find((opt: any) => (opt.id || opt.name) === value);
      if (option) {
        return option.name || String(value);
      }
    }

    // 对于布尔字段
    if (field.type === FieldType.Checkbox) {
      return value ? '是' : '否';
    }

    return String(value);
  }

  /**
   * 生成分组 ID
   */
  private generateGroupId(level: number, key: string): string {
    return `group_${level}_${key}`;
  }

  /**
   * 排序分组
   */
  private sortGroups(nodes: IGroupNode[], direction: SortDirection): void {
    nodes.sort((a, b) => {
      // 空值始终排在最后
      if (a.value == null && b.value == null) {return 0;}
      if (a.value == null) {return 1;}
      if (b.value == null) {return -1;}

      // 比较值
      let comparison = 0;

      if (typeof a.value === 'number' && typeof b.value === 'number') {
        comparison = a.value - b.value;
      } else if (typeof a.value === 'boolean' && typeof b.value === 'boolean') {
        comparison = a.value === b.value ? 0 : (a.value ? -1 : 1);
      } else {
        comparison = String(a.value).localeCompare(String(b.value), 'zh-CN');
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }
}


