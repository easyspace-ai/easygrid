# 配置说明

## 📝 配置文件

LuckDB 使用 YAML 格式的配置文件，默认文件名为 `config.yaml`。

### 配置文件位置

1. **当前目录**: `./config.yaml`
2. **命令行参数**: `--config /path/to/config.yaml`
3. **环境变量**: 支持通过环境变量覆盖配置

## ⚙️ 配置项详解

### Server配置

```yaml
server:
  port: 8888              # 服务端口
  mode: development        # 运行模式: development, production
  name: LuckDB            # 服务名称
  version: 0.1.0          # 版本号
```

**说明**:
- `port`: HTTP服务监听端口
- `mode`: 
  - `development`: 开发模式，详细日志
  - `production`: 生产模式，优化性能

### Database配置

```yaml
database:
  host: localhost          # 数据库主机
  port: 5432              # 数据库端口
  name: luckdb_dev        # 数据库名称
  user: luckdb            # 数据库用户
  password: luckdb        # 数据库密码
  sslmode: disable        # SSL模式: disable, require, verify-full
  maxIdleConns: 10        # 最大空闲连接数
  maxOpenConns: 100       # 最大打开连接数
  connMaxLifetime: 1h     # 连接最大生存时间
  log_level: info         # SQL日志级别: silent, error, warn, info
```

**说明**:
- `sslmode`: 
  - `disable`: 不使用SSL（开发环境）
  - `require`: 需要SSL（生产环境）
  - `verify-full`: 验证SSL证书
- `log_level`: 设置为 `info` 可查看所有SQL查询

### Redis配置（可选）

```yaml
redis:
  host: localhost          # Redis主机
  port: 6379              # Redis端口
  password: ""            # Redis密码（可选）
  db: 0                   # Redis数据库编号
  poolSize: 10            # 连接池大小
```

**说明**: Redis是可选的，如果不配置，缓存功能将不可用。

### JWT配置

```yaml
jwt:
  secret: "your-secret-key-change-in-production-use-at-least-32-chars"
  expires: 168h           # Token过期时间（7天）
  refreshExpires: 720h    # 刷新Token过期时间（30天）
```

**⚠️ 重要**: 生产环境必须更改 `secret`，使用至少32个字符的随机字符串。

### Storage配置

```yaml
storage:
  provider: local          # 存储提供者: local, s3, oss
  local:
    path: ./uploads       # 本地存储路径
  # s3:
  #   endpoint: s3.amazonaws.com
  #   bucket: luckdb-uploads
  #   accessKey: your-access-key
  #   secretKey: your-secret-key
  #   region: us-east-1
```

**说明**:
- `local`: 本地文件系统存储
- `s3`: AWS S3存储（需要配置）
- `oss`: 阿里云OSS存储（需要配置）

### Log配置

```yaml
log:
  level: debug            # 日志级别: debug, info, warn, error
  output: stdout          # 输出方式: stdout, file, both
  file: logs/app.log      # 日志文件路径
  maxSize: 100           # 单个文件最大大小(MB)
  maxBackups: 3          # 保留的旧日志文件数量
  maxAge: 28             # 保留的最大天数
  compress: true         # 是否压缩旧日志
```

### SQL Logger配置

```yaml
sql_logger:
  enabled: true           # 是否启用SQL日志
  output_path: logs/sql.log  # SQL日志文件路径
  max_size: 100          # 单个文件最大大小(MB)
  max_backups: 5         # 保留的旧日志文件数量
  max_age: 30           # 保留的最大天数
  compress: false        # 是否压缩
```

### CORS配置

```yaml
cors:
  allowOrigins:
    - http://localhost:3000
    - http://localhost:3001
  allowMethods:
    - GET
    - POST
    - PUT
    - PATCH
    - DELETE
    - OPTIONS
  allowHeaders:
    - Origin
    - Content-Type
    - Authorization
  exposeHeaders:
    - Content-Length
  allowCredentials: true
  maxAge: 12h
```

### Rate Limit配置

```yaml
rateLimit:
  enabled: true           # 是否启用限流
  requests: 100          # 每分钟请求数
  burst: 10              # 突发请求数
```

### AI配置（可选）

```yaml
ai:
  enabled: false          # 是否启用AI功能
  provider: ollama       # AI提供者: ollama, openai
  ollama:
    baseURL: http://localhost:11434
    model: llama2
  # openai:
  #   apiKey: your-openai-api-key
  #   model: gpt-3.5-turbo
```

### Monitoring配置（可选）

```yaml
monitoring:
  enabled: false          # 是否启用监控
  # prometheus:
  #   enabled: true
  #   port: 9090
  # sentry:
  #   dsn: your-sentry-dsn
  #   environment: development
```

## 🔐 环境变量

支持通过环境变量覆盖配置：

```bash
# 数据库配置
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=luckdb_dev
export DB_USER=luckdb
export DB_PASSWORD=luckdb

# JWT配置
export JWT_SECRET=your-secret-key

# 服务器配置
export SERVER_PORT=8888
export SERVER_MODE=production
```

**环境变量命名规则**:
- 使用大写字母
- 使用下划线分隔
- 前缀为配置段名称（如 `DB_`, `JWT_`, `SERVER_`）

## 📋 配置验证

### 检查配置

```bash
# 使用命令行工具
./bin/luckdb util debug-config

# 输出示例:
# Server:
#   Port: 8888
#   Mode: development
# Database:
#   Host: localhost
#   Port: 5432
#   Name: luckdb_dev
# ...
```

### 测试配置

```bash
# 启动服务器（会验证配置）
./bin/luckdb serve

# 如果配置有误，会显示错误信息
```

## 🔒 安全建议

### 生产环境配置

1. **更改JWT Secret**: 使用强随机字符串
2. **启用SSL**: 数据库连接使用SSL
3. **限制CORS**: 只允许信任的域名
4. **启用限流**: 防止API滥用
5. **日志级别**: 生产环境使用 `info` 或 `warn`
6. **禁用SQL日志**: 生产环境可禁用详细SQL日志

### 示例生产配置

```yaml
server:
  mode: production

database:
  sslmode: require

jwt:
  secret: "your-very-long-random-secret-key-at-least-32-chars"

cors:
  allowOrigins:
    - https://yourdomain.com

log:
  level: info

sql_logger:
  enabled: false
```

## 📖 相关文档

- [快速开始](./USAGE-QUICKSTART.md)
- [安装指南](./USAGE-INSTALLATION.md)
- [API使用指南](./USAGE-API.md)

---

**最后更新**: 2025-01-XX

