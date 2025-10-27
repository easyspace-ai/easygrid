/**
 * Record Type Mappers - 记录类型转换器
 */

import type { RecordDTO, CreateRecordDTO, UpdateRecordDTO } from '../infrastructure';
import type { RecordModel, CreateRecordCommand, UpdateRecordCommand } from '../domain';

/**
 * Record Mapper
 */
export class RecordMapper {
  /**
   * DTO → Domain Model
   */
  static toDomain(dto: RecordDTO): RecordModel {
    return {
      id: dto.id,
      fields: new Map(Object.entries(dto.fields)),
      createdTime: dto.createdTime ? new Date(dto.createdTime) : undefined,
      lastModifiedTime: dto.lastModifiedTime ? new Date(dto.lastModifiedTime) : undefined,
      createdBy: dto.createdBy,
      lastModifiedBy: dto.lastModifiedBy,
    };
  }

  /**
   * Domain Model → DTO (用于响应)
   */
  static toDTO(model: RecordModel): RecordDTO {
    return {
      id: model.id,
      fields: Object.fromEntries(model.fields),
      createdTime: model.createdTime?.toISOString(),
      lastModifiedTime: model.lastModifiedTime?.toISOString(),
      createdBy: model.createdBy,
      lastModifiedBy: model.lastModifiedBy,
    };
  }

  /**
   * Create Command → DTO
   */
  static createCommandToDTO(command: CreateRecordCommand): CreateRecordDTO {
    const fields = command.fields instanceof Map 
      ? Object.fromEntries(command.fields) 
      : command.fields;
    
    return {
      fields,
      order: command.order,
    };
  }

  /**
   * Update Command → DTO
   */
  static updateCommandToDTO(command: UpdateRecordCommand): UpdateRecordDTO {
    return {
      recordId: command.recordId,
      fieldId: command.fieldId,
      value: command.value,
    };
  }
}

