# TeleCRM 管理系统 - 完整部署指南

> 适用于开发、测试和生产环境的完整部署文档

---

## 📋 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [开发环境部署](#开发环境部署)
- [生产环境部署](#生产环境部署)
- [Docker 部署](#docker-部署)
- [常见问题](#常见问题)
- [运维指南](#运维指南)

---

## 环境要求

### 软件依赖

| 软件 | 版本要求 | 检查命令 |
|------|---------|---------|
| Node.js | ≥ 18.0 | `node --version` |
| npm | ≥ 8.0 | `npm --version` |
| Python | ≥ 3.8 | `python3 --version` |
| pip | ≥ 20.0 | `pip3 --version` |

### 系统要求

- **操作系统**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **内存**: 最低 2GB RAM（推荐 4GB+）
- **存储**: 至少 1GB 可用空间
- **网络**: 需要访问 npm 和 PyPI 镜像

### 端口占用

确保以下端口未被占用：

- **3000/3001**: 前端开发服务器（Vite）
- **5000**: 后端 API 服务器（Flask）

检查端口占用：
```bash
# macOS/Linux
lsof -i :3000
lsof -i :5000

# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :5000
```

---

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd telecrm-admin-management-system
```

### 2. 安装依赖

```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
pip3 install -r requirements.txt
```

### 3. 启动服务

**终端 1 - 后端**:
```bash
cd backend
python3 server.py
```
✅ 后端启动在 http://127.0.0.1:5000

**终端 2 - 前端**:
```bash
cd frontend
npm run dev
```
✅ 前端启动在 http://localhost:3000（或 3001）

### 4. 访问应用

打开浏览器访问 http://localhost:3000

**默认账号**: `admin` / `admin123`

⚠️ **首次登录后请立即修改默认密码！**

---

## 开发环境部署

### 前端开发

#### 安装依赖
```bash
cd frontend
npm install
```

#### 启动开发服务器
```bash
npm run dev
```

特性：
- ✅ 热模块替换（HMR）
- ✅ 快速刷新
- ✅ TypeScript 类型检查
- ✅ 自动代理到后端 API

#### 构建测试
```bash
npm run build
npm run preview
```

#### 配置说明

**vite.config.ts**:
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
```

### 后端开发

#### 使用虚拟环境（推荐）

**创建虚拟环境**:
```bash
cd backend
python3 -m venv venv
```

**激活虚拟环境**:
```bash
# macOS/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

**安装依赖**:
```bash
pip install -r requirements.txt
```

**退出虚拟环境**:
```bash
deactivate
```

#### 启动后端服务

**开发模式**（带自动重载）:
```bash
cd backend
python3 server.py
```

**查看日志**:
```bash
# 日志输出到控制台
python3 server.py

# 重定向到文件
python3 server.py > logs/server.log 2>&1
```

#### 数据库管理

**查看数据库**:
```bash
sqlite3 ../data/elecrm.db

# SQLite 命令
.tables              # 列出所有表
.schema users        # 查看表结构
SELECT * FROM web_admins;  # 查询数据
.quit                # 退出
```

**备份数据库**:
```bash
# 手动备份
cp ../data/elecrm.db ../data/elecrm.db.backup.$(date +%Y%m%d_%H%M%S)

# 每天自动备份（crontab）
0 2 * * * cp /path/to/data/elecrm.db /path/to/backups/elecrm.db.$(date +\%Y\%m\%d)
```

**恢复数据库**:
```bash
cp ../data/elecrm.db.backup ../data/elecrm.db
# 重启后端服务
```

---

## 生产环境部署

### 方案一：传统部署（Nginx + Gunicorn）

#### 1. 构建前端

```bash
cd frontend
npm run build
```

构建产物在 `frontend/dist/` 目录。

#### 2. 配置 Nginx

创建配置文件 `/etc/nginx/sites-available/telecrm`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    root /var/www/telecrm/frontend/dist;
    index index.html;

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss;
}
```

**启用配置**:
```bash
sudo ln -s /etc/nginx/sites-available/telecrm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 3. 部署后端（使用 Gunicorn）

**安装 Gunicorn**:
```bash
cd backend
pip install gunicorn
```

**创建 systemd 服务**:

文件: `/etc/systemd/system/telecrm.service`

```ini
[Unit]
Description=TeleCRM Backend API
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/telecrm/backend
Environment="PATH=/var/www/telecrm/backend/venv/bin"

ExecStart=/var/www/telecrm/backend/venv/bin/gunicorn \
    --bind 127.0.0.1:5000 \
    --workers 4 \
    --worker-class sync \
    --timeout 120 \
    --access-logfile /var/log/telecrm/access.log \
    --error-logfile /var/log/telecrm/error.log \
    --log-level info \
    server:app

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**启动服务**:
```bash
# 创建日志目录
sudo mkdir -p /var/log/telecrm
sudo chown www-data:www-data /var/log/telecrm

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable telecrm
sudo systemctl start telecrm

# 查看状态
sudo systemctl status telecrm
```

#### 4. HTTPS 配置（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 方案二：使用 PM2（简易部署）

#### 安装 PM2
```bash
npm install -g pm2
```

#### 创建 PM2 配置

文件: `ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'telecrm-backend',
      cwd: './backend',
      script: 'server.py',
      interpreter: 'python3',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        FLASK_ENV: 'production'
      }
    }
  ]
};
```

#### 启动服务
```bash
# 启动
pm2 start ecosystem.config.js

# 查看状态
pm2 status
pm2 logs telecrm-backend

# 开机自启
pm2 startup
pm2 save
```

---

## Docker 部署

### 创建 Dockerfile

#### 前端 Dockerfile

文件: `frontend/Dockerfile`

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# 生产阶段
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 后端 Dockerfile

文件: `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# 复制应用
COPY . .

# 创建数据目录
RUN mkdir -p /app/data

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "server:app"]
```

#### Docker Compose

文件: `docker-compose.yml`

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: telecrm-backend
    ports:
      - "5000:5000"
    volumes:
      - ./data:/app/data
    environment:
      - FLASK_ENV=production
    restart: unless-stopped
    networks:
      - telecrm-network

  frontend:
    build: ./frontend
    container_name: telecrm-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - telecrm-network

networks:
  telecrm-network:
    driver: bridge

volumes:
  telecrm-data:
```

#### 启动 Docker 服务

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

---

## 常见问题

### 1. 前端空白页面

**症状**: 访问 http://localhost:3000 显示空白

**可能原因**:
- index.html 路径错误
- JavaScript 加载失败
- 端口未启动

**解决方案**:
```bash
# 1. 检查 index.html 位置
ls frontend/index.html

# 2. 检查浏览器控制台错误
# 打开开发者工具 (F12)

# 3. 确认 Vite 启动成功
cd frontend
npm run dev

# 4. 检查端口
lsof -i :3000  # macOS/Linux
```

### 2. 后端无法连接

**症状**: 前端 API 请求失败 (404/500)

**解决方案**:
```bash
# 1. 确认后端启动
curl http://127.0.0.1:5000/api/scripts

# 2. 检查数据库路径
cd backend
python3 -c "import os; print(os.path.exists('../data/elecrm.db'))"

# 3. 查看后端日志
python3 server.py

# 4. 检查 CORS 设置
# 确保 server.py 中有 CORS(app, supports_credentials=True)
```

### 3. 数据库错误

**症状**: `no such table: web_admins`

**解决方案**:
```bash
# 1. 删除损坏的数据库
rm data/elecrm.db

# 2. 重启后端（会自动初始化）
cd backend
python3 server.py

# 3. 验证表创建
sqlite3 ../data/elecrm.db ".tables"
```

### 4. 端口被占用

**症状**: `Port 3000 is in use`

**解决方案**:
```bash
# macOS/Linux - 查找并终止进程
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# 或者使用其他端口
npm run dev -- --port 3001
```

### 5. npm install 失败

**症状**: 依赖安装失败或速度慢

**解决方案**:
```bash
# 清除缓存
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# 使用国内镜像
npm config set registry https://registry.npmmirror.com
npm install

# 或使用 yarn
npm install -g yarn
yarn install
```

### 6. Python 依赖安装失败

**症状**: pip install 失败

**解决方案**:
```bash
# 升级 pip
pip3 install --upgrade pip

# 使用国内镜像
pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 使用虚拟环境
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## 运维指南

### 日志管理

#### 前端日志
```bash
# 开发环境：浏览器控制台
# 生产环境：Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

#### 后端日志
```bash
# 开发环境
python3 server.py 2>&1 | tee logs/server.log

# 生产环境（systemd）
sudo journalctl -u telecrm -f

# 生产环境（Gunicorn）
tail -f /var/log/telecrm/access.log
tail -f /var/log/telecrm/error.log
```

### 性能监控

#### 系统资源
```bash
# CPU 和内存使用
top
htop

# 磁盘空间
df -h

# 进程状态
ps aux | grep python
ps aux | grep node
```

#### 应用监控
```bash
# PM2 监控
pm2 monit

# Systemd 状态
sudo systemctl status telecrm
```

### 备份策略

#### 自动备份脚本

文件: `backup.sh`

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/telecrm"
DATE=$(date +%Y%m%d_%H%M%S)
DB_FILE="../data/elecrm.db"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
cp $DB_FILE "$BACKUP_DIR/elecrm_$DATE.db"

# 压缩备份
gzip "$BACKUP_DIR/elecrm_$DATE.db"

# 删除 7 天前的备份
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: elecrm_$DATE.db.gz"
```

**设置定时任务**:
```bash
# 编辑 crontab
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /path/to/backup.sh >> /var/log/telecrm/backup.log 2>&1
```

### 更新升级

#### 更新代码
```bash
# 1. 拉取最新代码
git pull origin main

# 2. 备份数据库
cp data/elecrm.db data/elecrm.db.backup.$(date +%Y%m%d)

# 3. 更新依赖
cd frontend && npm install
cd ../backend && pip install -r requirements.txt --upgrade

# 4. 重启服务
sudo systemctl restart telecrm
pm2 restart telecrm-backend
```

### 安全加固

#### 防火墙配置
```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

#### 文件权限
```bash
# 设置合适的权限
sudo chown -R www-data:www-data /var/www/telecrm
sudo chmod -R 755 /var/www/telecrm
sudo chmod 600 /var/www/telecrm/data/*.db
```

---

## 性能优化建议

### 前端优化

1. **启用 CDN**
   - 使用 CDN 加速静态资源
   - Tailwind CSS 可以替换为本地构建版本

2. **代码分割**
   - 使用 React.lazy() 懒加载组件
   - 优化打包体积

3. **缓存策略**
   - 配置 Nginx 静态资源缓存
   - 使用 Service Worker（PWA）

### 后端优化

1. **使用生产 WSGI 服务器**
   - Gunicorn（推荐）
   - uWSGI
   - 不要使用 Flask 内置服务器

2. **数据库优化**
   - 添加索引
   - 使用连接池
   - 考虑迁移到 PostgreSQL

3. **缓存机制**
   - Redis 缓存热点数据
   - 使用 Flask-Caching

---

## 故障排查清单

### 服务无法启动
- [ ] 检查端口占用
- [ ] 检查依赖是否完整安装
- [ ] 查看错误日志
- [ ] 检查文件权限
- [ ] 验证配置文件语法

### 性能问题
- [ ] 检查系统资源使用（CPU、内存、磁盘）
- [ ] 查看慢查询日志
- [ ] 分析网络延迟
- [ ] 检查数据库索引

### 数据丢失
- [ ] 检查备份文件
- [ ] 查看日志记录
- [ ] 验证数据库完整性
- [ ] 检查磁盘空间

---

## 联系支持

- **文档**: [README.md](README.md)
- **API 文档**: [docs/API_DOC.md](docs/API_DOC.md)
- **问题反馈**: GitHub Issues

---

**文档版本**: 1.0
**最后更新**: 2026-01-13
**维护者**: TeleCRM Team
