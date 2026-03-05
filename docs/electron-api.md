# Electron 交互 API 说明

本文档汇总目前在渲染进程可用的 Electron 交互方法（通过 `preload` 暴露）。

## 入口

- 全部方法通过 `window.api` 暴露（`contextBridge.exposeInMainWorld`）。
- 渲染进程使用 `ipcRenderer.invoke` 与主进程通信，对应主进程 `ipcMain.handle`。  

## 方法清单

| 方法 | 说明 | 返回值 |
| --- | --- | --- |
| `ping()` | 连通性检测 | `"pong"` |
| `setBaseUrl(url)` | 设置 API 基础地址 | 标准化后的 `origin` 字符串 |
| `getBaseUrl()` | 获取当前基础地址 | `string` |
| `setAuthToken(token)` | 设置授权 token | `boolean`（是否设置成功） |
| `request(options)` | 发起网络请求 | 统一响应对象（见下文） |
| `storeGet(key?)` | 读取本地存储 | `any` 或全部数据对象 |
| `storeSet(key, value)` | 写入本地存储 | `true` |
| `storeMerge(key, value)` | 合并写入本地存储 | `true` |

## 详细说明

### `ping()`

- 用于自检，返回固定字符串 `"pong"`。

### `setBaseUrl(url)` / `getBaseUrl()`

- `setBaseUrl(url)` 会将传入的 URL 规范化为 `origin`（例如 `https://example.com`）。
- 之后 `request()` 只允许请求该 `origin` 下的地址。

### `setAuthToken(token)`

- 设置后，`request()` 若未显式提供 `authorization` 头，会自动追加：
  - `Authorization: Bearer <token>`

### `request(options)`

用于统一发起网络请求，并在主进程中完成请求与响应解析。

`options` 字段：

- `path`（必填）：相对路径（如 `/api/user`）或完整 URL。
- `method`：默认 `GET`。
- `headers`：请求头对象。
- `body`：请求体（对象会自动 JSON 序列化）。
- `responseType`：`"auto" | "json" | "text"`，默认 `"auto"`。

请求规则与约束：

- 仅允许 `http/https` 协议。
- 若传入完整 URL，其 `origin` 必须与 `setBaseUrl()` 一致。
- 若传入相对路径，会自动拼接到 `baseUrl`。
- 对象类型 `body` 会自动 `JSON.stringify`，并补充 `content-type: application/json`。

响应结构：

```
{
  ok: boolean,
  status: number,
  contentType: string,
  headers: Record<string, string>,
  data: any,            // json/text/base64
  isBase64: boolean,    // 当非 json/text 时为 true
  captchaUuid: string   // 如响应头或 set-cookie 中解析到
}
```

说明：

- 当 `responseType === "auto"` 且 `content-type` 包含 `application/json` 时，自动解析 JSON。
- `responseType === "text"` 时返回文本。
- 其他情况返回 `base64` 字符串，并标记 `isBase64: true`。
- 会自动解析响应中的 `set-cookie` 并写入 `session.defaultSession`。

### `storeGet(key?)` / `storeSet(key, value)` / `storeMerge(key, value)`

- 数据保存在 `app.getPath('userData')/store.json`。
- `storeGet()` 不传 `key` 时返回完整对象。
- `storeSet()` 直接覆盖对应 key。
- `storeMerge()` 在当前值与新值均为对象时进行浅合并，否则直接覆盖。

## 示例（渲染进程）

```js
// 基础连通性
const pong = await window.api.ping();
console.log('pong =', pong);

// 初始化 API 入口
await window.api.setBaseUrl('https://api.example.com');
await window.api.setAuthToken('your-token');

// 发起请求
const res = await window.api.request({
  path: '/api/user/profile',
  method: 'GET'
});

if (res.ok) {
  console.log('profile', res.data);
} else {
  console.error('request failed', res.status, res.data);
}

// 本地存储
await window.api.storeSet('user', { name: 'Alice', role: 'admin' });
const user = await window.api.storeGet('user');
await window.api.storeMerge('user', { role: 'owner' });
```

## 文件位置

- 预加载入口：`src/preload/index.cjs`
- 主进程处理：`src/main/index.js`
