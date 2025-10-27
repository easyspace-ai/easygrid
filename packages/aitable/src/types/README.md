# Type System Architecture - 类型系统架构

## 🏗️ 架构概览

这是一个**分层的、类型安全的**架构设计，遵循 **Clean Architecture** 和 **DDD (Domain-Driven Design)** 原则。

```
┌─────────────────────────────────────────┐
│         Presentation (UI)               │  ← Grid 组件、UI 状态
├─────────────────────────────────────────┤
│              ↑ Mappers ↓                │  ← 类型转换器
├─────────────────────────────────────────┤
│          Domain (Business)              │  ← 业务模型、命令
├─────────────────────────────────────────┤
│     Infrastructure (External)           │  ← API DTO、外部服务
├─────────────────────────────────────────┤
│            Core (Foundation)            │  ← 基础类型、常量
└─────────────────────────────────────────┘
```

## 📁 目录结构

```
types/
├── core/                 # 核心层 - 基础类型和常量
│   ├── field-types.ts    # FieldType 定义（单一真相来源）
│   ├── field-options.ts  # 字段选项类型
│   └── index.ts
│
├── infrastructure/       # 基础设施层 - API DTO
│   ├── field.dto.ts      # 字段 DTO
│   ├── record.dto.ts     # 记录 DTO
│   ├── base.dto.ts       # Base DTO
│   ├── table.dto.ts      # Table DTO
│   ├── view.dto.ts       # View DTO
│   └── index.ts
│
├── domain/               # 领域层 - 业务模型
│   ├── field.model.ts    # 字段领域模型
│   ├── record.model.ts   # 记录领域模型
│   ├── base.model.ts     # Base 领域模型
│   ├── table.model.ts    # Table 领域模型
│   ├── view.model.ts     # View 领域模型
│   └── index.ts
│
├── presentation/         # 表现层 - UI 类型
│   ├── grid-column.ts    # Grid 列定义
│   └── index.ts
│
├── mappers/              # 类型转换器
│   ├── field.mapper.ts   # 字段转换器
│   ├── record.mapper.ts  # 记录转换器
│   └── index.ts
│
└── index.ts              # 统一导出
```

## 🎯 设计原则

### 1. 单一真相来源 (Single Source of Truth)

**问题**：之前 `FieldType` 被定义了两次
- `src/types/field.ts` - `enum FieldType`
- `src/api/types.ts` - `type FieldType (union)`

**解决**：所有类型从 `core/` 导出
```typescript
// ✅ 正确 - 所有地方都从这里导入
import { FieldType } from '../types/core';
```

### 2. 明确的层次边界

每一层有明确的职责：

| 层级 | 职责 | 特点 |
|-----|------|------|
| **Core** | 基础类型和常量 | 无依赖，可被所有层使用 |
| **Infrastructure** | API 通信 | 与后端契约一致，DTO 对象 |
| **Domain** | 业务逻辑 | 领域模型，包含业务规则 |
| **Presentation** | UI 展示 | Grid 组件配置，UI 状态 |
| **Mappers** | 类型转换 | 连接各层，保证类型安全 |

### 3. 单向数据流

```
API Response (DTO) → Mapper → Domain Model → Mapper → Presentation (UI)
                              ↑
User Action (Command) ────────┘
                              ↓
                         API Request (DTO)
```

## 📖 使用指南

### 基础用法

```typescript
import { 
  FieldType,           // 从 core 导入基础类型
  FieldDTO,            // 从 infrastructure 导入 DTO
  FieldModel,          // 从 domain 导入领域模型
  GridColumn,          // 从 presentation 导入 UI 类型
  FieldMapper          // 从 mappers 导入转换器
} from '@easygrid/aitable';

// API 响应 → 领域模型
const fieldModel = FieldMapper.toDomain(apiResponse);

// 领域模型 → UI 展示
const gridColumn = FieldMapper.toGridColumn(fieldModel);

// 创建命令 → API 请求
const createDTO = FieldMapper.createCommandToDTO({
  name: '新字段',
  type: FieldType.SingleLineText,
});
```

### 类型安全的字段选项

```typescript
import { FieldModel, FieldOptions, FieldType } from '@easygrid/aitable';

// 类型安全的字段定义
const numberField: FieldModel<typeof FieldType.Number> = {
  id: 'field-1',
  name: '数量',
  type: FieldType.Number,
  options: {
    precision: 2,
    showAs: {
      type: 'bar',
      color: '#3b82f6',
      maxValue: 100,
      showValue: true,
    },
  },
  // ... 其他属性
};
```

### 在 API 客户端中使用

```typescript
import { FieldDTO, CreateFieldDTO, FieldMapper } from '@easygrid/aitable';

class FieldService {
  async createField(tableId: string, command: CreateFieldCommand): Promise<FieldModel> {
    // 命令 → DTO
    const dto = FieldMapper.createCommandToDTO(command);
    
    // 调用 API
    const response = await api.post<FieldDTO>(`/tables/${tableId}/fields`, dto);
    
    // DTO → 领域模型
    return FieldMapper.toDomain(response.data);
  }
}
```

### 在 React 组件中使用

