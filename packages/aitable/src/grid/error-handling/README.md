# Grid 错误边界系统

## 概述

完整的错误处理和恢复机制，确保Grid在遇到错误时依然可用。

## 组件

### 1. GridErrorBoundary

**用途**: 捕获Grid组件级别的致命错误

```tsx
import { GridErrorBoundary } from '@easygrid/aitable';

<GridErrorBoundary 
  onError={(error, errorInfo) => {
    // 自定义错误处理
    console.error('Grid Error:', error);
  }}
>
  <Grid {...props} />
</GridErrorBoundary>
```

**特性**:
- 美观的错误UI
- 重试机制
- 刷新页面选项
- 开发环境显示详细错误信息
- 生产环境错误上报

### 2. FeatureErrorBoundary

**用途**: 包装特定功能模块，隔离错误影响

```tsx
import { FeatureErrorBoundary } from '@easygrid/aitable';

<FeatureErrorBoundary 
  feature="Grid Toolbar"
  onError={(feature, error, errorInfo) => {
    console.warn(`${feature} error:`, error);
  }}
>
  <GridToolbar {...props} />
</FeatureErrorBoundary>
```

**特性**:
- 功能隔离：某个功能出错不影响整个Grid
- 轻量级错误提示
- 可关闭的错误提示
- 自动错误记录

### 3. GridWithErrorBoundary (推荐)

**用途**: 已集成ErrorBoundary的Grid组件，开箱即用

```tsx
import { GridWithErrorBoundary } from '@easygrid/aitable';
// 或
import Grid from '@easygrid/aitable/grid/core';

<GridWithErrorBoundary 
  columns={columns}
  rowCount={rowCount}
  getCellContent={getCellContent}
  {...otherProps}
/>
```

这是**默认导出**，推荐所有用户使用。

### 4. GridErrorHandler

**用途**: 全局错误处理器，可监听所有Grid错误

```tsx
import { gridErrorHandler } from '@easygrid/aitable';

// 添加全局错误监听
const removeListener = gridErrorHandler.addErrorListener((error) => {
  // 发送到错误监控服务
  Sentry.captureException(error);
});

// 清除监听
removeListener();
```

## 使用建议

### 生产环境

```tsx
import Grid from '@easygrid/aitable/grid/core';
import { gridErrorHandler } from '@easygrid/aitable';

// 1. 添加全局错误监听
gridErrorHandler.addErrorListener((error) => {
  // 上报到Sentry/LogRocket等
  errorMonitoring.captureException(error);
});

// 2. 使用GridWithErrorBoundary（默认已集成）
<Grid {...props} />
```

### 开发环境

开发时ErrorBoundary会显示详细的错误堆栈，帮助快速定位问题。

## 错误恢复策略

1. **组件级错误**: GridErrorBoundary捕获，显示重试按钮
2. **功能级错误**: FeatureErrorBoundary捕获，显示提示但不阻止其他功能
3. **静默恢复**: GridErrorHandler记录但不打断用户操作

## 集成错误监控

```tsx
import { gridErrorHandler } from '@easygrid/aitable';
import * as Sentry from '@sentry/react';

// 初始化错误监控
gridErrorHandler.addErrorListener((error) => {
  Sentry.captureException(error.error, {
    extra: {
      context: error.context,
      timestamp: error.timestamp,
    },
    tags: {
      component: 'Grid',
    },
  });
});
```

## 最佳实践

✅ **推荐**:
- 使用GridWithErrorBoundary作为默认导出
- 在应用根组件添加全局错误监听
- 集成错误监控服务（生产环境）

❌ **避免**:
- 在ErrorBoundary内部抛出新错误
- 过度使用FeatureErrorBoundary（只用于独立功能）
- 忘记在生产环境移除console.log

