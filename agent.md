# 项目 Agent 指南

> 目的：为在本项目中工作的自动化/协作代理提供清晰、可执行的规则与流程。
> 适用范围：本仓库内的全部代码与文档。

## 1. 项目概览
- 项目类型：Electron + Vite + Vue
- 项目名称：羽嘉低代码生成 (yjcodex)
- 主要目标：待补充
- 关键功能：待补充
- 运行环境：macOS 

## 2. 本地开发
### 2.1 依赖与版本
- Node.js：建议使用 LTS（请在此处写明版本，如 20.x）
- 包管理器：npm / pnpm / yarn（请选择其一）
- 框架栈：Electron（主进程）+ Vue（渲染进程）+ Vite（构建与开发服务器）
- 路由：Vue Router
- 前端架构：Vue 多页面（Multi-Page）
- UI 组件库：shadcn-vue（Vite 安装方案）
- 主题：支持黑白模式（浅色/深色）

### 2.2 安装与启动（示例）
```bash
# 安装依赖
pnpm install

# 启动开发模式
pnpm run dev
```

### 2.3 构建与打包（示例）
```bash
# 生产构建
pnpm run build

# 打包发布
pnpm run package
```

> 若本项目命令不同，请在此处替换为真实命令。

## 3. 代码结构
```
.
├─ src/                 # 源代码（按实际情况调整）
│  ├─ main/             # Electron 主进程
│  ├─ preload/          # 预加载脚本
│  └─ renderer/         # Vue 渲染进程（Vite，多页面）
│     ├─ pages/         # 页面入口（每页一个入口）
│     ├─ router/        # 路由配置
│     ├─ components/    # 公共组件
│     └─ assets/        # 页面资源
├─ assets/              # 静态资源
├─ scripts/             # 构建/工具脚本
└─ docs/                # 项目文档
```

## 4. 编码规范
- 语言：TypeScript / JavaScript（择一）
- 风格：遵循 ESLint / Prettier（如有）
- 命名：
  - 文件与目录使用 `kebab-case`
  - 组件使用 `PascalCase`
  - 变量与函数使用 `camelCase`
- UI 规范（shadcn-vue）：
  - 组件优先使用 shadcn-vue，避免重复造轮子
  - 主题切换保持全局一致（浅色/深色），不要在单页内自定义局部主题
- Vue 多页面约束：
  - 每个页面拥有独立入口（如 `pages/<page>/main.ts`）
  - 路由仅在同一页面内管理，不跨页面共享路由状态
  - 页面间跳转通过窗口管理或自定义协议，不直接使用路由
- Electron 约束：
  - 渲染进程不得直接访问 Node API；通过 `preload` + `contextBridge` 暴露必要能力
  - 进程间通信优先使用 IPC，并明确通道与参数校验
- 重要：避免引入未经许可的第三方库；新增依赖需注明原因。

## 5. 代理执行规则
- 优先阅读 `README.md`、`package.json`、`docs/` 以理解真实流程。
- 修改前先搜索相关文件，避免重复实现。
- 对关键逻辑变更需补充测试或说明为何无需测试。
- 任何不确定的需求应先与维护者确认。

## 6. 提交规范（可选）
- 分支策略：main / develop / feature/*（按需）
- Commit message：
  - `feat:` 新功能
  - `fix:` 修复问题
  - `refactor:` 重构
  - `docs:` 文档
  - `test:` 测试
  - `chore:` 其他

## 7. 测试
- 单元测试：`pnpm run test`
- E2E 测试：`pnpm run test:e2e`（如有）
- 覆盖率要求：待补充

## 8. 发布流程
1. 更新版本号（如需）
2. 执行构建与打包
3. 生成发布产物
4. 发布说明与变更日志

## 9. 待补充清单
- [ ] 项目真实名称与目标
- [ ] 正确的安装/启动/构建命令
- [ ] 目录结构确认（是否为 `src/main`、`src/preload`、`src/renderer`）
- [ ] 多页面入口与 Vite 配置位置
- [ ] 测试流程与覆盖率要求
- [ ] 发布流程与环境

---
如需完善，请提供：
- 真实的项目命令（install/dev/build/test）
- 目录结构（或 `tree` 输出）
- 技术栈与规范要求
