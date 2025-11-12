# 安装指南

## 📦 系统要求

### 必需

- **Go**: 1.23 或更高版本
- **数据库**: PostgreSQL 12+ 或 SQLite 3
- **操作系统**: Linux, macOS, Windows

### 可选

- **Redis**: 用于缓存和消息队列
- **Docker**: 用于容器化部署

## 🔧 安装步骤

### 方法1: 从源码安装

#### 1. 克隆仓库

```bash
git clone <repository-url>
cd easygrid/server
```

#### 2. 安装Go依赖

```bash
go mod download
go mod tidy
```

#### 3. 构建二进制文件

```bash
# 开发版本
make build

# 生产版本（包含版本信息）
make build-prod

# 输出: bin/luckdb
```

#### 4. 安装到系统

```bash
make install
# 安装到 $GOPATH/bin/luckdb
```

### 方法2: 使用Docker

```bash
# 构建镜像
docker build -t luckdb:latest .

# 运行容器
docker run -p 8888:8888 \
  -v $(pwd)/config.yaml:/app/config.yaml \
  luckdb:latest
```

### 方法3: 使用预编译二进制

从发布页面下载对应平台的二进制文件：

```bash
# Linux
wget https://github.com/.../luckdb-linux-amd64
chmod +x luckdb-linux-amd64
./luckdb-linux-amd64 serve
```

## 🗄️ 数据库设置

### PostgreSQL

#### 1. 安装PostgreSQL

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql

# 启动服务
sudo systemctl start postgresql  # Linux
brew services start postgresql   # macOS
```

#### 2. 创建数据库和用户

```bash
# 进入PostgreSQL命令行
sudo -u postgres psql

# 创建数据库
CREATE DATABASE luckdb_dev;

# 创建用户
CREATE USER luckdb WITH PASSWORD 'luckdb';

# 授权
GRANT ALL PRIVILEGES ON DATABASE luckdb_dev TO luckdb;

# 退出
\q
```

#### 3. 测试连接

```bash
psql -h localhost -U luckdb -d luckdb_dev
```

### SQLite

SQLite无需安装，Go会自动使用。只需在配置中指定数据库文件路径：

```yaml
database:
  provider: sqlite
  dsn: "./luckdb.db"
```

## 🔴 Redis设置（可选）

### 安装Redis

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# 启动服务
sudo systemctl start redis  # Linux
brew services start redis   # macOS
```

### 测试连接

```bash
redis-cli ping
# 应该返回: PONG
```

## ✅ 验证安装

### 1. 检查版本

```bash
./bin/luckdb --version
# 或
luckdb --version
```

### 2. 检查配置

```bash
./bin/luckdb util debug-config
```

### 3. 运行数据库迁移

```bash
./bin/luckdb migrate up
```

### 4. 启动服务器

```bash
./bin/luckdb serve
```

### 5. 测试API

```bash
curl http://localhost:8888/health
```

## 🐛 常见问题

### 问题1: Go版本不兼容

**错误**: `go: requires go >= 1.23`

**解决**: 升级Go到1.23或更高版本

```bash
# 检查当前版本
go version

# 升级Go
# 访问 https://golang.org/dl/ 下载最新版本
```

### 问题2: 数据库连接失败

**错误**: `dial tcp: connection refused`

**解决**: 
1. 检查PostgreSQL是否运行
2. 检查配置文件中的连接信息
3. 检查防火墙设置

```bash
# 检查PostgreSQL状态
sudo systemctl status postgresql

# 测试连接
psql -h localhost -U luckdb -d luckdb_dev
```

### 问题3: 端口被占用

**错误**: `bind: address already in use`

**解决**: 更改端口或停止占用端口的进程

```bash
# 查找占用端口的进程
lsof -i :8888

# 停止进程
kill -9 <PID>

# 或更改配置中的端口
```

### 问题4: 权限不足

**错误**: `permission denied`

**解决**: 检查文件权限和数据库用户权限

```bash
# 检查文件权限
ls -l bin/luckdb

# 添加执行权限
chmod +x bin/luckdb

# 检查数据库权限
psql -U luckdb -d luckdb_dev -c "\du"
```

## 📖 下一步

- [配置说明](./USAGE-CONFIGURATION.md)
- [快速开始](./USAGE-QUICKSTART.md)
- [API使用指南](./USAGE-API.md)

---

**最后更新**: 2025-01-XX

