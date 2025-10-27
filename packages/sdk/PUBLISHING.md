# 发布 @easyspace/luckdb-sdk 到 NPM

本文档说明如何将 `@easyspace/luckdb-sdk` 包发布到 npm registry。

## 📋 发布前检查清单

在发布之前，请确保完成以下步骤：

### 1. 代码质量检查

```bash
# 运行 linter
pnpm lint

# 运行测试（如果有）
pnpm test

# 构建包
pnpm build
```

### 2. 版本管理

更新 `package.json` 中的版本号：

```bash
# 补丁版本（bug 修复）
npm version patch    # 1.0.0 -> 1.0.1

# 次要版本（新功能，向后兼容）
npm version minor    # 1.0.0 -> 1.1.0

# 主要版本（破坏性变更）
npm version major    # 1.0.0 -> 2.0.0
```

或手动编辑 `package.json` 中的 `version` 字段。

### 3. 文档更新

- ✅ 更新 `README.md` - 确保文档准确、完整
- ✅ 更新 `CHANGELOG.md` - 记录版本变更（如果有）
- ✅ 确保代码注释和 JSDoc 完整

### 4. 验证发布内容

```bash
# 预览将要发布的文件
npm pack --dry-run

# 或者实际打包（会生成 .tgz 文件）
npm pack

# 查看打包内容
tar -tzf luckdb-sdk-*.tgz
```

确保包含：
- ✅ `dist/` 目录及所有编译文件
- ✅ `README.md`
- ✅ `LICENSE`
- ✅ `package.json`

确保**不包含**：
- ❌ `src/` 源代码（除非你想发布）
- ❌ `examples/` 示例代码
- ❌ `test-results/` 测试结果
- ❌ `node_modules/`
- ❌ `.git/` 相关文件

## 🔑 配置 NPM 认证

### 首次发布

如果这是第一次发布包到 npm，需要：

1. **注册 npm 账号**（如果还没有）
   
   访问 https://www.npmjs.com/signup 注册

2. **登录 npm**

   ```bash
   npm login
   ```

   输入用户名、密码和邮箱。

3. **验证登录状态**

   ```bash
   npm whoami
   ```

### 使用 npm Token（推荐用于 CI/CD）

```bash
# 生成 token（在 npm 网站）
# https://www.npmjs.com/settings/YOUR_USERNAME/tokens

# 设置环境变量
export NPM_TOKEN="your-npm-token-here"

# 或者在 .npmrc 中配置
echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" >> ~/.npmrc
```

## 📦 发布流程

### 方式 1: 使用 npm publish（推荐）

```bash
# 进入 SDK 包目录
cd packages/sdk

# 确保构建是最新的
pnpm build

# 发布到 npm（公开包）
npm publish --access public

# 如果是私有包
npm publish --access restricted
```

### 方式 2: 使用 pnpm publish

```bash
cd packages/sdk

# 发布
pnpm publish --access public
```

### 方式 3: 使用脚本发布

```bash
# 在项目根目录创建发布脚本
./scripts/publish-sdk.sh
```

## 🏷️ 发布标签（Tags）

npm 支持使用标签来管理不同的发布版本：

```bash
# 发布为 latest（默认）
npm publish --access public

# 发布为 beta 版本
npm publish --access public --tag beta

# 发布为 next 版本
npm publish --access public --tag next

# 发布为 canary 版本
npm publish --access public --tag canary
```

用户可以这样安装特定标签的版本：

```bash
npm install @easyspace/luckdb-sdk         # latest
npm install @easyspace/luckdb-sdk@beta    # beta
npm install @easyspace/luckdb-sdk@next    # next
```

## 📊 发布后验证

### 1. 验证包已发布

```bash
# 查看包信息
npm view @easyspace/luckdb-sdk

# 查看特定版本
npm view @easyspace/luckdb-sdk@1.0.0

# 查看所有版本
npm view @easyspace/luckdb-sdk versions
```

### 2. 测试安装

在一个新的项目中测试安装：

