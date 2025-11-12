# 快速开始

## 🎯 5分钟快速体验

### 前置要求

- Go 1.23+
- PostgreSQL 12+ (或 SQLite)
- Redis (可选，用于缓存)

### 步骤1: 获取代码

```bash
git clone <repository-url>
cd easygrid/server
```

### 步骤2: 安装依赖

```bash
go mod download
```

### 步骤3: 配置数据库

```bash
# 复制配置模板
cp config.yaml.example config.yaml

# 编辑配置文件
vim config.yaml
```

**最小配置**:

```yaml
server:
  port: 8888
  mode: development

database:
  host: localhost
  port: 5432
  name: luckdb_dev
  user: luckdb
  password: luckdb
  sslmode: disable

jwt:
  secret: "your-secret-key-change-in-production"
```

### 步骤4: 创建数据库

```bash
# PostgreSQL
createdb luckdb_dev

# 或使用SQLite（无需创建，自动创建）
```

### 步骤5: 运行迁移

```bash
# 使用Makefile
make migrate

# 或直接运行
go run ./cmd/server migrate up
```

### 步骤6: 启动服务器

```bash
# 使用Makefile
make run

# 或直接运行
go run ./cmd/server serve
```

### 步骤7: 验证运行

```bash
# 健康检查
curl http://localhost:8888/health

# 应该返回:
# {"status":"ok","version":"0.1.0"}
```

## 📝 创建第一个用户

```bash
# 注册用户
curl -X POST http://localhost:8888/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "name": "Admin User"
  }'

# 登录获取Token
curl -X POST http://localhost:8888/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

## 🎉 下一步

- [详细安装指南](./USAGE-INSTALLATION.md)
- [配置说明](./USAGE-CONFIGURATION.md)
- [API使用指南](./USAGE-API.md)

---

**最后更新**: 2025-01-XX

