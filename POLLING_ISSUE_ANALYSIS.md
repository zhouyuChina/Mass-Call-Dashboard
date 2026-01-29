# 前端轮询问题分析报告

**日期：** 2026-01-29
**问题：** 前端持续发送重复的 HTTP GET 请求，形成意外的轮询行为

---

## 📋 问题现象

前端不断重复发送以下 HTTP GET 请求：

1. `GET /api/call-records?page=1&limit=20&recordType=get_curcall_in`
2. `GET /api/call-records/latest/get_peer_status`
3. `GET /api/call-records/latest/cont_controler`

这些请求每隔几秒就会重复一次，形成类似轮询的行为。

---

## 🔍 问题根源分析

### 1. 触发链路

```
WebSocket 事件触发
    ↓
rebuildIntegrationState() 被调用
    ↓
检查 websocketRecordsRef.current 是否为空
    ↓
如果为空，设置 status = 'idle'
    ↓
useEffect 监听到 status 变为 'idle'
    ↓
自动调用 fetchIntegrationData()
    ↓
发起 3 个 HTTP GET 请求
    ↓
可能再次触发 rebuildIntegrationState()
    ↓
循环往复...
```

### 2. 关键代码位置

#### 问题代码 1：状态重置逻辑（1160-1177行）

```typescript
const rebuildIntegrationState = useCallback(
  (syncedAt?: Date) => {
    const webpages = Array.from(websocketRecordsRef.current.values());
    if (webpages.length === 0) {
      setIntegrationState((prev) => ({
        ...prev,
        status: 'idle',  // ⚠️ 问题：重置为 idle 会触发重新获取
        records: [],
        sources: [],
        // ...
      }));
      return;
    }
    // ...
  },
  [rebuildIntegrationState]
);
```

**问题：** 当 `websocketRecordsRef.current` 为空时，状态被重置为 `'idle'`。

#### 问题代码 2：自动触发逻辑（1482-1486行）

```typescript
useEffect(() => {
  if (integrationState.status === 'idle') {
    fetchIntegrationData();  // ⚠️ 只要状态是 idle 就会自动调用
  }
}, [integrationState.status, fetchIntegrationData]);
```

**问题：** 只要状态变为 `'idle'`，就会自动触发数据获取。

#### 问题代码 3：数据获取函数（1252-1306行）

```typescript
const fetchIntegrationData = useCallback(async () => {
  setIntegrationState((prev) => ({
    ...prev,
    status: 'loading',
    error: null
  }));

  try {
    // 1. 获取通话记录列表
    const url = new URL(CALL_RECORDS_URL);
    url.searchParams.set('page', '1');
    url.searchParams.set('limit', '20');
    url.searchParams.set('recordType', 'get_curcall_in');
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' }
    });

    // 2. 并行获取其他两个页面
    const [peerStatusPage, contControllerPage] = await Promise.all([
      fetchLatestCallRecordPage('get_peer_status'),
      fetchLatestCallRecordPage('cont_controler')
    ]);

    // 3. 合并数据并重建状态
    websocketRecordsRef.current = recordMap;
    rebuildIntegrationState(new Date());  // ⚠️ 可能再次触发循环
  } catch (error) {
    // 错误处理
  }
}, [rebuildIntegrationState]);
```

### 3. 触发场景

`rebuildIntegrationState()` 在以下情况被调用：

1. **WebSocket 事件处理**（1214行）
   ```typescript
   const upsertWebsocketRecord = useCallback((record: ApiWebpageRecord) => {
     // ...
     rebuildIntegrationState(syncedAt);
   }, [rebuildIntegrationState]);
   ```

2. **WebSocket 消息处理**（1245行）
   ```typescript
   const handleCallRecordEventPayload = useCallback((payload: unknown) => {
     // ...
     rebuildIntegrationState(new Date());
   }, [rebuildIntegrationState, upsertWebsocketRecord]);
   ```

3. **数据获取完成后**（1295行）
   ```typescript
   const fetchIntegrationData = useCallback(async () => {
     // ...
     rebuildIntegrationState(new Date());
   }, [rebuildIntegrationState]);
   ```

---

## 🎯 问题本质

这是一个 **状态管理的死循环 bug**：

1. WebSocket 或其他事件触发 `rebuildIntegrationState()`
2. 如果此时数据为空（`websocketRecordsRef.current.size === 0`）
3. 状态被重置为 `'idle'`
4. useEffect 检测到 `status === 'idle'`，自动调用 `fetchIntegrationData()`
5. 数据获取后再次调用 `rebuildIntegrationState()`
6. 如果数据仍为空或被清空，回到步骤 2，形成循环

---

## 💡 解决方案

### 方案 1：修改空数据时的状态（推荐）

**修改位置：** `src/components/RealtimePanel.tsx:1166`

```typescript
const rebuildIntegrationState = useCallback(
  (syncedAt?: Date) => {
    const webpages = Array.from(websocketRecordsRef.current.values());
    if (webpages.length === 0) {
      setIntegrationState((prev) => ({
        ...prev,
        status: 'success',  // ✅ 改为 success，避免触发重新获取
        records: [],
        sources: [],
        monitorSummaries: {},
        seatStatuses: {},
        overview: null,
        domainAnalysis: null,
        timeSeries: [],
        lastSyncedAt: syncedAt ?? prev.lastSyncedAt,
        error: null
      }));
      return;
    }
    // ...
  },
  [rebuildIntegrationState]
);
```

