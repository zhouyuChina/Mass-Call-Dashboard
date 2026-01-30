# Mock 数据配置说明

## 概述

本项目支持通过配置来控制是否使用 mock 数据，方便在开发和生产环境之间切换。

## 配置方式

### 1. 环境变量配置（推荐）

在 `.env` 文件中设置：

```bash
# 启用 mock 数据
VITE_ENABLE_MOCK=true

# 禁用 mock 数据
VITE_ENABLE_MOCK=false
```

### 2. 默认行为

如果不设置 `VITE_ENABLE_MOCK`，系统会根据环境自动判断：

- **开发环境** (`npm run dev`)：自动启用 mock 数据
- **生产环境** (`npm run build`)：自动禁用 mock 数据

### 3. 运行时配置

可以通过浏览器控制台动态修改配置：

```javascript
// 导入配置函数
import { saveMockConfig } from './mocks';

// 启用操作员 mock 数据
saveMockConfig({ enableOperators: true });

// 禁用座席 mock 数据
saveMockConfig({ enableAgents: false });

// 刷新页面使配置生效
location.reload();
```

## Mock 数据类型

### 1. 操作员数据 (Operators)

- **文件位置**: `src/mocks/operators.ts`
- **配置项**: `enableOperators`
- **包含内容**:
  - 默认管理员账号
  - 用户名: `manage@gmail.com`
  - 密码: `1234`

### 2. 座席数据 (Agents)

- **文件位置**: `src/mocks/agents.ts`
- **配置项**: `enableAgents`
- **包含内容**:
  - 19 个默认座席姓名
  - 座席总数配置 (20)
  - 每行显示座席数 (10)

## 使用场景

### 开发环境

```bash
# 启用 mock 数据进行开发
VITE_ENABLE_MOCK=true npm run dev
```

适用于：
- 本地开发测试
- 前端功能开发
- UI/UX 调试
- 无需后端数据时

### 生产环境

```bash
# 禁用 mock 数据
VITE_ENABLE_MOCK=false npm run build
```

适用于：
- 生产部署
- 连接真实后端 API
- 正式环境运行

## 配置文件说明

### `src/mocks/config.ts`

核心配置文件，包含：

- `ENABLE_MOCK_DATA`: 全局 mock 开关
- `MockConfig`: 配置接口定义
- `getMockConfig()`: 获取当前配置
- `saveMockConfig()`: 保存配置到 localStorage

### `src/mocks/index.ts`

统一导出文件，提供：

- Mock 数据导出
- 配置函数导出
- 类型定义导出

## 注意事项

1. **配置优先级**:
   - localStorage 配置 > 环境变量 > 默认配置

2. **刷新生效**:
   - 修改配置后需要刷新页面才能生效

3. **生产环境**:
   - 建议在生产环境禁用 mock 数据
   - 确保 `.env.production` 中设置 `VITE_ENABLE_MOCK=false`

4. **安全性**:
   - Mock 数据仅用于开发测试
   - 不要在生产环境使用 mock 账号密码

## 示例

### 完全禁用 mock

```bash
# .env
VITE_ENABLE_MOCK=false
```

### 仅启用操作员 mock

```javascript
// 在浏览器控制台执行
localStorage.setItem('mockConfig', JSON.stringify({
  enableOperators: true,
  enableAgents: false
}));
location.reload();
```

### 查看当前配置

```javascript
// 在浏览器控制台执行
import { getMockConfig } from './mocks';
console.log(getMockConfig());
```

## 故障排查

### Mock 数据未生效

1. 检查环境变量配置
2. 清除 localStorage: `localStorage.clear()`
3. 刷新页面
4. 查看控制台日志: `🔧 使用 Mock 操作員數據`

### 无法登录

1. 确认 mock 数据已启用
2. 使用默认账号:
   - 用户名: `manage@gmail.com`
   - 密码: `1234`
3. 检查控制台错误信息
