# Link 字段标题更新测试指南

## 修复内容总结

本次修复增强了 Link 字段标题自动更新的诊断和日志功能，包括：

### 1. 增强的调试日志

#### RecordService (`record_service.go`)
- ✅ 添加事务上下文验证日志
- ✅ 记录回调注册情况
- ✅ 记录回调执行过程

#### LinkTitleUpdateService (`link_title_update_service.go`)
- ✅ 记录查找受影响记录的过程
- ✅ 详细记录每个受影响的表
- ✅ 记录源记录数据

#### FindRecordsByLinkValue (`record_repository_dynamic.go`)
- ✅ 记录 SQL WHERE 子句构建过程
- ✅ 记录 SQL 查询执行和结果
- ✅ 记录找到的记录ID列表

#### BatchUpdateLinkFieldTitle (`record_repository_dynamic.go`)
- ✅ 记录 SQL 执行详情（包括完整 SQL 语句）
- ✅ 记录影响行数
- ✅ 当影响行数为 0 时发出警告

### 2. 事务回调验证

- ✅ 验证事务上下文是否存在
- ✅ 如果不在事务中，记录警告

## 如何验证修复

### 方法 1: 查看日志文件

日志文件位置：`/test/logs/app.log`

#### 步骤 1: 执行一次记录更新操作

通过 API 或前端界面更新一个源记录（例如更新 "name" 字段）。

#### 步骤 2: 检查日志

运行以下命令查看相关日志：

```bash
# 查看事务上下文验证日志
tail -1000 /test/logs/app.log | grep -E "(事务上下文验证|开始执行 Link)" | tail -10

# 查看查找受影响记录的日志
tail -1000 /test/logs/app.log | grep -E "(开始查找受影响|找到受影响|GetAffectedRecordsByLink)" | tail -20

# 查看 SQL 查询日志
tail -1000 /test/logs/app.log | grep -E "(构建 SQL WHERE|执行 SQL 查询|查找 Link 字段值)" | tail -20

# 查看 SQL 更新日志
tail -1000 /test/logs/app.log | grep -E "(执行.*格式 Link 字段标题更新|批量更新.*格式 Link 字段标题)" | tail -20

# 查看所有 Link 相关日志
tail -2000 /test/logs/app.log | grep -i "link" | tail -30
```

### 方法 2: 使用测试脚本

#### 使用 TypeScript 测试脚本

```bash
cd packages/sdk/examples
npm run demo:12  # 运行 Link 字段更新测试
```

#### 使用 Shell 测试脚本

```bash
./test-link-field-update.sh
```

### 方法 3: 手动测试

1. **创建源表和目标表**
   - 创建源表（例如 "Tags" 表），包含 "name" 字段
   - 创建目标表（例如 "Posts" 表）

2. **创建 Link 字段**
   - 在目标表中创建 Link 字段，关联到源表

3. **创建记录**
   - 在源表中创建记录（例如 name = "维护保养"）
   - 在目标表中创建记录，引用源表的记录

4. **更新源记录**
   - 更新源记录的 "name" 字段（例如改为 "维护保养（已更新）"）

5. **检查目标记录**
   - 查询目标记录，检查 Link 字段的 title 是否已自动更新

## 预期日志输出

修复后，在日志文件中应该能看到以下日志：

### 1. 事务上下文验证
```
✅ 事务上下文验证成功，准备注册 Link 字段标题更新回调
```

### 2. 回调执行
```
🔵 开始执行 Link 字段标题更新回调
✅ 重新查询记录成功，使用最新记录数据
```

### 3. 查找受影响记录
```
🔵 开始查找受影响的记录
✅ 找到受影响的记录
📋 受影响的表详情
```

### 4. SQL 查询
```
🔵 构建 SQL WHERE 子句
🔵 执行 SQL 查询
✅ 查找 Link 字段值包含指定 recordIDs 的记录成功
```

### 5. SQL 更新
```
🔵 执行数组格式 Link 字段标题更新 SQL
✅ 批量更新数组格式 Link 字段标题成功
🔵 执行单个对象格式 Link 字段标题更新 SQL
✅ 批量更新单个对象格式 Link 字段标题成功
```

## 问题排查

### 如果没有看到回调日志

1. **检查服务初始化**
   - 查看日志中是否有 "⚠️ linkTitleUpdateService 为 nil" 警告
   - 确认容器初始化顺序正确

2. **检查事务上下文**
   - 查看日志中是否有 "⚠️ 不在事务上下文中" 警告
   - 确认 `UpdateRecord` 在事务中执行

### 如果看到回调日志但更新失败

1. **检查查找逻辑**
   - 查看 "⚠️ 没有找到受影响的记录" 日志
   - 确认 Link 字段配置正确（`linked_table_id` 指向源表）

2. **检查 SQL 更新**
   - 查看 "⚠️ 数组格式更新未影响任何行" 或 "⚠️ 对象格式更新未影响任何行" 警告
   - 检查 SQL WHERE 条件是否正确匹配记录

3. **检查字段值格式**
   - 确认 Link 字段值的格式（数组或对象）
   - 检查 `jsonb_typeof` 检查是否准确

## 下一步

如果修复生效，应该能看到：
- ✅ 回调正常执行
- ✅ 找到受影响的记录
- ✅ SQL 更新成功
- ✅ Link 字段的 title 自动更新

如果仍有问题，请查看详细的日志输出，定位具体的问题点。





