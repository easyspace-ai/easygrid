# LuckDB 管理后台

基于 React + Vite + Shadcn UI 的 LuckDB 管理后台应用。

## 功能特性

- ✅ 用户登录认证
- ✅ 登录状态持久化（localStorage）
- ✅ 展示所有 Space（空间）
- ✅ 每个 Space 显示其下的 Base 列表
- ✅ 点击 Base 跳转到表格编辑器
- ✅ 表格编辑器展示字段和记录数据
- ✅ 路由保护（未登录自动跳转到登录页）

## 技术栈

- **React 19** - UI 框架
- **Vite 7** - 构建工具
- **TypeScript** - 类型安全
- **Shadcn UI** - UI 组件库
- **Zustand** - 状态管理
- **React Router 7** - 路由管理
- **@easygrid/sdk** - LuckDB TypeScript SDK

## 快速开始

### 1. 安装依赖

```bash
cd apps/manage
pnpm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# LuckDB 后端 API 地址
VITE_API_URL=http://localhost:2345
```

### 3. 启动开发服务器

```bash
pnpm dev
```

### 4. 登录系统

默认测试账号：
- 邮箱：`admin@126.com`
- 密码：`Pmker123`

## 项目结构

```
src/
├── app/
│   ├── auth/
│   │   └── login/           # 登录页面
│   ├── dashboard-2/         # 主仪表板（展示 Space 和 Base）
│   ├── table-editor/        # 表格编辑器
│   └── errors/
│       └── not-found/       # 404 页面
├── components/
│   ├── auth/
│   │   └── protected-route.tsx  # 路由保护组件
│   ├── layouts/
│   │   └── base-layout.tsx      # 基础布局
│   ├── ui/                       # Shadcn UI 组件
│   └── ...
├── stores/
│   └── auth-store.ts        # 认证状态管理
├── lib/
│   └── luckdb.ts           # SDK 实例
└── config/
    └── routes.tsx          # 路由配置
```

## 路由说明

- `/login` - 登录页面（公开）
- `/dashboard` - 主仪表板（需要登录）
- `/base/:baseId/:tableId/:viewId` - 表格编辑器（需要登录）
- `*` - 404 页面

## 功能说明

### 登录认证

- 使用 `@easygrid/sdk` 进行用户认证
- 登录成功后将用户信息和 Token 保存到 localStorage
- 提供路由保护，未登录用户自动跳转到登录页

### Dashboard 页面

- 展示所有用户的 Space（空间）
- 每个 Space 以卡片形式展示
- 卡片内以滚动列表显示该 Space 下的所有 Base
- 点击 Base 自动获取第一个 Table 和 View，然后跳转到表格编辑器

### 表格编辑器

- 路由格式：`/base/:baseId/:tableId/:viewId`
- 显示表格基本信息（Base ID、Table ID、View ID）
- 展示所有字段信息
- 预览前 10 条记录数据

### 退出登录

- 点击侧边栏底部用户菜单中的"退出登录"
- 清除本地缓存的认证信息
- 自动跳转到登录页面

## 开发说明

### 添加新页面

1. 在 `src/app/` 下创建页面目录
2. 在 `src/config/routes.tsx` 中添加路由配置
3. 如需保护路由，使用 `<ProtectedRoute>` 包裹

### 状态管理

使用 Zustand 进行状态管理，已创建的 store：

- `auth-store.ts` - 认证状态管理

如需添加新的全局状态，在 `src/stores/` 下创建新的 store。

### SDK 使用

```typescript
import luckdb from '@/lib/luckdb';

// 获取空间列表
const spaces = await luckdb.listSpaces();

// 获取 Base 列表
const bases = await luckdb.listBases({ spaceId });

// 获取表格数据
const table = await luckdb.getTable(tableId);
```

## 构建部署

```bash
# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview
```

## 注意事项

1. 确保 LuckDB 后端服务已启动（默认 http://localhost:2345）
2. 首次使用需要初始化测试用户（参考 SDK 文档）
3. 登录信息保存在 localStorage 中，清除浏览器缓存会导致退出登录
4. 开发时建议启用 SDK 的 debug 模式查看详细日志

## 下一步计划

- [ ] 实现完整的表格编辑功能（增删改查记录）
- [ ] 添加字段管理功能
- [ ] 实现视图切换
- [ ] 添加实时协作功能（WebSocket）
- [ ] 优化 UI/UX
- [ ] 添加更多管理功能

## License

MIT

