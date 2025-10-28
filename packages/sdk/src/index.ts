/**
 * EasyGrid SDK 主入口
 * 导出所有公共 API
 */

// 核心类
// export { EasyGridClient } from './core/EasyGridClient.js'
// export { DocumentManager } from './core/DocumentManager.js'
// export { QueryCache } from './core/QueryCache.js'
// export { ConnectionManager } from './core/ConnectionManager.js'
// export { StateManager } from './core/StateManager.js'
// export { ErrorManager } from './core/ErrorManager.js'

// ShareDB 核心
// export { ShareDBConnection, ShareDBDoc } from './core/sharedb/index.js'

// 模型
export { Record, RecordCore, createRecordInstance } from './model/record/index.js'

// 操作构建器
export { RecordOpBuilder, FieldOpBuilder, TableOpBuilder, ViewOpBuilder } from './utils/op-builder/index.js'

// 全局 SDK 实例
export { EasyGridSDK, initEasyGridSDK, getEasyGridSDK } from './sdk.js'

// 错误处理
// export { SDKErrorHandler } from './core/error-handler.js'

// Context
export { EasyGridProvider } from './context/EasyGridProvider.js'
// export { ConnectionProvider } from './context/ConnectionContext.js'

// Hooks - 连接相关
export { useConnection } from './hooks/connection/useConnection.js'
// export { useConnectionState } from './hooks/connection/useConnectionState.js'
// export { useReconnect } from './hooks/connection/useReconnect.js'

// Hooks - 文档相关
// export { useRecord } from './hooks/documents/useRecord.js'
// export { useRecords } from './hooks/documents/useRecords.js'
// export { useField } from './hooks/documents/useField.js'

// Hooks - 变更操作
// export { useRecordMutation } from './hooks/mutations/useRecordMutation.js'
// export { useBatchUpdate } from './hooks/mutations/useBatchUpdate.js'

// Hooks - 高级封装
// export { useEasyGrid } from './hooks/useEasyGrid.js'
export { useInstances } from './hooks/instances/useInstances.js'
// export { useFields } from './hooks/fields/useFields.js'

// 组件
// export { ConnectionIndicator } from './components/ConnectionIndicator.js'

// 类型
export type {
  UseConnectionReturn,
  UseConnectionConfig
} from './hooks/connection/useConnection.js'

export type {
  UseInstancesOptions,
  UseInstancesReturn
} from './hooks/instances/useInstances.js'

export type {
  EasyGridSDKConfig
} from './sdk.js'

export type {
  EasyGridProviderProps
} from './context/EasyGridProvider.js'

export type {
  IRecord,
  IFieldInstance
} from './model/record/index.js'

export type {
  LoginRequest,
  AuthResponse
} from './types/index.js'