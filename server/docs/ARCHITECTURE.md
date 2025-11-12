# LuckDB 开发设计文档

## 📋 目录

本文档系统描述了 LuckDB 后端的架构设计和开发指南。

- [架构总览](./ARCHITECTURE-OVERVIEW.md) - 系统架构、技术栈、设计原则
- [分层架构](./ARCHITECTURE-LAYERS.md) - 领域驱动设计（DDD）分层详解
- [依赖注入](./ARCHITECTURE-DI.md) - 容器模式、服务生命周期管理
- [数据库设计](./ARCHITECTURE-DATABASE.md) - Schema隔离、表结构、索引策略

## 🎯 快速导航

### 核心概念

- **领域驱动设计（DDD）**: 采用四层架构，清晰分离业务逻辑和基础设施
- **依赖注入容器**: 统一管理服务生命周期和依赖关系
- **Schema隔离**: 每个 Base 使用独立的 PostgreSQL Schema
- **动态表管理**: 每个 Table 对应一个物理表，支持动态字段

### 技术栈

- **语言**: Go 1.23+
- **Web框架**: Gin
- **ORM**: GORM
- **数据库**: PostgreSQL (主), SQLite (降级)
- **缓存**: Redis
- **实时通信**: WebSocket + ShareDB + SSE
- **JavaScript运行时**: goja (JSVM)

## 📚 相关文档

- [使用文档](./USAGE.md) - 安装、配置、API使用
- [功能特性](./FEATURES.md) - 核心功能说明
- [数据库迁移](../migrations/README.md) - 迁移管理指南

---

**最后更新**: 2025-01-XX