**优点：**
- 最小改动
- 逻辑清晰：数据为空也是一种成功状态
- 不会触发自动重新获取

**缺点：**
- 需要确保 UI 能正确处理 `status === 'success' && records.length === 0` 的情况

---

### 方案 2：添加防抖/节流机制

**修改位置：** `src/components/RealtimePanel.tsx:1482-1486`

```typescript
const lastFetchTimeRef = useRef<number>(0);
const MIN_FETCH_INTERVAL = 5000; // 最小间隔 5 秒

useEffect(() => {
  if (integrationState.status === 'idle') {
    const now = Date.now();
    if (now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL) {
      console.log('⏱️ 跳过重复请求，距离上次请求不足 5 秒');
      return;
    }
    lastFetchTimeRef.current = now;
    fetchIntegrationData();
  }
}, [integrationState.status, fetchIntegrationData]);
```

**优点：**
- 即使有 bug 也能限制请求频率
- 作为额外的保护层

**缺点：**
- 治标不治本
- 增加了代码复杂度

---

### 方案 3：移除自动触发逻辑

**修改位置：** 删除 `src/components/RealtimePanel.tsx:1482-1486`

```typescript
// ❌ 删除这段代码
useEffect(() => {
  if (integrationState.status === 'idle') {
    fetchIntegrationData();
  }
}, [integrationState.status, fetchIntegrationData]);
```

改为只在组件挂载时手动调用一次：

```typescript
useEffect(() => {
  fetchIntegrationData();
}, []); // 只在挂载时执行一次
```

**优点：**
- 彻底避免自动触发
- 更可控

**缺点：**
- 如果确实需要在某些情况下自动重新获取数据，需要额外处理

---

### 方案 4：改进数据清空逻辑

检查是什么导致 `websocketRecordsRef.current` 被清空，避免不必要的清空操作。

**需要排查：**
- WebSocket 断线重连时是否清空了数据
- 某些错误处理是否清空了数据
- 是否有其他地方在操作这个 ref

---

## 🔧 推荐实施步骤

### 第一步：立即修复（方案 1）

修改 `rebuildIntegrationState` 中的状态设置：

```typescript
status: 'success',  // 从 'idle' 改为 'success'
```

### 第二步：添加保护（方案 2）

添加防抖机制作为额外保护层。

### 第三步：长期优化

1. 审查所有调用 `rebuildIntegrationState()` 的地方
2. 确保 `websocketRecordsRef.current` 不会被意外清空
3. 考虑重构状态管理逻辑，使用更清晰的状态机模式

---

## 📊 影响评估

### 当前影响

- ❌ 服务器负载增加（频繁的 HTTP 请求）
- ❌ 网络带宽浪费
- ❌ 前端性能下降（频繁的状态更新和重渲染）
- ❌ 可能导致后端 API 限流或拒绝服务

### 修复后预期

- ✅ 只在必要时发起请求（初始化、手动刷新、WebSocket 重连）
- ✅ 减少服务器负载
- ✅ 提升前端性能
- ✅ 更好的用户体验

---

## 🧪 测试建议

修复后需要测试以下场景：

1. **正常流程**
   - [ ] 页面首次加载，数据正常显示
   - [ ] WebSocket 推送新数据，界面正常更新
   - [ ] 手动点击刷新按钮，数据正常刷新

2. **边界情况**
   - [ ] WebSocket 断线重连后的行为
   - [ ] 后端返回空数据时的表现
   - [ ] 后端返回错误时的表现
   - [ ] 长时间运行后的稳定性

3. **性能验证**
   - [ ] 打开浏览器开发者工具 Network 面板
   - [ ] 观察 5-10 分钟，确认没有重复的轮询请求
   - [ ] 只应该看到：
     - 初始加载时的 3 个请求
     - WebSocket 连接
     - 手动刷新时的请求

---

## 📝 相关代码位置

| 文件 | 行号 | 说明 |
|------|------|------|
| `src/components/RealtimePanel.tsx` | 1160-1177 | `rebuildIntegrationState` - 状态重置逻辑 |
| `src/components/RealtimePanel.tsx` | 1252-1306 | `fetchIntegrationData` - 数据获取函数 |
| `src/components/RealtimePanel.tsx` | 1482-1486 | useEffect - 自动触发逻辑 |
| `src/components/RealtimePanel.tsx` | 1214 | WebSocket 事件触发点 1 |
| `src/components/RealtimePanel.tsx` | 1245 | WebSocket 事件触发点 2 |
| `src/components/RealtimePanel.tsx` | 1295 | 数据获取完成触发点 |

---

## 🎓 经验总结

### 问题教训

1. **状态管理要谨慎**：避免状态之间的循环依赖
2. **自动触发要克制**：不要轻易使用 `useEffect` 自动触发副作用
3. **空数据要区分**：区分"未加载"、"加载中"、"加载成功但为空"、"加载失败"
4. **调试要全面**：不仅要看代码，还要看实际的网络请求

### 最佳实践

1. 使用明确的状态机模式
2. 避免在 useEffect 中自动触发数据获取
3. 添加防抖/节流保护
4. 记录详细的日志便于调试
5. 定期检查 Network 面板，及早发现异常请求

---

**文档版本：** 1.0
**作者：** Claude Opus 4.5
**最后更新：** 2026-01-29