```bash
# 创建测试目录
mkdir test-luckdb-sdk
cd test-luckdb-sdk
npm init -y

# 安装包
npm install @easyspace/luckdb-sdk

# 测试导入
node -e "const LuckDB = require('@easyspace/luckdb-sdk'); console.log(LuckDB);"
```

### 3. 检查 npm 网站

访问 https://www.npmjs.com/package/@easyspace/luckdb-sdk 查看包页面。

## 🔄 版本管理策略

### 语义化版本（SemVer）

遵循 `主版本.次版本.补丁版本` 格式：

- **主版本（Major）**: 破坏性变更
  ```bash
  npm version major  # 1.0.0 -> 2.0.0
  ```

- **次版本（Minor）**: 新功能，向后兼容
  ```bash
  npm version minor  # 1.0.0 -> 1.1.0
  ```

- **补丁版本（Patch）**: Bug 修复
  ```bash
  npm version patch  # 1.0.0 -> 1.0.1
  ```

### 预发布版本

```bash
# Beta 版本
npm version prerelease --preid=beta
# 1.0.0 -> 1.0.1-beta.0

# Alpha 版本
npm version prerelease --preid=alpha
# 1.0.0 -> 1.0.1-alpha.0

# RC（Release Candidate）版本
npm version prerelease --preid=rc
# 1.0.0 -> 1.0.1-rc.0
```

## 🚨 撤销发布

### 撤销最近发布的版本（72小时内）

```bash
# 撤销特定版本
npm unpublish @easyspace/luckdb-sdk@1.0.1

# 撤销整个包（慎用！）
npm unpublish @easyspace/luckdb-sdk --force
```

⚠️ **注意**：
- npm 允许在发布后 72 小时内撤销版本
- 已被下载的版本无法撤销
- 撤销后该版本号不能再次使用

### 废弃版本（推荐）

如果超过 72 小时，使用废弃标记：

```bash
# 标记版本为废弃
npm deprecate @easyspace/luckdb-sdk@1.0.0 "此版本有严重 bug，请升级到 1.0.1"

# 取消废弃
npm deprecate @easyspace/luckdb-sdk@1.0.0 ""
```

## 📝 最佳实践

### 1. 发布前

- ✅ 运行所有测试
- ✅ 更新文档
- ✅ 更新 CHANGELOG
- ✅ 检查依赖版本
- ✅ 使用 `npm pack` 预览

### 2. 版本管理

- ✅ 遵循语义化版本
- ✅ 使用 Git 标签标记版本
- ✅ 保持版本号与 Git 标签一致

### 3. 发布后

- ✅ 验证安装和使用
- ✅ 更新文档网站（如果有）
- ✅ 发布 Release Notes
- ✅ 通知用户更新

## 🤖 自动化发布（CI/CD）

### GitHub Actions 示例

创建 `.github/workflows/publish.yml`：

```yaml
name: Publish to NPM

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
        working-directory: packages/sdk
      
      - name: Publish
        run: pnpm publish --access public --no-git-checks
        working-directory: packages/sdk
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 📚 相关资源

- [npm 发布文档](https://docs.npmjs.com/cli/v10/commands/npm-publish)
- [语义化版本规范](https://semver.org/lang/zh-CN/)
- [npm 包最佳实践](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)

## 🆘 常见问题

### 问题 1: 发布失败 - 403 权限错误

**原因**: 未登录或没有权限

**解决**:
```bash
npm login
npm whoami
```

### 问题 2: 包名已被占用

**原因**: 包名 `@easyspace/luckdb-sdk` 已存在

**解决**:
- 使用组织命名空间（需要先创建 npm 组织）
- 或更改包名

### 问题 3: 版本号已存在

**原因**: 该版本号已发布过

**解决**:
```bash
# 更新版本号
npm version patch
npm publish --access public
```

### 问题 4: 文件太大

**原因**: 包含了不必要的文件

**解决**:
- 检查 `package.json` 的 `files` 字段
- 添加 `.npmignore` 文件
- 使用 `npm pack --dry-run` 检查

## 📞 支持

如有问题，请联系：
- GitHub Issues: https://github.com/easyspace-ai/luckdb/issues
- Email: support@luckdb.ai

