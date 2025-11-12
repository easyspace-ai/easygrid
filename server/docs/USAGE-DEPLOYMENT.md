# 部署指南

## 🚀 生产环境部署

### 前置要求

- Linux服务器（推荐Ubuntu 20.04+）
- PostgreSQL 12+
- Redis（可选）
- Nginx（反向代理，可选）

## 📦 部署方式

### 方式1: 二进制部署

#### 1. 构建生产版本

```bash
# 在开发机器上构建
cd server
make build-prod

# 或交叉编译
make build-linux
```

#### 2. 上传到服务器

```bash
# 使用scp上传
scp bin/luckdb-linux user@server:/opt/luckdb/

# 上传配置文件
scp config.yaml user@server:/opt/luckdb/
```

#### 3. 在服务器上设置

```bash
# SSH到服务器
ssh user@server

# 创建目录
sudo mkdir -p /opt/luckdb
sudo chown $USER:$USER /opt/luckdb

# 移动文件
mv luckdb-linux /opt/luckdb/luckdb
chmod +x /opt/luckdb/luckdb
```

#### 4. 创建systemd服务

```bash
sudo vim /etc/systemd/system/luckdb.service
```

**服务文件内容**:

```ini
[Unit]
Description=LuckDB API Server
After=network.target postgresql.service

[Service]
Type=simple
User=luckdb
WorkingDirectory=/opt/luckdb
ExecStart=/opt/luckdb/luckdb serve
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# 环境变量
Environment="CONFIG_PATH=/opt/luckdb/config.yaml"

# 资源限制
LimitNOFILE=65535
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
```

#### 5. 启动服务

```bash
# 创建用户
sudo useradd -r -s /bin/false luckdb

# 设置权限
sudo chown -R luckdb:luckdb /opt/luckdb

# 重载systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start luckdb

# 设置开机自启
sudo systemctl enable luckdb

# 查看状态
sudo systemctl status luckdb

# 查看日志
sudo journalctl -u luckdb -f
```

### 方式2: Docker部署

#### 1. 创建Dockerfile

```dockerfile
FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY . .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o luckdb ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/luckdb .
COPY --from=builder /app/config.yaml.example config.yaml
EXPOSE 8888
CMD ["./luckdb", "serve"]
```

#### 2. 构建镜像

```bash
docker build -t luckdb:latest .
```

#### 3. 运行容器

```bash
docker run -d \
  --name luckdb \
  -p 8888:8888 \
  -v $(pwd)/config.yaml:/root/config.yaml \
  -v $(pwd)/uploads:/root/uploads \
  --restart unless-stopped \
  luckdb:latest
```

#### 4. 使用Docker Compose

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  luckdb:
    build: .
    container_name: luckdb
    ports:
      - "8888:8888"
    volumes:
      - ./config.yaml:/root/config.yaml
      - ./uploads:/root/uploads
      - ./logs:/root/logs
    environment:
      - DB_HOST=postgres
      - DB_NAME=luckdb
      - DB_USER=luckdb
      - DB_PASSWORD=luckdb
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:14
    container_name: luckdb-postgres
    environment:
      - POSTGRES_DB=luckdb
      - POSTGRES_USER=luckdb
      - POSTGRES_PASSWORD=luckdb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: luckdb-redis
    restart: unless-stopped

volumes:
  postgres_data:
```

**启动**:

```bash
docker-compose up -d
```

### 方式3: Kubernetes部署

#### 1. 创建Deployment

**deployment.yaml**:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: luckdb
spec:
  replicas: 3
  selector:
    matchLabels:
      app: luckdb
  template:
    metadata:
      labels:
        app: luckdb
    spec:
      containers:
      - name: luckdb
        image: luckdb:latest
        ports:
        - containerPort: 8888
        env:
        - name: DB_HOST
          value: "postgres-service"
        volumeMounts:
        - name: config
          mountPath: /root/config.yaml
          subPath: config.yaml
      volumes:
      - name: config
        configMap:
          name: luckdb-config
```

#### 2. 创建Service

**service.yaml**:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: luckdb-service
spec:
  selector:
    app: luckdb
  ports:
  - port: 80
    targetPort: 8888
  type: LoadBalancer
```

## 🔒 安全配置

### 1. 防火墙设置

```bash
# 只开放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Nginx反向代理

**nginx配置** (`/etc/nginx/sites-available/luckdb`):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**启用配置**:

```bash
sudo ln -s /etc/nginx/sites-available/luckdb /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. SSL证书

使用Let's Encrypt:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

## 📊 监控和日志

### 1. 日志管理

```bash
# 查看应用日志
sudo journalctl -u luckdb -f

# 查看错误日志
sudo journalctl -u luckdb -p err

# 日志轮转（systemd自动管理）
```

### 2. 健康检查

```bash
# 健康检查端点
curl http://localhost:8888/health

# 监控脚本
#!/bin/bash
while true; do
    if ! curl -f http://localhost:8888/health > /dev/null 2>&1; then
        echo "Service is down, restarting..."
        sudo systemctl restart luckdb
    fi
    sleep 60
done
```

### 3. 性能监控

```bash
# 查看数据库统计
curl http://localhost:8888/api/v1/monitoring/db-stats

# 查看查询统计
curl http://localhost:8888/api/v1/monitoring/query-stats
```

## 🔄 更新部署

### 1. 备份

```bash
# 备份数据库
pg_dump -U luckdb luckdb > backup_$(date +%Y%m%d).sql

# 备份配置文件
cp config.yaml config.yaml.backup
```

### 2. 更新

```bash
# 停止服务
sudo systemctl stop luckdb

# 备份旧版本
cp /opt/luckdb/luckdb /opt/luckdb/luckdb.backup

# 上传新版本
scp luckdb-linux user@server:/opt/luckdb/luckdb

# 运行数据库迁移
/opt/luckdb/luckdb migrate up

# 启动服务
sudo systemctl start luckdb

# 验证
curl http://localhost:8888/health
```

### 3. 回滚

```bash
# 停止服务
sudo systemctl stop luckdb

# 恢复旧版本
cp /opt/luckdb/luckdb.backup /opt/luckdb/luckdb

# 回滚数据库迁移（如果需要）
/opt/luckdb/luckdb migrate down 1

# 启动服务
sudo systemctl start luckdb
```

## 📖 相关文档

- [安装指南](./USAGE-INSTALLATION.md)
- [配置说明](./USAGE-CONFIGURATION.md)
- [API使用指南](./USAGE-API.md)

---

**最后更新**: 2025-01-XX

