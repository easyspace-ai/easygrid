/**
 * Type Mappers - 类型转换器导出
 * 
 * 设计原则：
 * 1. 单向数据流：DTO → Domain → Presentation
 * 2. 明确的转换边界
 * 3. 类型安全的转换
 * 
 * 转换流程：
 * - API 响应 (DTO) → 领域模型 (Domain)
 * - 领域模型 (Domain) → UI 模型 (Presentation)
 * - 命令 (Command) → API 请求 (DTO)
 */

export * from './field.mapper';
export * from './record.mapper';

