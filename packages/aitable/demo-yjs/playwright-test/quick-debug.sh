#!/bin/bash

# ShareDB 快速调试脚本

echo "🚀 ShareDB 快速调试开始..."

# 创建截图目录
mkdir -p screenshots

# 安装依赖
echo "📦 安装依赖..."
npm install @playwright/test

# 运行调试测试
echo "🔍 运行调试测试..."
npx playwright test debug-test.ts --project=chromium --headed

echo "✅ 调试完成！"
echo "📊 查看结果："
echo "  - 截图: screenshots/"
echo "  - 测试报告: test-report/index.html"
