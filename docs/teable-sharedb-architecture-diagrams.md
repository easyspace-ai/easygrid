# Teable ShareDB 架构图表

## 1. 整体架构图

```mermaid
graph TB
    subgraph "前端层 (Frontend Layer)"
        A[用户界面] --> B[EditorContainer]
        B --> C[GridViewBaseInner]
        C --> D[Record Model]
        D --> E[ShareDB Client]
    end
    
    subgraph "WebSocket 层 (WebSocket Layer)"
        E --> F[ReconnectingWebSocket]
        F --> G[ShareDB Connection]
        G --> H[Document Subscription]
    end
    
    subgraph "后端层 (Backend Layer)"
        I[HTTP API] --> J[Record Update Service]
        J --> K[Database]
        K --> L[ShareDB Service]
        L --> M[Redis PubSub]
    end
    
    subgraph "数据同步层 (Data Sync Layer)"
        M --> N[Redis Channels]
        N --> O[WebSocket Broadcast]
        O --> P[Client Sync]
    end
    
    subgraph "其他客户端 (Other Clients)"
        P --> Q[ShareDB Doc Update]
        Q --> R[UI Update]
    end
    
    H --> I
    G --> L
    O --> G
```

## 2. Cell 编辑数据流图

```mermaid
flowchart TD
    A[用户点击 Cell] --> B[EditorContainer 激活]
    B --> C[onCellEdited 回调]
    C --> D[Record.updateCell]
    
    D --> E[Optimistic Update]
    E --> F[doc.data 修改]
    F --> G[op batch 事件]
    
    D --> H[HTTP API 调用]
    H --> I[后端验证]
    I --> J[数据库更新]
    J --> K[rawOpMap 生成]
    K --> L[Redis PubSub 广播]
    
    L --> M[其他客户端接收]
    M --> N[ShareDB 同步]
    N --> O[UI 更新]
    
    G --> P[本地 UI 更新]
    
    style E fill:#e1f5fe
    style F fill:#e8f5e8
    style L fill:#fff3e0
    style N fill:#f3e5f5
```

## 3. ShareDB 连接管理图

```mermaid
sequenceDiagram
    participant App as 应用启动
    participant Conn as useConnection
    participant WS as ReconnectingWebSocket
    participant ShareDB as ShareDB Connection
    participant Server as 后端服务

    App->>Conn: 初始化连接
    Conn->>WS: 创建 WebSocket
    WS->>Server: 建立连接
    Server-->>WS: 连接确认
    WS->>ShareDB: 创建 Connection
    ShareDB->>Conn: 连接状态更新
    
    Note over Conn,Server: 心跳检测
    loop 每10秒
        ShareDB->>Server: ping()
        Server-->>ShareDB: pong
    end
    
    Note over Conn,Server: 自动重连
    alt 连接断开
        WS->>WS: 自动重连
        WS->>Server: 重新连接
        Server-->>WS: 连接恢复
    end
```

## 4. 文档订阅机制图

```mermaid
graph LR
    A[useRecord Hook] --> B[connection.get]
    B --> C[ShareDB Doc]
    C --> D[doc.fetch]
    D --> E[doc.subscribe]
    E --> F[op batch 监听]
    F --> G[createRecordInstance]
    G --> H[UI 更新]
    
    I[远程操作] --> J[WebSocket 接收]
    J --> K[ShareDB 同步]
    K --> F
    
    style C fill:#e1f5fe
    style F fill:#e8f5e8
    style G fill:#fff3e0
```

## 5. 后端处理流程图

```mermaid
flowchart TD
    A[HTTP API 请求] --> B[Record Update Service]
    B --> C[数据库事务开始]
    C --> D[更新记录]
    D --> E[计算字段处理]
    E --> F[生成 rawOpMap]
    F --> G[事务提交]
    G --> H[ShareDB Service]
    H --> I[修复附件操作]
    I --> J[Redis PubSub 发布]
    J --> K[广播到所有客户端]
    
    L[WebSocket 操作] --> M[ShareDB Submit 中间件]
    M --> N[操作验证]
    N --> O[数据库更新]
    O --> P[事务后处理]
    P --> H
    
    style C fill:#e1f5fe
    style G fill:#e8f5e8
    style J fill:#fff3e0
```

## 6. Redis PubSub 广播图

