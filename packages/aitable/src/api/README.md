# Grid API 模块

这个模块提供了两种方式来与 LuckDB 后端 API 进行交互：

## 1. SDK 适配器（推荐）

使用 `@easygrid/sdk` 作为底层实现，提供更完善的功能和更好的类型支持。

### 使用方式

```typescript
import { createSDKAdapter } from '@easygrid/aitable';

// 创建 SDK 适配器
const apiClient = createSDKAdapter({
  baseURL: 'http://localhost:2345/api/v1',
  token: 'your-auth-token',
  onError: (error) => console.error('API Error:', error),
  onUnauthorized: () => console.log('Unauthorized'),
});

// 使用 API
const bases = await apiClient.getBases();
const tables = await apiClient.getTables('base-id');
```

### 在 React 组件中使用

```typescript
import { AppProviders, createSDKAdapter } from '@easygrid/aitable';

const apiClient = createSDKAdapter({
  baseURL: process.env.REACT_APP_API_URL,
  token: userToken,
});

function App() {
  return (
    <AppProviders
      baseId="base-id"
      tableId="table-id"
      viewId="view-id"
      apiClient={apiClient}
    >
      {/* Your app content */}
    </AppProviders>
  );
}
```

## 2. 传统 API 客户端（向后兼容）

基于 axios 的传统实现，用于向后兼容。

### 使用方式

```typescript
import { createLegacyClient } from '@easygrid/aitable';

const apiClient = createLegacyClient({
  baseURL: 'http://localhost:2345/api/v1',
  token: 'your-auth-token',
});
```

## 3. 工厂函数（灵活选择）

使用工厂函数可以根据配置动态选择使用哪种实现：

```typescript
import { createApiClient } from '@easygrid/aitable';

// 使用 SDK（默认）
const sdkClient = createApiClient({
  baseURL: 'http://localhost:2345/api/v1',
  token: 'your-auth-token',
  type: 'sdk', // 可选，默认就是 'sdk'
});

// 使用传统客户端
const legacyClient = createApiClient({
  baseURL: 'http://localhost:2345/api/v1',
  token: 'your-auth-token',
  type: 'legacy',
});
```

## 类型定义

### Grid 类型（向后兼容）

```typescript
import type {
  IBase,
  ITable,
  IField,
  IRecord,
  IView,
  // ... 其他类型
} from '@easygrid/aitable';
```

### SDK 类型（推荐）

```typescript
import type {
  Base,
  Table,
  Field,
  Record,
  View,
  CreateBaseRequest,
  CreateTableRequest,
  // ... 其他 SDK 类型
} from '@easygrid/aitable';
```

## API 接口

无论使用哪种实现，API 接口都是一致的：

### Base 操作

- `getBases()` - 获取所有 bases
- `getBase(id)` - 获取单个 base
- `createBase(data)` - 创建 base
- `updateBase(id, data)` - 更新 base
- `deleteBase(id)` - 删除 base

### Table 操作

- `getTables(baseId)` - 获取 base 下的所有 tables
- `getTable(tableId)` - 获取单个 table
- `createTable(baseId, data)` - 创建 table
- `updateTable(tableId, data)` - 更新 table
- `deleteTable(tableId)` - 删除 table
- `getTablePermission(tableId)` - 获取 table 权限

### Field 操作

- `getFields(tableId)` - 获取 table 的所有 fields
- `getField(tableId, fieldId)` - 获取单个 field
- `createField(tableId, data)` - 创建 field
- `updateField(tableId, fieldId, data)` - 更新 field
- `deleteField(tableId, fieldId)` - 删除 field
- `convertField(tableId, fieldId, newType, options)` - 转换 field 类型

### Record 操作

- `getRecords(tableId, params)` - 获取 records（支持分页、过滤、排序）
- `getRecord(tableId, recordId)` - 获取单个 record
- `createRecord(tableId, data)` - 创建 record
- `updateRecord(tableId, recordId, fieldId, value)` - 更新 record
- `batchUpdateRecords(tableId, updates)` - 批量更新 records
- `deleteRecord(tableId, recordId)` - 删除 record
- `batchDeleteRecords(tableId, recordIds)` - 批量删除 records

### View 操作

- `getViews(tableId)` - 获取 table 的所有 views
- `getView(tableId, viewId)` - 获取单个 view
- `createView(tableId, data)` - 创建 view
- `updateView(tableId, viewId, data)` - 更新 view
- `deleteView(tableId, viewId)` - 删除 view

## 迁移指南

如果你正在使用旧的 `ApiClient`，迁移到 SDK 适配器非常简单：

### 之前

```typescript
import { ApiClient } from '@easygrid/aitable';

const apiClient = new ApiClient({
  baseURL: 'http://localhost:2345/api/v1',
  token: 'your-auth-token',
});
```

### 之后（推荐）

```typescript
import { createSDKAdapter } from '@easygrid/aitable';

const apiClient = createSDKAdapter({
  baseURL: 'http://localhost:2345/api/v1',
  token: 'your-auth-token',
});
```

或者使用默认导出：

```typescript
import { ApiClient } from '@easygrid/aitable';

// 现在 ApiClient 默认指向 SDKAdapter
const apiClient = new ApiClient({
  baseURL: 'http://localhost:2345/api/v1',
  token: 'your-auth-token',
});
```

## 注意事项

1. **SDK 适配器**基于 `@easygrid/sdk`，提供更好的功能和类型支持
2. **传统客户端**基于 axios，主要用于向后兼容
3. 两种实现提供相同的 API 接口，可以无缝切换
4. 推荐新项目使用 SDK 适配器
5. SDK 适配器会自动处理响应格式的差异

## 已知限制

SDK 适配器目前有以下限制：

- Comment 相关 API 暂未实现（SDK 层面尚未支持）
- 通用的 HTTP 方法（get/post/patch/delete）不支持，请使用具体的业务方法

这些功能将在未来的版本中添加。

