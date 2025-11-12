# LuckDB 功能特性

## 📋 目录

本文档系统描述了 LuckDB 的核心功能和特性。

- [功能总览](./FEATURES-OVERVIEW.md) - 核心功能概览
- [数据模型](./FEATURES-DATA-MODEL.md) - 数据模型详解
- [字段类型](./FEATURES-FIELDS.md) - 支持的字段类型
- [高级特性](./FEATURES-ADVANCED.md) - 实时协作、权限、扩展等

## 🎯 核心特性

### 1. 多维表格系统

- 空间（Space）→ Base → 表格（Table）→ 记录（Record）
- 动态Schema，支持运行时创建表和字段
- 完整的CRUD操作

### 2. 丰富的字段类型

- **基础字段**: 文本、数字、日期、选择等
- **虚拟字段**: 公式、查找、汇总、计数
- **关联字段**: Link字段支持多种关系类型

### 3. 实时协作

- WebSocket实时同步
- ShareDB协作编辑协议
- 冲突检测和解决

### 4. 权限系统

- 空间级别权限
- Base级别权限
- 表级别权限
- 字段级别权限

### 5. 扩展性

- JavaScript插件系统
- 业务钩子系统
- MCP协议支持

## 📚 相关文档

- [开发设计文档](./ARCHITECTURE.md) - 架构和设计
- [使用文档](./USAGE.md) - 安装和使用

---

**最后更新**: 2025-01-XX

