/**
 * Centralized Type System - 统一类型系统
 * 
 * 架构分层：
 * ┌─────────────────────────────────────────┐
 * │         Presentation (UI)               │  Grid 组件、UI 状态
 * ├─────────────────────────────────────────┤
 * │              ↑ Mappers ↓                │  类型转换器
 * ├─────────────────────────────────────────┤
 * │          Domain (Business)              │  业务模型、命令
 * ├─────────────────────────────────────────┤
 * │     Infrastructure (External)           │  API DTO、外部服务
 * ├─────────────────────────────────────────┤
 * │            Core (Foundation)            │  基础类型、常量
 * └─────────────────────────────────────────┘
 * 
 * 数据流方向：
 * API Response (DTO) → Domain Model → Presentation (UI)
 * User Action (Command) → Domain Model → API Request (DTO)
 */

// ============ Core Types (基础层) ============
export * from './core';

// ============ Infrastructure Types (基础设施层) ============
export * from './infrastructure';

// ============ Domain Types (领域层) ============
export * from './domain';

// ============ Presentation Types (表现层) ============
export * from './presentation';

// ============ Type Mappers (类型转换器) ============
export * from './mappers';

// ============ Legacy Types (向后兼容) ============
// 保留旧的导出，避免破坏现有代码
export * from './user';
export * from './hooks';

// 导出旧的类型别名（向后兼容）
export type { FieldDTO as IField } from './infrastructure';
export type { RecordDTO as IRecord } from './infrastructure';
export type { BaseDTO as IBase } from './infrastructure';
export type { TableDTO as ITable } from './infrastructure';
export type { ViewDTO as IView } from './infrastructure';

// 导出旧的请求类型（向后兼容）
export type { CreateFieldDTO as ICreateFieldRo } from './infrastructure';
export type { UpdateFieldDTO as IUpdateFieldRo } from './infrastructure';
export type { CreateRecordDTO as ICreateRecordRo } from './infrastructure';
export type { UpdateRecordDTO as IUpdateRecordRo } from './infrastructure';
export type { CreateBaseDTO as ICreateBaseRo } from './infrastructure';
export type { UpdateBaseDTO as IUpdateBaseRo } from './infrastructure';
export type { CreateTableDTO as ICreateTableRo } from './infrastructure';
export type { UpdateTableDTO as IUpdateTableRo } from './infrastructure';

// 导出 GridColumn（常用）
export type { GridColumn as IGridColumn } from './presentation';
