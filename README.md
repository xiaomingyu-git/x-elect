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
pnpm run package   # 触发 electron-builder 打包（默认使用镜像源）
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
- `package` 默认设置 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`，可通过环境变量覆盖。

## 换机器必备条件
- Node.js >= 20（项目声明 engines）。
- pnpm >= 9（建议用 corepack：`corepack enable` + `corepack prepare pnpm@9.0.0 --activate`）。
- 需要网络可下载 Electron（electron-builder 会拉取二进制）。

## 换机器打包步骤
1. `pnpm install`
2. `pnpm build`
3. `pnpm package`

## 常见坑与规避
- GitHub 下载慢/被墙：用镜像  
  `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ pnpm package`
- 如果以后要恢复 dmg：需要先执行 `sudo xcodebuild -license` 同意协议。
- `description/author` 缺失只是警告，不影响打包。