```typescript
import { GridColumn, FieldModel, FieldMapper } from '@easygrid/aitable';

function MyGrid() {
  const [fields, setFields] = useState<FieldModel[]>([]);
  
  // 转换为 Grid 列
  const columns: GridColumn[] = fields.map(field => 
    FieldMapper.toGridColumn(field)
  );
  
  return <Grid columns={columns} />;
}
```

## 🔄 数据转换流程

### 场景 1：获取字段列表

```
1. API 返回 FieldDTO[]
   ↓
2. Mapper.toDomain() → FieldModel[]
   ↓
3. Mapper.toGridColumn() → GridColumn[]
   ↓
4. 传递给 Grid 组件渲染
```

### 场景 2：创建新字段

```
1. 用户操作 → CreateFieldCommand
   ↓
2. Mapper.createCommandToDTO() → CreateFieldDTO
   ↓
3. API 请求
   ↓
4. API 返回 FieldDTO
   ↓
5. Mapper.toDomain() → FieldModel
   ↓
6. 更新 UI
```

## 🚀 迁移指南

### 从旧类型迁移

**之前：**
```typescript
import { IField, FieldType } from '@easygrid/aitable';

// 使用 IField（API 类型）
const field: IField = { ... };
```

**之后（推荐）：**
```typescript
import { FieldDTO, FieldModel, FieldMapper } from '@easygrid/aitable';

// API 层使用 FieldDTO
const fieldDTO: FieldDTO = apiResponse;

// 业务层使用 FieldModel
const fieldModel: FieldModel = FieldMapper.toDomain(fieldDTO);
```

**之后（兼容模式）：**
```typescript
// 旧的类型别名仍然可用
import { IField } from '@easygrid/aitable';

const field: IField = { ... }; // IField = FieldDTO
```

### 字段类型定义迁移

**之前：**
```typescript
// 两个地方都有定义，容易冲突
import { FieldType } from '@/types/field';      // enum
import { FieldType } from '@/api/types';        // union type
```

**之后：**
```typescript
// 只有一个定义
import { FieldType, FIELD_TYPES } from '@easygrid/aitable';

// 使用常量
const type = FIELD_TYPES.SingleLineText;

// 使用类型
function processField(type: FieldType) { ... }
```

## 🎓 最佳实践

### ✅ DO

```typescript
// ✅ 从 core 导入基础类型
import { FieldType } from '../types/core';

// ✅ 使用 Mapper 进行转换
const model = FieldMapper.toDomain(dto);

// ✅ 在合适的层使用合适的类型
// API 层
const dto: FieldDTO = apiResponse;

// 业务层
const model: FieldModel = FieldMapper.toDomain(dto);

// UI 层
const column: GridColumn = FieldMapper.toGridColumn(model);
```

### ❌ DON'T

```typescript
// ❌ 不要直接在 UI 层使用 DTO
function MyComponent({ field }: { field: FieldDTO }) { ... }

// ❌ 不要在 API 层使用领域模型
async function apiCall(): Promise<FieldModel> { ... }

// ❌ 不要跨层直接转换
const column = fieldDTO as GridColumn; // 类型不兼容
```

## 🔧 工具函数

### FieldTypeUtils

```typescript
import { FieldTypeUtils, FIELD_TYPES } from '@easygrid/aitable';

// 检查字段类型
FieldTypeUtils.isComputed(FIELD_TYPES.Formula);     // true
FieldTypeUtils.isReadOnly(FIELD_TYPES.CreatedTime); // true
FieldTypeUtils.isTextType(FIELD_TYPES.SingleLineText); // true

// 获取显示名称
FieldTypeUtils.getDisplayName(FIELD_TYPES.Number); // "数字"
```

## 📊 性能考虑

### Map vs Record

领域模型使用 `Map`，API 使用 `Record`：

```typescript
// Domain: 使用 Map（性能更好，API 更丰富）
interface RecordModel {
  fields: Map<string, any>;
}

// Infrastructure: 使用 Record（JSON 兼容）
interface RecordDTO {
  fields: Record<string, any>;
}

// Mapper 自动转换
RecordMapper.toDomain(dto); // Record → Map
RecordMapper.toDTO(model);  // Map → Record
```

### Date vs string

```typescript
// Domain: 使用 Date 对象
interface FieldModel {
  createdTime: Date;
}

// Infrastructure: 使用 ISO 字符串
interface FieldDTO {
  createdTime: string;
}

// Mapper 自动转换
FieldMapper.toDomain(dto); // string → Date
```

## 🐛 常见问题

### Q: 为什么要这么复杂的分层？

**A:** 
1. **类型安全**：每层的类型明确，避免混淆
2. **易于维护**：职责清晰，修改不会影响其他层
3. **可测试性**：领域层可以独立测试
4. **可扩展性**：新增功能不会破坏现有结构

### Q: 旧代码会被破坏吗？

**A:** 不会。我们提供了向后兼容的类型别名：
```typescript
export type { FieldDTO as IField } from './infrastructure';
```

### Q: 性能开销大吗？

**A:** 几乎没有。Mapper 只是简单的对象转换，现代 JS 引擎优化得很好。

## 📚 参考资源

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [DTO Pattern](https://martinfowler.com/eaaCatalog/dataTransferObject.html)

---

**维护者**: @easygrid/aitable Team  
**更新时间**: 2025-10-15  
**版本**: 1.0.0

