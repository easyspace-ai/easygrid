# Link 字段全面功能测试

这是一个全面的 Link 字段功能测试项目，用于验证服务器端 Link 字段的所有功能是否正常工作。

## 测试覆盖

1. **对称字段自动创建**（manyMany、manyOne、oneMany、oneOne 关系）
2. **对称字段自动同步**（记录更新时）
3. **对称字段自动删除**（字段删除时）
4. **Count 字段依赖**（正确识别对 Link 字段的依赖）
5. **FkHostTableName、SelfKeyName、ForeignKeyName 的正确保存和使用**
6. **Junction table 的正确创建和使用**（manyMany 关系）
7. **记录更新时的外键保存**
8. **各种关系类型的完整测试**

## 运行测试

### 前置条件

1. 确保服务器正在运行（默认端口 8080）
2. 确保数据库连接正常
3. 确保测试账号可用（默认：admin@126.com / Pmker123）

### 运行方式

```bash
cd packages/sdk/examples/link-field-comprehensive-test
tsx comprehensive-link-field-test.ts
```

或者使用 npm script：

```bash
npm run test:link-comprehensive
```

### 环境变量

可以通过环境变量配置测试参数：

```bash
export SERVER_URL=http://localhost:8080
export TEST_EMAIL=admin@126.com
export TEST_PASSWORD=Pmker123
export DEBUG=true
```

## 测试结果

测试会输出详细的日志，包括：
- ✅ 成功步骤
- ❌ 失败步骤
- ⚠️ 警告信息

所有测试通过后，会自动清理测试资源。

## 注意事项

1. 测试会创建临时的 Space、Base、Table、Field 和 Record
2. 测试完成后会自动清理这些资源
3. 如果测试中断，可能需要手动清理资源

