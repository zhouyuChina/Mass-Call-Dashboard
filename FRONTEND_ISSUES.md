# 前端工程问题清单

**日期：** 2026-01-30
**项目：** Mass Call Dashboard (群呼分析儀表板)
**技术栈：** React 18.3.1 + TypeScript + Vite

---

## 📊 问题概览

| 类别 | 问题数 | 优先级 |
|------|--------|--------|
| 架构问题 | 4 | 高 |
| 代码质量 | 3 | 中 |
| 已修复 | 3 | - |

---

## 🔴 架构问题（高优先级）

### 1. 缺少统一的 API 管理层

**问题描述：**
- API 调用分散在组件中，没有统一的封装
- 没有请求/响应拦截器
- 难以统一处理认证、错误码、超时等

**当前状态：**
```typescript
// API 调用直接写在组件中
const response = await fetch(url.toString(), {
  headers: { Accept: 'application/json' }
});
```

**影响：**
- 代码重复
- 维护困难
- 难以统一添加功能（如 token 刷新、请求重试）

**建议改进：**
```typescript
// 创建 src/api/client.ts
export const apiClient = {
  async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }
};

// 创建 src/api/callRecords.ts
export const callRecordsApi = {
  getList: (params) => apiClient.request(`${API_BASE_URL}/call-records`, { params }),
  getLatest: (type) => apiClient.request(`${API_BASE_URL}/call-records/latest/${type}`)
};
```

---

### 2. 组件文件过大，职责不清

**问题描述：**
- `RealtimePanel.tsx` 文件超过 2600 行
- 混合了 UI 渲染、数据处理、状态管理、业务逻辑
- 难以阅读、测试和维护

**当前结构：**
```
RealtimePanel.tsx (2600+ 行)
├── 类型定义 (~200 行)
├── 工具函数 (~300 行)
├── HTML 解析逻辑 (~400 行)
├── 状态管理 (~300 行)
├── WebSocket 处理 (~200 行)
├── 数据处理 (~400 行)
└── UI 渲染 (~800 行)
```

**建议拆分：**
```
src/
├── components/
│   └── RealtimePanel/
│       ├── index.tsx           # 主组件，组装各部分
│       ├── StaffMonitor.tsx    # 人员状态监控
│       ├── StatsCards.tsx      # 统计卡片
│       ├── CallRecordsTable.tsx # 通话记录表格
│       └── SeatStatus.tsx      # 座席状态
├── hooks/
│   ├── useIntegrationState.ts  # 集成状态管理
│   └── useWebSocket.ts         # WebSocket 连接管理
├── services/
│   └── htmlParser.ts           # HTML 解析逻辑
└── types/
    └── callRecords.ts          # 类型定义
```

---

### 3. 缺少环境变量配置文件

**问题描述：**
- 没有 `.env.example` 文件
- 新开发者不知道需要配置哪些环境变量
- 容易遗漏配置导致运行失败

**当前使用的环境变量：**
```typescript
VITE_API_BASE_URL        // API 基础地址
VITE_CALL_DURATION_API   // 通话时长 API（已移除）
```

**建议添加 `.env.example`：**
```bash
# API 配置
VITE_API_BASE_URL=http://localhost:7000/api

# 其他配置（按需添加）
# VITE_WS_URL=ws://localhost:7000/ws
```

---

### 4. 状态管理复杂且分散

**问题描述：**
- 使用多个 useState 和 useRef 管理状态
- 状态之间的依赖关系复杂
- 容易出现状态不同步或循环更新的问题（已修复一个）

**当前状态：**
```typescript
// RealtimePanel.tsx 中的状态（部分）
const [integrationState, setIntegrationState] = useState<IntegrationPanelState>(...);
const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
const callRecordStoreRef = useRef<Map<string, CallRecord>>(new Map());
const websocketRecordsRef = useRef<Map<string, ApiWebpageRecord>>(new Map());
const socketRef = useRef<ReturnType<typeof io> | null>(null);
// ... 还有更多
```

**建议改进：**
考虑使用状态管理库（如 Zustand、Jotai）或 useReducer 来集中管理状态：

