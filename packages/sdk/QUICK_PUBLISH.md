# 快速发布指南 - @easyspace/luckdb-sdk

## 🚀 一键发布（推荐）

```bash
# 在项目根目录运行
./scripts/publish-sdk.sh
```

## 📝 手动发布

### 首次发布

```bash
# 1. 确保使用官方源（重要！）
npm config get registry
# 如果不是官方源，切换到官方源：
npm config set registry https://registry.npmjs.org/

# 2. 登录 npm
npm login

# 3. 进入 SDK 目录
cd packages/sdk

# 4. 构建并发布
pnpm build
npm publish --access public
```

### 后续更新

```bash
cd packages/sdk

# 更新版本（选择一个）
npm version patch  # 1.0.0 -> 1.0.1 (Bug 修复)
npm version minor  # 1.0.0 -> 1.1.0 (新功能)
npm version major  # 1.0.0 -> 2.0.0 (破坏性变更)

# 发布
pnpm build
npm publish --access public
```

## 🏷️ 预发布版本

```bash
# Beta 版本
npm version prerelease --preid=beta
npm publish --access public --tag beta

# Alpha 版本
npm version prerelease --preid=alpha
npm publish --access public --tag alpha
```

## ✅ 发布前检查

- [ ] `npm whoami` - 确认已登录
- [ ] `pnpm lint` - 代码检查
- [ ] `pnpm build` - 构建成功
- [ ] `npm pack --dry-run` - 预览内容
- [ ] Git 提交所有更改

## 📦 验证发布

```bash
# 查看包信息
npm view @easyspace/luckdb-sdk

# 测试安装
npm install @easyspace/luckdb-sdk@latest
```

## 📚 详细文档

查看 `PUBLISHING.md` 获取完整指南。

## 🆘 常见问题

**Q: 403 错误？**
```bash
npm login
npm whoami
```

**Q: 版本已存在？**
```bash
npm version patch
npm publish --access public
```

**Q: 如何撤销？**
```bash
# 72小时内
npm unpublish @easyspace/luckdb-sdk@1.0.1

# 之后使用废弃
npm deprecate @easyspace/luckdb-sdk@1.0.1 "请升级"
```

## 🎯 快速命令

```bash
# 完整流程
cd packages/sdk
npm version patch
pnpm build
npm publish --access public
cd ../..
git add packages/sdk/package.json
git commit -m "chore(sdk): release vX.Y.Z"
git tag "sdk-vX.Y.Z"
git push && git push --tags
```

