# 羽嘉低代码生成 (yjcodex)

Electron + Vite + Vue multi-page scaffold with preload IPC and light/dark theme.

## Requirements
- Node.js >= 20
- pnpm

## Commands
```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run package
```

## Structure
```
.
├─ src/
│  ├─ main/            # Electron main process
│  ├─ preload/         # Preload scripts
│  └─ renderer/        # Vue renderer (multi-page)
│     └─ pages/
│        └─ home/
└─ scripts/
```

## Notes
- Renderer pages live under `src/renderer/pages/*`.
- IPC surface is defined in `src/preload/index.js`.
- Packaging is not configured yet; add an Electron packager when ready.
