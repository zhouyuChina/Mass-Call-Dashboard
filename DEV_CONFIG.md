# 开发环境配置说明

## 配置组合说明

### 推荐配置

#### 1. 快速开发模式（推荐）✅
```bash
VITE_ENABLE_MOCK=true          # 启用 mock 数据
VITE_DEV_AUTO_LOGIN=true       # 启用自动登录
```
**效果**：
- ✅ 自动登录，无需输入账号密码
- ✅ 使用 mock 数据，无需后端
- ✅ 快速开发和调试

**适用场景**：
- 前端功能开发
- UI/UX 调试
- 无后端环境时

---

#### 2. 测试登录功能
```bash
VITE_ENABLE_MOCK=true          # 启用 mock 数据
VITE_DEV_AUTO_LOGIN=false      # 禁用自动登录
```
**效果**：
- ✅ 显示登录页面
- ✅ 可以测试登录流程
- ✅ 使用 mock 账号：`manage@gmail.com` / `1234`

**适用场景**：
- 测试登录功能
- 调试登录页面
- 验证登录流程

---

#### 3. 连接真实后端
```bash
VITE_ENABLE_MOCK=false         # 禁用 mock 数据
VITE_DEV_AUTO_LOGIN=false      # 禁用自动登录
```
**效果**：
- ✅ 使用真实后端 API
- ✅ 真实登录流程
- ✅ 真实数据

**适用场景**：
- 后端联调
- 集成测试
- 准生产环境测试

---

### ⚠️ 错误配置

#### 错误配置 1：Mock 禁用 + 自动登录启用 ❌
```bash
VITE_ENABLE_MOCK=false         # 禁用 mock 数据
VITE_DEV_AUTO_LOGIN=true       # 启用自动登录
```
**问题**：
- ❌ 没有 mock 操作员数据
- ❌ 自动登录失败
- ❌ 卡在登录页面

**控制台错误**：
```
⚠️ 自动登录失败: 没有可用的操作员数据
💡 提示: 请设置 VITE_ENABLE_MOCK=true 启用 mock 数据
```

**解决方案**：
- 方案 A：设置 `VITE_ENABLE_MOCK=true`
- 方案 B：设置 `VITE_DEV_AUTO_LOGIN=false`

---

## 配置修改步骤

1. **编辑 `.env` 文件**
   ```bash
   # 修改配置
   VITE_ENABLE_MOCK=true
   VITE_DEV_AUTO_LOGIN=true
   ```

2. **重启开发服务器**（重要！）
   ```bash
   # 停止当前服务器 (Ctrl+C)
   # 重新启动
   npm run dev
   ```

3. **查看控制台日志**
   ```
   🔧 Mock 配置: 环境变量强制启用 (VITE_ENABLE_MOCK=true)
   🚀 开发环境自动登录已启用
   🔧 使用 Mock 操作員數據
   🚀 开发环境自动登录: 東南
   ```

---

## Mock 账号信息

当 `VITE_ENABLE_MOCK=true` 时，可用的 mock 账号：

| 字段 | 值 |
|------|-----|
| 用户名 | `manage@gmail.com` |
| 密码 | `1234` |
| 姓名 | 東南 |
| 角色 | 管理員 |

---

## 常见问题

### Q1: 修改 .env 后没有生效？
**A**: 必须重启开发服务器！Vite 只在启动时读取环境变量。

### Q2: 自动登录失败，显示"没有可用的操作员数据"？
**A**: 检查 `VITE_ENABLE_MOCK` 是否设置为 `true`。

### Q3: 想要测试登录功能怎么办？
**A**: 设置 `VITE_DEV_AUTO_LOGIN=false`，使用账号 `manage@gmail.com` / `1234` 登录。

### Q4: 生产环境会自动登录吗？
**A**: 不会！自动登录只在开发环境生效，生产环境自动禁用。

### Q5: 如何连接真实后端？
**A**: 设置 `VITE_ENABLE_MOCK=false` 和 `VITE_DEV_AUTO_LOGIN=false`。

---

## 快速切换配置

### 切换到快速开发模式
```bash
# .env
VITE_ENABLE_MOCK=true
VITE_DEV_AUTO_LOGIN=true
```

### 切换到后端联调模式
```bash
# .env
VITE_ENABLE_MOCK=false
VITE_DEV_AUTO_LOGIN=false
```

记得重启开发服务器！
