/**
 * Field Type Mappers - 字段类型转换器
 * 
 * 设计原则：
 * 1. 明确的转换边界
 * 2. 类型安全
 * 3. 单向数据流：DTO → Domain → Presentation
 */

import type { FieldDTO, CreateFieldDTO, UpdateFieldDTO } from '../infrastructure';
import type { FieldModel, CreateFieldCommand, UpdateFieldCommand } from '../domain';
import type { GridColumn } from '../presentation';
import type { FieldType } from '../core';

/**
 * Field Mapper
 */
export class FieldMapper {
  /**
   * DTO → Domain Model
   * API 响应转换为领域模型
   */
  static toDomain<T extends FieldType = FieldType>(dto: FieldDTO): FieldModel<T> {
    return {
      id: dto.id,
      name: dto.name,
      type: dto.type as T,
      tableId: dto.tableId,
      options: dto.options,
      description: dto.description,
      isComputed: dto.isComputed,
      isPrimary: dto.isPrimary,
      createdTime: new Date(dto.createdTime),
      lastModifiedTime: new Date(dto.lastModifiedTime),
    };
  }

  /**
   * Domain Model → Presentation (Grid Column)
   * 领域模型转换为 UI 展示
   */
  static toGridColumn(model: FieldModel): GridColumn {
    return {
      id: model.id,
      name: model.name,
      type: model.type,
      icon: this.getFieldIcon(model.type),
      width: 150, // 默认宽度
      hasMenu: true,
      readonly: model.isComputed,
      isPrimary: model.isPrimary,
      description: model.description,
      options: model.options,
    };
  }

  /**
   * Create Command → DTO
   * 创建命令转换为 API 请求
   */
  static createCommandToDTO(command: CreateFieldCommand): CreateFieldDTO {
    return {
      name: command.name,
      type: command.type,
      options: command.options,
      description: command.description,
      isPrimary: command.isPrimary,
    };
  }

  /**
   * Update Command → DTO
   * 更新命令转换为 API 请求
   */
  static updateCommandToDTO(command: UpdateFieldCommand): UpdateFieldDTO {
    return {
      name: command.name,
      type: command.type,
      options: command.options,
      description: command.description,
    };
  }

  /**
   * 获取字段类型图标
   */
  private static getFieldIcon(type: FieldType): string {
    const iconMap: Partial<Record<FieldType, string>> = {
      singleLineText: '📝',
      longText: '📄',
      number: '🔢',
      singleSelect: '🔘',
      multipleSelect: '☑️',
      date: '📅',
      checkbox: '☑️',
      user: '👤',
      attachment: '📎',
      link: '🔗',
      rating: '⭐',
      formula: '🧮',
      rollup: '📊',
      autoNumber: '#️⃣',
      createdTime: '🕒',
      lastModifiedTime: '🕐',
      createdBy: '👤',
      lastModifiedBy: '👤',
      button: '🔘',
      email: '📧',
      phone: '📱',
      url: '🌐',
    };
    return iconMap[type] || '📄';
  }
}