```typescript
// 使用 useReducer
type Action =
  | { type: 'SET_LOADING' }
  | { type: 'SET_SUCCESS'; payload: CallRecord[] }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'UPDATE_RECORD'; record: CallRecord };

function integrationReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, status: 'loading' };
    // ...
  }
}
```

---

## 🟡 代码质量问题（中优先级）

### 1. HTML 解析逻辑硬编码

**问题描述：**
- 使用正则表达式解析 HTML 内容
- 解析逻辑与后端数据结构强耦合
- 后端格式变化时需要修改前端代码

**影响：**
- 脆弱的数据解析
- 难以调试和测试
- 维护成本高

**建议：**
- 与后端协商，提供标准的 JSON API
- 如果必须解析 HTML，考虑使用 DOMParser 而非正则

---

### 2. 缺少错误边界

**问题描述：**
- 没有 React Error Boundary
- 组件内部错误可能导致整个应用崩溃

**建议添加：**
```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div>出错了，请刷新页面</div>;
    }
    return this.props.children;
  }
}
```

---

### 3. 未使用的导入和变量

**问题描述：**
- 存在一些未使用的导入（如 `Globe`, `MapPin`, `Wifi` 等）
- 增加了代码体积
- IDE 提示有 lint 警告

**建议：**
- 清理未使用的导入
- 配置 ESLint 规则自动检测

---

## ✅ 已修复的问题

### 1. ~~Electron 依赖无法安装~~ ✅

**提交：** `67b1091`

已移除 Electron 相关依赖和配置，项目现在是纯 Web 应用。

---

### 2. ~~通话时长轮询机制~~ ✅

**提交：** `d059fa7`

已移除 `useCallDurationMonitor` Hook 和 `callDurationService`，后续通过 WebSocket 获取数据。

---

### 3. ~~状态循环导致的无限请求~~ ✅

**提交：** `d8db6e6`

修复了 `rebuildIntegrationState` 中状态重置为 `'idle'` 导致的无限循环问题。

详细分析见：[POLLING_ISSUE_ANALYSIS.md](./POLLING_ISSUE_ANALYSIS.md)

---

## 📁 当前项目结构

```
src/
├── App.tsx                          # 主应用组件
├── main.tsx                         # 入口文件
├── index.css                        # 全局样式
├── components/
│   ├── RealtimePanel.tsx           # ⚠️ 核心组件（过大，需拆分）
│   ├── StatsDashboard.tsx          # 仪表板
│   ├── LoginForm.tsx               # 登录表单
│   ├── StatusBar.tsx               # 状态栏
│   ├── SimpleTopNavigation.tsx     # 顶部导航
│   ├── SystemStatus.tsx            # 系统状态
│   ├── figma/                      # Figma 导出组件
│   └── ui/                         # Radix UI 组件库
├── hooks/                          # ⚠️ 目录已清空（移除了轮询 Hook）
└── utils/
    └── safeToast.ts                # 安全 Toast 系统
```

---

## 🔧 改进优先级建议

### 第一阶段（短期）
1. [ ] 添加 `.env.example` 文件
2. [ ] 清理未使用的导入和变量
3. [ ] 添加 Error Boundary

### 第二阶段（中期）
4. [ ] 创建统一的 API 管理层
5. [ ] 拆分 `RealtimePanel.tsx` 组件

### 第三阶段（长期）
6. [ ] 重构状态管理（考虑使用 Zustand/Jotai）
7. [ ] 与后端协商优化数据接口（减少 HTML 解析）
8. [ ] 添加单元测试

---

## 📊 代码质量指标

| 指标 | 当前值 | 建议值 |
|------|--------|--------|
| 最大文件行数 | 2600+ | < 500 |
| 组件数/文件 | 1 | 1 |
| API 调用位置 | 分散在组件中 | 集中在 api/ 目录 |
| 类型覆盖率 | 部分 | 100% |
| 测试覆盖率 | 0% | > 60% |

---

**文档版本：** 1.0
**作者：** Claude Opus 4.5
**最后更新：** 2026-01-30
