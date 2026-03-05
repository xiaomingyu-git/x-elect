# 羽嘉低代码生成 (yjcodex)

基于 Electron + Vite + Vue 3 的多页面桌面应用脚手架，内置 preload IPC 与基础本地存储能力，渲染端使用 Tailwind CSS v4。

## 环境要求
- Node.js >= 20
- pnpm >= 9

## 快速开始
```bash
pnpm install
pnpm run dev
```

## 常用命令
```bash
pnpm run dev       # 启动 Vite (5173) 并拉起 Electron
pnpm run build     # 构建 renderer 并拷贝 main/preload 到 dist
pnpm run package   # 目前仅调用 build，未接入打包器
```

## 目录结构
```
.
├─ scripts/                 # dev/build/package 脚本
├─ src/
│  ├─ main/                 # Electron 主进程
│  ├─ preload/              # Preload (CommonJS)
│  └─ renderer/             # Vue 渲染进程 (multi-page)
│     └─ pages/
│        ├─ home/
│        └─ login/
└─ dist/
   ├─ main/                 # main 进程构建输出
   ├─ preload/              # preload 输出
   └─ renderer/             # Vite 构建输出
```

## IPC / API
Preload 暴露在 `window.api`，定义位于 `src/preload/index.cjs`，主进程实现位于 `src/main/index.js`。

可用方法：
- `ping()`
- `setBaseUrl(url)` / `getBaseUrl()`
- `setAuthToken(token)`
- `request(options)`                         # 统一请求入口（含 cookie 处理）
- `storeGet(key)` / `storeSet(key, value)` / `storeMerge(key, value)`  # 本地存储

本地存储默认落地到 `app.getPath('userData')/store.json`。

更多细节与示例见文档：[`docs/electron-api.md`](docs/electron-api.md)。

## 备注
- 多页面入口配置在 `vite.config.js`：`home` 与 `login`。
- `dev` 模式会注入 `VITE_DEV_SERVER_URL` 给主进程用于加载页面。
- 打包器尚未接入（可考虑 electron-builder / electron-forge）。
