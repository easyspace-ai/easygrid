# EasyGrid SDK 实时协作演示

这是一个基于 React 的演示项目，展示了 EasyGrid SDK 的实时协作功能。

## 功能特性

- 🔐 用户登录认证
- 📊 实时数据表格
- 🔄 实时数据同步
- 🎯 多客户端协作演示
- 💫 现代化 UI 设计

## 快速开始

### 1. 安装依赖

```bash
cd packages/sdk/demo
npm install
```

### 2. 启动服务器

确保 EasyGrid 服务器正在运行：

```bash
cd ../../../server
go run cmd/server/main.go serve
```

### 3. 启动演示应用

```bash
cd packages/sdk/demo
npm run dev
```

### 4. 访问应用

打开浏览器访问：http://localhost:3000

## 演示步骤

1. **登录**：使用演示账户 `admin@126.com` / `Pmker123` 登录
2. **查看表格**：登录后可以看到实时数据表格
3. **测试同步**：
   - 点击第一条记录的"增加"按钮
   - 打开另一个浏览器标签页（或新窗口）
   - 在另一个标签页中观察数值变化
   - 两个页面的数据会实时同步

## 技术栈

- **React 18** - 用户界面框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **Lucide React** - 图标库
- **React Router** - 路由管理
- **EasyGrid SDK** - 实时协作 SDK

## 项目结构

```
demo/
├── src/
│   ├── components/          # React 组件
│   │   ├── DataTable.tsx   # 数据表格组件
│   │   ├── LoginForm.tsx   # 登录表单组件
│   │   └── RealtimeTable.tsx # 主表格组件
│   ├── context/            # React 上下文
│   │   └── LuckDBContext.tsx # SDK 上下文提供者
│   ├── App.tsx             # 主应用组件
│   ├── main.tsx            # 应用入口
│   └── index.css           # 全局样式
├── package.json            # 项目配置
├── vite.config.ts          # Vite 配置
└── tailwind.config.js      # Tailwind 配置
```

## 开发说明

### 添加新功能

1. 在 `src/components/` 中创建新组件
2. 在 `src/context/LuckDBContext.tsx` 中添加 SDK 相关逻辑
3. 更新路由和导航

### 自定义样式

项目使用 Tailwind CSS，可以在 `tailwind.config.js` 中自定义主题。

### 调试

- 打开浏览器开发者工具查看控制台日志
- SDK 的 `debug: true` 选项会输出详细的调试信息
- 检查网络标签页查看 WebSocket 连接状态

## 故障排除

### 连接问题

1. 确保服务器正在运行在 `http://localhost:8080`
2. 检查防火墙设置
3. 查看浏览器控制台的错误信息

### 登录问题

1. 确保使用正确的演示账户
2. 检查服务器日志
3. 清除浏览器缓存和本地存储

### 实时同步问题

1. 确保 WebSocket 连接正常
2. 检查网络连接
3. 查看服务器端的 ShareDB 日志

## 许可证

MIT License
