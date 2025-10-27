#!/bin/bash

# ShareDB 实时同步测试运行脚本

echo "🚀 开始 ShareDB 实时同步测试..."

# 检查依赖
echo "📋 检查环境依赖..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

# 检查后端服务
echo "🔍 检查后端服务..."
if ! curl -s http://localhost:2345/api/health > /dev/null; then
    echo "❌ 后端服务未运行在 http://localhost:2345"
    echo "请先启动后端服务："
    echo "  cd server && go run ."
    exit 1
fi

# 检查前端服务
echo "🔍 检查前端服务..."
if ! curl -s http://localhost:5173 > /dev/null; then
    echo "❌ 前端服务未运行在 http://localhost:5173"
    echo "请先启动前端服务："
    echo "  cd packages/aitable/demo-yjs && npm run dev"
    exit 1
fi

echo "✅ 环境检查通过"

# 创建截图目录
mkdir -p screenshots

# 安装 Playwright 依赖
echo "📦 安装 Playwright 依赖..."
npm install @playwright/test

# 安装浏览器
echo "🌐 安装浏览器..."
npx playwright install

# 运行测试
echo "🧪 运行 ShareDB 实时同步测试..."
npx playwright test test-realtime-sync.ts --project=chromium

# 检查测试结果
if [ $? -eq 0 ]; then
    echo "✅ 测试完成！"
    echo "📊 查看测试报告："
    echo "  - HTML 报告: playwright-test/test-report/index.html"
    echo "  - 截图目录: playwright-test/screenshots/"
    echo "  - 测试结果: playwright-test/test-results.json"
else
    echo "❌ 测试失败！"
    echo "📊 查看失败详情："
    echo "  - HTML 报告: playwright-test/test-report/index.html"
    echo "  - 截图目录: playwright-test/screenshots/"
    exit 1
fi