```mermaid
graph TB
    subgraph "发布端 (Publisher)"
        A[ShareDB Service] --> B[publishOpsMap]
        B --> C[Redis PubSub]
        C --> D[Channel: collection]
        C --> E[Channel: collection.docId]
    end
    
    subgraph "Redis 集群 (Redis Cluster)"
        D --> F[Redis Server 1]
        E --> G[Redis Server 2]
        F --> H[消息队列]
        G --> H
    end
    
    subgraph "订阅端 (Subscribers)"
        H --> I[客户端 1]
        H --> J[客户端 2]
        H --> K[客户端 N]
        I --> L[ShareDB 同步]
        J --> M[ShareDB 同步]
        K --> N[ShareDB 同步]
    end
    
    style C fill:#ff6b6b
    style H fill:#4ecdc4
    style L fill:#45b7d1
```

## 7. 错误处理流程图

```mermaid
flowchart TD
    A[用户编辑 Cell] --> B[Record.updateCell]
    B --> C[Optimistic Update]
    C --> D[HTTP API 调用]
    
    D --> E{API 调用成功?}
    E -->|是| F[更新成功]
    E -->|否| G[捕获错误]
    
    G --> H[onCommitLocal 回滚]
    H --> I[恢复原值]
    I --> J[显示错误提示]
    J --> K[用户重试]
    
    F --> L[计算字段更新]
    L --> M[完成更新]
    
    style C fill:#e1f5fe
    style H fill:#ffebee
    style J fill:#fff3e0
```

## 8. 性能优化架构图

```mermaid
graph TB
    subgraph "前端优化 (Frontend Optimization)"
        A[虚拟滚动] --> B[Canvas 渲染]
        B --> C[增量更新]
        C --> D[防抖处理]
    end
    
    subgraph "网络优化 (Network Optimization)"
        E[WebSocket 连接池] --> F[消息压缩]
        F --> G[批量操作]
        G --> H[连接复用]
    end
    
    subgraph "后端优化 (Backend Optimization)"
        I[Redis 缓存] --> J[数据库索引]
        J --> K[事务优化]
        K --> L[异步处理]
    end
    
    subgraph "数据优化 (Data Optimization)"
        M[增量同步] --> N[操作合并]
        N --> O[压缩传输]
        O --> P[智能更新]
    end
    
    D --> E
    H --> I
    L --> M
    P --> A
    
    style A fill:#e1f5fe
    style E fill:#e8f5e8
    style I fill:#fff3e0
    style M fill:#f3e5f5
```

## 9. 多用户协作场景图

```mermaid
sequenceDiagram
    participant U1 as 用户 1
    participant U2 as 用户 2
    participant U3 as 用户 3
    participant Server as 服务器
    participant Redis as Redis PubSub

    Note over U1,U3: 同时编辑同一 Cell
    
    U1->>Server: 编辑 Cell A
    U2->>Server: 编辑 Cell A
    U3->>Server: 编辑 Cell B
    
    Server->>Redis: 广播 U1 操作
    Server->>Redis: 广播 U2 操作
    Server->>Redis: 广播 U3 操作
    
    Redis->>U1: 接收 U2, U3 操作
    Redis->>U2: 接收 U1, U3 操作
    Redis->>U3: 接收 U1, U2 操作
    
    Note over U1,U3: ShareDB 操作转换
    U1->>U1: 应用 U2, U3 变更
    U2->>U2: 应用 U1, U3 变更
    U3->>U3: 应用 U1, U2 变更
    
    Note over U1,U3: 最终一致性
    U1->>U1: UI 同步更新
    U2->>U2: UI 同步更新
    U3->>U3: UI 同步更新
```

## 10. 系统监控和调试图

```mermaid
graph TB
    subgraph "监控指标 (Monitoring Metrics)"
        A[连接数] --> B[操作延迟]
        B --> C[错误率]
        C --> D[吞吐量]
    end
    
    subgraph "日志系统 (Logging System)"
        E[前端日志] --> F[WebSocket 日志]
        F --> G[后端日志]
        G --> H[Redis 日志]
    end
    
    subgraph "调试工具 (Debug Tools)"
        I[ShareDB 统计] --> J[连接管理]
        J --> K[操作追踪]
        K --> L[性能分析]
    end
    
    subgraph "告警系统 (Alert System)"
        M[连接异常] --> N[性能告警]
        N --> O[错误告警]
        O --> P[容量告警]
    end
    
    D --> E
    H --> I
    L --> M
    P --> A
    
    style A fill:#e1f5fe
    style E fill:#e8f5e8
    style I fill:#fff3e0
    style M fill:#ffebee
```

这些图表详细展示了 Teable ShareDB 系统的各个层面，包括数据流转、连接管理、错误处理、性能优化和监控调试等方面，为理解和维护系统提供了全面的技术参考。
