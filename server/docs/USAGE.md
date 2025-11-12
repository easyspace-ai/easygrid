# LuckDB 使用文档

## 📋 目录

本文档系统描述了 LuckDB 后端的安装、配置、使用和部署。

- [快速开始](./USAGE-QUICKSTART.md) - 快速安装和运行
- [安装指南](./USAGE-INSTALLATION.md) - 详细安装步骤
- [配置说明](./USAGE-CONFIGURATION.md) - 配置文件详解
- [API使用](./USAGE-API.md) - API接口使用指南
- [部署指南](./USAGE-DEPLOYMENT.md) - 生产环境部署

## 🚀 快速开始

### 5分钟快速体验

```bash
# 1. 克隆项目
git clone <repository-url>
cd easygrid/server

# 2. 配置数据库
cp config.yaml.example config.yaml
# 编辑 config.yaml，设置数据库连接

# 3. 运行数据库迁移
make migrate

# 4. 启动服务器
make run

# 5. 访问 API
curl http://localhost:8888/health
```

## 📚 相关文档

- [开发设计文档](./ARCHITECTURE.md) - 架构和设计
- [功能特性](./FEATURES.md) - 核心功能说明

---

**最后更新**: 2025-01-XX

