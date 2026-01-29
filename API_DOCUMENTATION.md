# CRM 后端 API 接口文档

**基础 URL**: `http://localhost:9000/api`

**版本**: v0.3

**协议**: HTTP/HTTPS

---

## 目录

1. [插件数据接口](#插件数据接口)
2. [网页数据接口](#网页数据接口)
3. [通话记录接口](#通话记录接口)
4. [统计分析接口](#统计分析接口)
5. [文件访问接口](#文件访问接口)
6. [监控页面](#监控页面)
7. [WebSocket 实时推送](#websocket-实时推送)

---

## 插件数据接口

### 1. 提交插件数据（旧格式）

**描述**: 浏览器插件提交捕获的网页数据和截图

**请求方式**: `POST /api/plugin/submit`

**Content-Type**: `multipart/form-data`

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | ✅ | 网页 URL |
| title | string | ✅ | 网页标题 |
| content | string | ❌ | 网页纯文本内容 |
| htmlContent | string | ❌ | 网页 HTML 内容 |
| metadata | string | ❌ | JSON 格式的元数据 |
| sourcePluginId | string | ❌ | 插件 ID |
| browserType | string | ❌ | 浏览器类型 (chrome/firefox/edge) |
| capturedAt | string | ❌ | 捕获时间 (ISO 8601) |
| screenshot | File | ❌ | 截图文件 (jpeg/png/webp) |

**成功响应**:

```json
{
  "webpageId": "uuid-string",
  "message": "Data received successfully"
}
```

**示例请求**:

```javascript
const formData = new FormData();
formData.append('url', 'https://example.com');
formData.append('title', '示例网页');
formData.append('content', '网页内容...');
formData.append('screenshot', file);

fetch('http://localhost:9000/api/plugin/submit', {
  method: 'POST',
  body: formData
});
```

---

### 2. 提交浏览器请求（新格式 - 代理请求）

**描述**: 插件提交需要代理的请求，服务器代理获取响应体

**请求方式**: `POST /api/plugin/requests`

**Content-Type**: `application/json`

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| dataType | string | ✅ | 固定值 "request" 表示代理请求 |
| requestId | string | ✅ | 请求唯一 ID |
| url | string | ✅ | 目标 URL |
| method | string | ❌ | HTTP 方法 (默认 GET) |
| requestHeaders | array | ❌ | 请求头数组 [{name, value}] |
| requestBody | string | ❌ | 请求体 |
| contentType | string | ❌ | Content-Type |

**requestHeaders 格式**:

```json
[
  {"name": "Cookie", "value": "PHPSESSID=abc123..."},
  {"name": "User-Agent", "value": "Mozilla/5.0..."},
  {"name": "Referer", "value": "http://example.com"}
]
```

**成功响应**:

```json
{
  "success": true,
  "message": "代理请求成功",
  "webpageId": "uuid-string",
  "statusCode": 200,
  "responseBody": "响应内容...",
  "responseHeaders": {
    "content-type": "text/html; charset=utf-8",
    "server": "nginx"
  }
}
```

**失败响应**:

```json
{
  "success": false,
  "error": "请求失败: Connection timeout"
}
```

**示例请求**:

```javascript
fetch('http://localhost:9000/api/plugin/requests', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    dataType: 'request',
    requestId: 'unique-id-12345',
    url: 'http://example.com/api/data',
    method: 'GET',
    requestHeaders: [
      {name: 'Cookie', value: document.cookie},
      {name: 'User-Agent', value: navigator.userAgent}
    ]
  })
})
.then(res => res.json())
.then(data => {
  console.log('响应体:', data.responseBody);
  console.log('状态码:', data.statusCode);
});
```

---

### 3. 提交浏览器请求（旧格式）

**描述**: 插件直接提交已捕获的请求和响应数据

**请求方式**: `POST /api/plugin/requests`

**Content-Type**: `application/json`

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | ✅ | 请求 URL |
| method | string | ❌ | HTTP 方法 |
| statusCode | number | ❌ | 状态码 |
| timestamp | string | ❌ | 时间戳 |
| requestHeaders | object | ❌ | 请求头对象 |
| responseHeaders | object | ❌ | 响应头对象 |
| requestBody | string | ❌ | 请求体 |
| responseBody | string | ❌ | 响应体 |

**成功响应**:

```json
{
  "success": true,
  "message": "请求已接收",
  "webpageId": "uuid-string"
}
```

**跳过响应** (无有效数据时):

```json
{
  "success": true,
  "message": "请求已接收，但无数据需要存储",
  "skipped": true
}
```

---

### 4. 直接代理请求

**描述**: 直接发起代理请求（不推荐，建议使用 `/api/plugin/requests` 新格式）

**请求方式**: `POST /api/plugin/proxy`

**Content-Type**: `application/json`

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | ✅ | 目标 URL |
| method | string | ❌ | HTTP 方法 (默认 GET) |
| headers | object | ❌ | 请求头对象 |
| body | string | ❌ | 请求体 |
| contentType | string | ❌ | Content-Type |

**成功响应**: 同上

---

## 网页数据接口

### 1. 获取网页列表

**描述**: 分页查询网页记录

**请求方式**: `GET /api/webpage`

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | ❌ | 1 | 页码 |
| limit | number | ❌ | 10 | 每页数量 |
| domain | string | ❌ | - | 域名筛选 |
| keyword | string | ❌ | - | 关键词搜索 |
| startDate | string | ❌ | - | 开始日期 (YYYY-MM-DD) |
| endDate | string | ❌ | - | 结束日期 (YYYY-MM-DD) |

**成功响应**:

```json
{
  "data": [
    {
      "id": "uuid-string",
      "url": "https://example.com",
      "title": "示例网页",
      "content": "纯文本内容...",
      "htmlContent": "<html>...</html>",
      "domain": "example.com",
      "metadata": {
        "description": "...",
        "statusCode": 200,
        "requestMethod": "GET"
      },
      "sourcePluginId": "browser-extension-proxy",
      "browserType": "chrome",
      "createdAt": "2026-01-09T12:00:00.000Z",
      "updatedAt": "2026-01-09T12:00:00.000Z",
      "capturedAt": "2026-01-09T12:00:00.000Z"
    }
  ],
  "meta": {
    "total": 303,
    "page": 1,
    "limit": 10,
    "totalPages": 31
  }
}
```

**示例请求**:

```javascript
// 获取第1页，每页20条
fetch('http://localhost:9000/api/webpage?page=1&limit=20')
  .then(res => res.json())
  .then(data => console.log(data));

// 按域名筛选
fetch('http://localhost:9000/api/webpage?domain=example.com')
  .then(res => res.json());

// 关键词搜索
fetch('http://localhost:9000/api/webpage?keyword=登录')
  .then(res => res.json());

// 日期范围查询
fetch('http://localhost:9000/api/webpage?startDate=2026-01-01&endDate=2026-01-10')
  .then(res => res.json());
```

---

### 2. 获取单个网页详情

**描述**: 根据 ID 获取网页完整信息

**请求方式**: `GET /api/webpage/:id`

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 网页 UUID |

**成功响应**:

```json
{
  "id": "uuid-string",
  "url": "https://example.com",
  "title": "示例网页",
  "content": "纯文本内容...",
  "htmlContent": "<html>...</html>",
  "domain": "example.com",
  "metadata": {
    "description": "...",
    "statusCode": 200,
    "requestMethod": "GET",
    "requestHeaders": {
      "Cookie": "...",
      "User-Agent": "..."
    },
    "responseHeaders": {
      "content-type": "text/html"
    }
  },
  "sourcePluginId": "browser-extension-proxy",
  "browserType": "chrome",
  "createdAt": "2026-01-09T12:00:00.000Z",
  "updatedAt": "2026-01-09T12:00:00.000Z",
  "capturedAt": "2026-01-09T12:00:00.000Z"
}
```

**错误响应** (404):

```json
{
  "statusCode": 404,
  "message": "Webpage not found"
}
```

**示例请求**:

```javascript
fetch('http://localhost:9000/api/webpage/4c9c6199-6662-49cf-82e3-4901808bd624')
  .then(res => res.json())
  .then(webpage => {
    console.log('URL:', webpage.url);
    console.log('响应体:', webpage.content || webpage.htmlContent);
  });
```

---

### 3. 删除网页记录

**描述**: 根据 ID 删除网页记录

**请求方式**: `DELETE /api/webpage/:id`

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 网页 UUID |

**成功响应**: HTTP 204 No Content (无响应体)

**错误响应** (404):

```json
{
  "statusCode": 404,
  "message": "Webpage not found"
}
```

**示例请求**:

```javascript
fetch('http://localhost:9000/api/webpage/uuid-string', {
  method: 'DELETE'
})
.then(res => {
  if (res.status === 204) {
    console.log('删除成功');
  }
});
```

---

## 通话记录接口

### 1. 获取通话记录列表

**描述**: 分页查询通话记录

**请求方式**: `GET /api/call-records`

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | ❌ | 1 | 页码 |
| limit | number | ❌ | 10 | 每页数量 |
| recordType | string | ❌ | - | 记录类型筛选 |
| startDate | string | ❌ | - | 开始日期 (YYYY-MM-DD) |
| endDate | string | ❌ | - | 结束日期 (YYYY-MM-DD) |

**recordType 可选值**:
- `get_curcall_in` - 呼入通话记录
- `get_curcall_out` - 呼出通话记录
- `get_peer_status` - 对端状态记录
- `cont_controler` - 控制器记录

**成功响应**:

```json
{
  "data": [
    {
      "id": "uuid-string",
      "recordType": "get_curcall_in",
      "url": "http://example.com/api/get_curcall_in",
      "requestBody": "",
      "responseBody": "<html>...</html>",
      "parsedData": {
        "calls": [
          {
            "calledNumber": "1001",
            "callbackNumber": "13800138000",
            "callStatus": "通话中",
            "startTime": "2026-01-29 22:26:19",
            "duration": "00:00:15"
          }
        ]
      },
      "dataHash": "abc123...",
      "statusCode": 200,
      "status": "active",
      "lastUpdateTime": "2026-01-29T14:26:34.000Z",
      "metadata": {
        "requestMethod": "GET",
        "uniqueKey": "1001-13800138000"
      },
      "createdAt": "2026-01-29T14:26:19.000Z",
      "updatedAt": "2026-01-29T14:26:34.000Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

**示例请求**:

```javascript
// 获取第1页，每页20条
fetch('http://localhost:9000/api/call-records?page=1&limit=20')
  .then(res => res.json())
  .then(data => console.log(data));

// 按记录类型筛选
fetch('http://localhost:9000/api/call-records?recordType=get_curcall_in')
  .then(res => res.json());

// 日期范围查询
fetch('http://localhost:9000/api/call-records?startDate=2026-01-01&endDate=2026-01-31')
  .then(res => res.json());
```

---

### 2. 获取单条通话记录详情

**描述**: 根据 ID 获取通话记录完整信息

**请求方式**: `GET /api/call-records/:id`

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 通话记录 UUID |

**成功响应**:

```json
{
  "id": "uuid-string",
  "recordType": "get_curcall_in",
  "url": "http://example.com/api/get_curcall_in",
  "requestBody": "",
  "responseBody": "<html>...</html>",
  "parsedData": {
    "calls": [
      {
        "calledNumber": "1001",
        "callbackNumber": "13800138000",
        "callStatus": "通话中",
        "startTime": "2026-01-29 22:26:19",
        "duration": "00:00:15"
      }
    ]
  },
  "dataHash": "abc123...",
  "statusCode": 200,
  "status": "active",
  "lastUpdateTime": "2026-01-29T14:26:34.000Z",
  "metadata": {
    "requestMethod": "GET",
    "uniqueKey": "1001-13800138000"
  },
  "createdAt": "2026-01-29T14:26:19.000Z",
  "updatedAt": "2026-01-29T14:26:34.000Z"
}
```

**错误响应** (404):

```json
{
  "statusCode": 404,
  "message": "Record with ID xxx not found"
}
```

**示例请求**:

```javascript
fetch('http://localhost:9000/api/call-records/4c9c6199-6662-49cf-82e3-4901808bd624')
  .then(res => res.json())
  .then(record => {
    console.log('通话记录:', record);
    console.log('解析数据:', record.parsedData);
  });
```

---

### 3. 获取指定类型的最新记录

**描述**: 获取指定 recordType 的最新一条记录

**请求方式**: `GET /api/call-records/latest/:recordType`

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| recordType | string | ✅ | 记录类型 |

**recordType 可选值**:
- `get_curcall_in`
- `get_curcall_out`
- `get_peer_status`
- `cont_controler`

**成功响应**:

```json
{
  "id": "uuid-string",
  "recordType": "get_curcall_in",
  "url": "http://example.com/api/get_curcall_in",
  "parsedData": {
    "calls": [
      {
        "calledNumber": "1001",
        "callbackNumber": "13800138000",
        "callStatus": "通话中",
        "startTime": "2026-01-29 22:26:19",
        "duration": "00:00:15"
      }
    ]
  },
  "status": "active",
  "lastUpdateTime": "2026-01-29T14:26:34.000Z",
  "createdAt": "2026-01-29T14:26:19.000Z"
}
```

**错误响应** (404):

```json
{
  "statusCode": 404,
  "message": "No records found for type: get_curcall_in"
}
```

**示例请求**:

```javascript
// 获取最新的呼入通话记录
fetch('http://localhost:9000/api/call-records/latest/get_curcall_in')
  .then(res => res.json())
  .then(record => {
    console.log('最新呼入通话:', record.parsedData);
  });

// 获取最新的对端状态
fetch('http://localhost:9000/api/call-records/latest/get_peer_status')
  .then(res => res.json())
  .then(record => {
    console.log('最新对端状态:', record.parsedData);
  });
```

---

### 4. 获取通话统计信息

**描述**: 获取通话记录的统计数据

**请求方式**: `GET /api/call-records/statistics`

**成功响应**:

```json
{
  "total": 150,
  "byType": {
    "get_curcall_in": 50,
    "get_curcall_out": 45,
    "get_peer_status": 30,
    "cont_controler": 25
  },
  "byStatus": {
    "active": 5,
    "ended": 145
  },
  "todayCount": 20,
  "activeCallsCount": 5
}
```

**示例请求**:

```javascript
fetch('http://localhost:9000/api/call-records/statistics')
  .then(res => res.json())
  .then(stats => {
    console.log('总记录数:', stats.total);
    console.log('活跃通话数:', stats.activeCallsCount);
    console.log('今日记录数:', stats.todayCount);
  });
```

---

### 5. 删除通话记录

**描述**: 根据 ID 删除通话记录

**请求方式**: `DELETE /api/call-records/:id`

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 通话记录 UUID |

**成功响应**:

```json
{
  "message": "通话记录已删除"
}
```

**错误响应** (404):

```json
{
  "statusCode": 404,
  "message": "Record with ID xxx not found"
}
```

**示例请求**:

```javascript
fetch('http://localhost:9000/api/call-records/uuid-string', {
  method: 'DELETE'
})
.then(res => res.json())
.then(result => {
  console.log(result.message);
});
```

---

## 统计分析接口

### 1. 概览统计

**描述**: 获取整体数据概览

**请求方式**: `GET /api/statistics/overview`

**成功响应**:

```json
{
  "totalWebpages": 303,
  "totalDomains": 15,
  "todayCount": 158,
  "weekCount": 303,
  "averagePerDay": 43.3
}
```

**示例请求**:

```javascript
fetch('http://localhost:9000/api/statistics/overview')
  .then(res => res.json())
  .then(stats => {
    console.log('总记录数:', stats.totalWebpages);
    console.log('今日新增:', stats.todayCount);
  });
```

---

### 2. 域名分析

**描述**: 按域名统计访问次数

**请求方式**: `GET /api/statistics/domain-analysis`

**成功响应**:

```json
{
  "domains": [
    {
      "domain": "203.175.165.11",
      "count": 303,
      "percentage": 100
    }
  ]
}
```

**示例请求**:

```javascript
fetch('http://localhost:9000/api/statistics/domain-analysis')
  .then(res => res.json())
  .then(data => {
    data.domains.forEach(d => {
      console.log(`${d.domain}: ${d.count} 次 (${d.percentage}%)`);
    });
  });
```

---

### 3. 时间序列分析

**描述**: 获取指定时间范围内的访问趋势

**请求方式**: `GET /api/statistics/time-series`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | ❌ | 开始日期 (YYYY-MM-DD) |
| endDate | string | ❌ | 结束日期 (YYYY-MM-DD) |

**成功响应**:

```json
{
  "timeSeries": [
    {
      "date": "2026-01-09",
      "count": 303
    }
  ]
}
```

**示例请求**:

```javascript
fetch('http://localhost:9000/api/statistics/time-series?startDate=2026-01-01&endDate=2026-01-10')
  .then(res => res.json())
  .then(data => {
    data.timeSeries.forEach(t => {
      console.log(`${t.date}: ${t.count} 条记录`);
    });
  });
```

---

## 文件访问接口

### 1. 获取截图

**描述**: 访问上传的截图文件

**请求方式**: `GET /api/files/:folder/:filename`

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| folder | string | ✅ | 文件夹名 (如 screenshots) |
| filename | string | ✅ | 文件名 |

**成功响应**: 返回图片文件流

**示例请求**:

```html
<!-- 在 HTML 中直接使用 -->
<img src="http://localhost:9000/api/files/screenshots/screenshot-uuid.png" />
```

---

## 监控页面

### 访问监控面板

**描述**: 实时监控插件请求状态

**请求方式**: `GET /api/monitor`

**访问地址**: [http://localhost:9000/api/monitor](http://localhost:9000/api/monitor)

**功能**:
- 📊 实时显示请求统计（总数、成功、失败、跳过、成功率）
- 📋 展示最近 100 条请求
- 📄 查看每个请求的响应体
- 🔗 WebSocket 实时更新

---

## WebSocket 实时推送

### 连接信息

**命名空间**: `/ws`

**连接地址**: `ws://localhost:9000/ws`

**示例连接**:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:9000/ws');

socket.on('connect', () => {
  console.log('✅ WebSocket 已连接');
});

socket.on('disconnect', () => {
  console.log('❌ WebSocket 已断开');
});
```

---

### 事件列表

#### 1. 客户端事件（发送）

##### 订阅网页更新

```javascript
socket.emit('subscribe:webpage');
```

##### 取消订阅网页更新

```javascript
socket.emit('unsubscribe:webpage');
```

##### 订阅通话记录更新

```javascript
socket.emit('subscribe:call-records');
```

##### 取消订阅通话记录更新

```javascript
socket.emit('unsubscribe:call-records');
```

---

#### 2. 服务器事件（接收）

##### 网页创建事件

**事件名**: `webpage:created`

**数据格式**:

```javascript
socket.on('webpage:created', (data) => {
  console.log('新网页:', data);
  // data 包含完整的网页记录
});
```

**数据结构**:

```json
{
  "id": "uuid-string",
  "url": "https://example.com",
  "title": "网页标题",
  "content": "...",
  "domain": "example.com",
  "createdAt": "2026-01-09T12:00:00.000Z"
}
```

##### 网页删除事件

**事件名**: `webpage:deleted`

**数据格式**:

```javascript
socket.on('webpage:deleted', (data) => {
  console.log('删除网页 ID:', data.id);
});
```

**数据结构**:

```json
{
  "id": "uuid-string"
}
```

##### 请求接收事件

**事件名**: `request:received`

**数据格式**:

```javascript
socket.on('request:received', (data) => {
  console.log('收到请求:', data);
});
```

**数据结构**:

```json
{
  "id": "request-uuid",
  "url": "http://example.com/api/data",
  "method": "GET",
  "timestamp": "2026-01-09T12:00:00.000Z",
  "status": "processing"
}
```

##### 请求处理完成事件

**事件名**: `request:processed`

**数据格式**:

```javascript
socket.on('request:processed', (data) => {
  console.log('请求处理完成:', data);

  if (data.status === 'success') {
    console.log('响应体:', data.responseBody);
    console.log('状态码:', data.statusCode);
  } else {
    console.error('错误:', data.error);
  }
});
```

**成功数据结构**:

```json
{
  "id": "request-uuid",
  "url": "http://example.com/api/data",
  "method": "GET",
  "status": "success",
  "message": "代理请求成功，状态码: 200",
  "webpageId": "webpage-uuid",
  "responseBody": "响应内容...",
  "statusCode": 200
}
```

**失败数据结构**:

```json
{
  "id": "request-uuid",
  "url": "http://example.com/api/data",
  "method": "GET",
  "status": "error",
  "error": "请求超时"
}
```

**跳过数据结构**:

```json
{
  "id": "request-uuid",
  "url": "http://example.com/api/data",
  "method": "GET",
  "status": "success",
  "message": "请求已接收，但无数据需要存储",
  "skipped": true
}
```

##### 统计更新事件

**事件名**: `statistics:updated`

**数据格式**:

```javascript
socket.on('statistics:updated', (data) => {
  console.log('统计数据更新:', data);
});
```

---

##### 通话记录创建事件

**事件名**: `call-record:created`

**触发时机**: 新通话记录创建时（首次接收到通话数据）

**数据格式**:

```javascript
socket.on('call-record:created', (data) => {
  console.log('新通话记录:', data);
  // 显示新通话通知
  showNotification(`新通话: ${data.parsedData.calls[0]?.calledNumber}`);
});
```

**数据结构**:

```json
{
  "id": "uuid-string",
  "recordType": "get_curcall_in",
  "url": "http://example.com/api/get_curcall_in",
  "parsedData": {
    "calls": [
      {
        "calledNumber": "1001",
        "callbackNumber": "13800138000",
        "callStatus": "通话中",
        "startTime": "2026-01-29 22:26:19",
        "duration": "00:00:05"
      }
    ]
  },
  "timestamp": "2026-01-29T14:26:19.000Z"
}
```

---

##### 通话记录更新事件

**事件名**: `call-record:updated`

**触发时机**: 通话记录更新时（通话时长持续更新）

**数据格式**:

```javascript
socket.on('call-record:updated', (data) => {
  console.log('通话记录更新:', data);
  // 更新 UI 中的通话时长
  updateCallDuration(data.id, data.parsedData.calls[0]?.duration);
});
```

**数据结构**:

```json
{
  "id": "uuid-string",
  "recordType": "get_curcall_in",
  "url": "http://example.com/api/get_curcall_in",
  "parsedData": {
    "calls": [
      {
        "calledNumber": "1001",
        "callbackNumber": "13800138000",
        "callStatus": "通话中",
        "startTime": "2026-01-29 22:26:19",
        "duration": "00:00:15"
      }
    ]
  },
  "status": "active",
  "timestamp": "2026-01-29T14:26:34.000Z"
}
```

---

##### 通话状态变更事件

**事件名**: `call-status:changed`

**触发时机**: 通话状态变更时（通话结束）

**数据格式**:

```javascript
socket.on('call-status:changed', (data) => {
  console.log('通话状态变更:', data);

  if (data.status === 'ended') {
    // 显示通话结束通知
    showNotification(`通话已结束: ${data.parsedData.calls[0]?.calledNumber}`);
    // 更新 UI 状态
    markCallAsEnded(data.id);
  }
});
```

**数据结构**:

```json
{
  "id": "uuid-string",
  "recordType": "get_curcall_in",
  "status": "ended",
  "parsedData": {
    "calls": [
      {
        "calledNumber": "1001",
        "callbackNumber": "13800138000",
        "callStatus": "通话中",
        "startTime": "2026-01-29 22:26:19",
        "duration": "00:00:15"
      }
    ]
  },
  "timestamp": "2026-01-29T14:26:37.000Z"
}
```

---

### 完整 WebSocket 使用示例

#### 示例 1: 监听网页数据更新

```javascript
import io from 'socket.io-client';

// 连接 WebSocket
const socket = io('http://localhost:9000/ws');

// 监听连接状态
socket.on('connect', () => {
  console.log('✅ WebSocket 已连接');

  // 订阅网页更新
  socket.emit('subscribe:webpage');
});

socket.on('disconnect', () => {
  console.log('❌ WebSocket 已断开');
});

// 监听网页创建事件
socket.on('webpage:created', (webpage) => {
  console.log('📄 新网页创建:', {
    url: webpage.url,
    title: webpage.title,
    time: webpage.createdAt
  });

  // 更新 UI，添加新记录到列表
  addWebpageToList(webpage);
});

// 监听请求接收
socket.on('request:received', (request) => {
  console.log('📥 收到新请求:', request.url);

  // 显示加载状态
  showLoadingState(request.id);
});

// 监听请求处理完成
socket.on('request:processed', (result) => {
  console.log('✅ 请求处理完成:', result.url);

  if (result.status === 'success' && !result.skipped) {
    console.log('状态码:', result.statusCode);
    console.log('响应体长度:', result.responseBody?.length);

    // 更新 UI，显示响应数据
    updateRequestStatus(result.id, {
      status: 'success',
      statusCode: result.statusCode,
      responseBody: result.responseBody
    });
  } else if (result.skipped) {
    console.log('⏭️ 请求被跳过');
    updateRequestStatus(result.id, { status: 'skipped' });
  } else {
    console.error('❌ 请求失败:', result.error);
    updateRequestStatus(result.id, {
      status: 'error',
      error: result.error
    });
  }
});

// 监听网页删除
socket.on('webpage:deleted', (data) => {
  console.log('🗑️ 网页已删除:', data.id);

  // 从 UI 中移除记录
  removeWebpageFromList(data.id);
});
```

---

#### 示例 2: 监听通话记录实时更新

```javascript
import io from 'socket.io-client';

// 连接 WebSocket
const socket = io('http://localhost:9000/ws');

// 存储活跃通话
const activeCalls = new Map();

socket.on('connect', () => {
  console.log('✅ WebSocket 已连接');

  // 订阅通话记录更新
  socket.emit('subscribe:call-records');
});

// 监听新通话创建
socket.on('call-record:created', (data) => {
  console.log('📞 新通话创建:', data);

  // 添加到活跃通话列表
  activeCalls.set(data.id, {
    ...data,
    status: 'active'
  });

  // 显示通知
  const call = data.parsedData?.calls?.[0];
  if (call) {
    showNotification({
      title: '新来电',
      message: `被叫号码: ${call.calledNumber}`,
      type: 'info'
    });
  }

  // 更新 UI
  renderCallList(Array.from(activeCalls.values()));
});

// 监听通话记录更新（通话时长更新）
socket.on('call-record:updated', (data) => {
  console.log('🔄 通话更新:', data);

  // 更新活跃通话列表
  if (activeCalls.has(data.id)) {
    activeCalls.set(data.id, {
      ...data,
      status: data.status
    });

    // 更新 UI 中的通话时长
    const call = data.parsedData?.calls?.[0];
    if (call) {
      updateCallDuration(data.id, call.duration);
    }
  }
});

// 监听通话状态变更（通话结束）
socket.on('call-status:changed', (data) => {
  console.log('🔚 通话状态变更:', data);

  if (data.status === 'ended') {
    // 从活跃通话列表中移除
    const call = activeCalls.get(data.id);
    if (call) {
      activeCalls.delete(data.id);

      // 显示通话结束通知
      const callData = data.parsedData?.calls?.[0];
      if (callData) {
        showNotification({
          title: '通话已结束',
          message: `被叫号码: ${callData.calledNumber}, 时长: ${callData.duration}`,
          type: 'success'
        });
      }

      // 更新 UI
      markCallAsEnded(data.id);
      renderCallList(Array.from(activeCalls.values()));
    }
  }
});

// 监听连接断开
socket.on('disconnect', () => {
  console.log('❌ WebSocket 已断开');
  // 显示断线提示
  showConnectionStatus('disconnected');
});

// 监听重新连接
socket.on('reconnect', () => {
  console.log('🔄 WebSocket 已重连');
  // 重新订阅
  socket.emit('subscribe:call-records');
  showConnectionStatus('connected');
});
```

---

#### 示例 3: React Hook 封装

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface CallRecord {
  id: string;
  recordType: string;
  parsedData: {
    calls: Array<{
      calledNumber: string;
      callbackNumber: string;
      callStatus: string;
      startTime: string;
      duration: string;
    }>;
  };
  status: 'active' | 'ended';
  timestamp: string;
}

export function useCallRecords() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeCalls, setActiveCalls] = useState<Map<string, CallRecord>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 创建 WebSocket 连接
    const newSocket = io('http://localhost:9000/ws');

    newSocket.on('connect', () => {
      console.log('✅ WebSocket 已连接');
      setIsConnected(true);
      newSocket.emit('subscribe:call-records');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket 已断开');
      setIsConnected(false);
    });

    // 监听通话创建
    newSocket.on('call-record:created', (data: CallRecord) => {
      console.log('📞 新通话:', data);
      setActiveCalls(prev => {
        const newCalls = new Map(prev);
        newCalls.set(data.id, { ...data, status: 'active' });
        return newCalls;
      });
    });

    // 监听通话更新
    newSocket.on('call-record:updated', (data: CallRecord) => {
      console.log('🔄 通话更新:', data);
      setActiveCalls(prev => {
        const newCalls = new Map(prev);
        if (newCalls.has(data.id)) {
          newCalls.set(data.id, data);
        }
        return newCalls;
      });
    });

    // 监听通话状态变更
    newSocket.on('call-status:changed', (data: CallRecord) => {
      console.log('🔚 通话状态变更:', data);
      if (data.status === 'ended') {
        setActiveCalls(prev => {
          const newCalls = new Map(prev);
          newCalls.delete(data.id);
          return newCalls;
        });
      }
    });

    setSocket(newSocket);

    // 清理函数
    return () => {
      newSocket.emit('unsubscribe:call-records');
      newSocket.disconnect();
    };
  }, []);

  return {
    socket,
    isConnected,
    activeCalls: Array.from(activeCalls.values()),
    activeCallsCount: activeCalls.size
  };
}

// 使用示例
function CallRecordList() {
  const { activeCalls, isConnected, activeCallsCount } = useCallRecords();

  return (
    <div>
      <div className="header">
        <h2>活跃通话 ({activeCallsCount})</h2>
        <span className={isConnected ? 'connected' : 'disconnected'}>
          {isConnected ? '已连接' : '未连接'}
        </span>
      </div>

      <table>
        <thead>
          <tr>
            <th>被叫号码</th>
            <th>回拨号码</th>
            <th>状态</th>
            <th>开始时间</th>
            <th>通话时长</th>
          </tr>
        </thead>
        <tbody>
          {activeCalls.map(call => {
            const callData = call.parsedData?.calls?.[0];
            if (!callData) return null;

            return (
              <tr key={call.id} className={call.status}>
                <td>{callData.calledNumber}</td>
                <td>{callData.callbackNumber}</td>
                <td>{callData.callStatus}</td>
                <td>{callData.startTime}</td>
                <td>{callData.duration}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 错误处理

### HTTP 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 204 | 删除成功（无内容） |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 错误响应格式

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

---

## 数据结构说明

### Webpage 对象

```typescript
{
  id: string;                 // UUID
  url: string;                // 网页 URL
  title: string;              // 网页标题
  content: string;            // 纯文本内容或 JSON 数据
  htmlContent: string;        // HTML 内容
  domain: string;             // 域名
  metadata: {                 // 元数据
    description?: string;
    statusCode?: number;
    requestMethod?: string;
    requestHeaders?: object;
    responseHeaders?: object;
    proxied?: boolean;
  };
  sourcePluginId: string;     // 来源插件 ID
  browserType: string;        // 浏览器类型
  createdAt: Date;            // 创建时间
  updatedAt: Date;            // 更新时间
  capturedAt: Date;           // 捕获时间
}
```

---

### CallRecord 对象

```typescript
{
  id: string;                 // UUID
  recordType: string;         // 记录类型 (get_curcall_in | get_curcall_out | get_peer_status | cont_controler)
  url: string;                // 原始请求 URL
  requestBody: string;        // 请求体内容
  responseBody: string;       // 响应体内容（原始 HTML 或 JSON）
  parsedData: {               // 解析后的结构化数据
    calls?: Array<{           // 通话数据数组（仅 get_curcall_in 和 get_curcall_out）
      calledNumber: string;   // 被叫号码
      callbackNumber: string; // 回拨号码
      callerNumber?: string;  // 主叫号码（仅 get_curcall_out）
      callStatus: string;     // 呼叫状态
      startTime: string;      // 开始时间
      duration: string;       // 通话时长 (格式: HH:MM:SS)
    }>;
    // 其他类型的数据结构...
  };
  dataHash: string;           // MD5 哈希值（用于变更检测）
  statusCode: number;         // HTTP 状态码
  status: string;             // 通话状态 (active | ended)
  lastUpdateTime: Date;       // 最后更新时间
  metadata: {                 // 元数据
    requestMethod?: string;   // 请求方法
    uniqueKey?: string;       // 唯一键（用于 UPSERT）
  };
  createdAt: Date;            // 创建时间
  updatedAt: Date;            // 更新时间
}
```

---

## 最佳实践

### 1. 使用代理请求获取响应体

**推荐方式**：

```javascript
// ✅ 推荐：使用新格式代理请求
fetch('http://localhost:9000/api/plugin/requests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dataType: 'request',  // 标识为代理请求
    requestId: 'unique-id',
    url: targetUrl,
    method: 'GET',
    requestHeaders: [
      {name: 'Cookie', value: cookieString},
      {name: 'User-Agent', value: navigator.userAgent}
    ]
  })
});
```

**不推荐方式**：

```javascript
// ❌ 不推荐：旧格式无法获取响应体
fetch('http://localhost:9000/api/plugin/requests', {
  method: 'POST',
  body: JSON.stringify({
    url: targetUrl,
    requestBody: '...',
    responseBody: '...'  // 插件可能获取不到
  })
});
```

### 2. 实时监控请求状态

使用 WebSocket 实时接收请求处理结果：

```javascript
const socket = io('http://localhost:9000/ws');

// 发送请求
const requestId = generateUniqueId();
fetch('/api/plugin/requests', {
  method: 'POST',
  body: JSON.stringify({
    dataType: 'request',
    requestId: requestId,
    // ...
  })
});

// 监听处理结果
socket.on('request:processed', (result) => {
  if (result.id === requestId) {
    console.log('我的请求完成了:', result.responseBody);
  }
});
```

### 3. 分页查询优化

```javascript
// ✅ 推荐：使用分页
fetch('/api/webpage?page=1&limit=20')

// ❌ 避免：不带分页参数（默认只返回10条）
fetch('/api/webpage')
```

### 4. Cookie 传递

确保在代理请求中正确传递 Cookie：

```javascript
// 在浏览器插件中获取 Cookie
const cookies = await chrome.cookies.getAll({ url: targetUrl });
const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

// 发送到后端
requestHeaders: [
  {name: 'Cookie', value: cookieString}
]
```

---

### 5. 通话记录实时监控

使用 WebSocket 实时监听通话状态变化：

```javascript
const socket = io('http://localhost:9000/ws');

// 订阅通话记录更新
socket.emit('subscribe:call-records');

// 监听新通话
socket.on('call-record:created', (data) => {
  console.log('新通话:', data.parsedData.calls[0]);
  // 显示通知、更新 UI
});

// 监听通话更新（时长变化）
socket.on('call-record:updated', (data) => {
  console.log('通话时长更新:', data.parsedData.calls[0].duration);
  // 更新 UI 中的时长显示
});

// 监听通话结束
socket.on('call-status:changed', (data) => {
  if (data.status === 'ended') {
    console.log('通话已结束');
    // 显示结束通知、更新 UI 状态
  }
});
```

---

### 6. 通话记录查询优化

```javascript
// ✅ 推荐：按类型查询最新记录
fetch('/api/call-records/latest/get_curcall_in')
  .then(res => res.json())
  .then(record => {
    // 直接获取最新的呼入通话
  });

// ✅ 推荐：使用分页查询历史记录
fetch('/api/call-records?page=1&limit=20&recordType=get_curcall_in')
  .then(res => res.json());

// ❌ 避免：不带参数查询所有记录
fetch('/api/call-records')  // 默认只返回 10 条
```

---

### 7. 通话状态管理

前端应该维护活跃通话的状态：

```javascript
// 使用 Map 存储活跃通话
const activeCalls = new Map();

// 新通话创建时添加
socket.on('call-record:created', (data) => {
  activeCalls.set(data.id, data);
});

// 通话更新时更新
socket.on('call-record:updated', (data) => {
  if (activeCalls.has(data.id)) {
    activeCalls.set(data.id, data);
  }
});

// 通话结束时移除
socket.on('call-status:changed', (data) => {
  if (data.status === 'ended') {
    activeCalls.delete(data.id);
  }
});
```

---

## 附录

### 环境配置

- **开发环境**: `http://localhost:9000`
- **生产环境**: 根据实际部署配置

### 相关文档

- [插件集成完整文档](./PLUGIN_INTEGRATION_COMPLETE.md)
- [浏览器插件示例](./BROWSER_PLUGIN_EXAMPLE.md)
- [通话记录系统实现方案](./CALL_RECORD_IMPLEMENTATION.md)
- [通话结束检测方案](./CALL_END_DETECTION.md)
- [测试脚本使用说明](./README.md)

### 技术栈

- **后端框架**: NestJS 11
- **数据库**: PostgreSQL
- **实时通信**: Socket.IO
- **ORM**: TypeORM

---

**最后更新**: 2026-01-29

**维护者**: CRM 开发团队
