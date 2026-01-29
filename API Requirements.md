# API Requirements


## 1. 座席顏色/狀態資料源
- **Endpoint**: `get_peer_status.php?` 或 WebSocket 推播。
- **Payload**  
  ```json
  {
    "url": "https://.../get_peer_status.php?...",
    "content": "<font color='green'>綠色-待機</font>,...<br/>...</br>",
    "htmlContent": "...",
    "capturedAt": "2026-01-26T22:45:00Z"
  }
  ```
  - 前端僅解析第一組 `&nbsp;<br/> ... &nbsp;</br>` 之間的 `<font>` 清單；後方段落忽略。
  - 色碼對照：`green→待機`, `red→離線`, `purple→振鈴`, `blue→通話中`, `grey→斷線`。
- **WebSocket 需求**  
  - 連線 `wss://<backend-host>/ws`；前端 `subscribe:peerStatus` 後，後端應定期 (`peerStatus:update`) 推送上述 payload；斷線時提供 `peerStatus:error`。
  - 同時建議保留 `GET /api/peer-status` 作為輪詢備援，回傳內容同上。

## 2. 接通/回撥率資料源
- **Endpoint**: `cont_controler.php?` 或後端整合 API。
- **Payload**  
  ```json
  {
    "url": "https://.../cont_controler.php?...",
    "content": "<table>...<td>接通： 29 % ...</td>...</table>",
    "htmlContent": "...",
    "capturedAt": "..."
  }
  ```
- **解析規則**  
  - 讀 `<table>` 中第 7 欄「接通/回撥」文字，抓取 `接通： <value>%`、`回撥： <value>%`。
  - 若同一頁面有多筆 campaign（流水號 1、2、3...），取所有數值平均後提供給前端。

## 4. WebSocket 行為摘要
- `subscribe:peerStatus`：推送座席色碼 HTML。
- `subscribe:webpage`（既有）：若可行，亦推送通話紀錄 HTML (`get_curcall_in`) 與 `cont_controler` 的統計。
- 斷線後請勿頻繁斷開；如需 server 主動斷線請回傳錯誤事件供前端重試。

## 5. 錯誤處理
- 所有 REST API 使用 HTTP 2xx 表示成功，其餘附帶 `{ "error": "message" }`。
- WebSocket 若遇錯誤，推送 `{ "event": "<topic>:error", "message": "..." }`。
- Payload 欄位不可缺漏；若暫無資料，`content/htmlContent` 仍要回傳空 `<table>`，以便前端顯示「暫無資料」。

---
此文件將提供給後端，作為輸入/輸出的統一規格，以確保前端輪詢與 WebSocket 功能能正確解析座席狀態、接通/回撥率。*** End Patch
