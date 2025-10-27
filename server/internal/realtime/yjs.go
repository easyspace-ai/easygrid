package realtime

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

// YjsManager YJS 协作管理器
type YjsManager struct {
	connections sync.Map // connection ID -> *YjsConnection
	logger      *zap.Logger
	ctx         context.Context
	cancel      context.CancelFunc
	mu          sync.RWMutex
}

// YjsConnection YJS 连接信息
type YjsConnection struct {
	ID         string
	UserID     string
	DocumentID string
	LastSeen   time.Time
	IsActive   bool
	Conn       *websocket.Conn
}

// NewYjsManager 创建 YJS 管理器
func NewYjsManager(logger *zap.Logger) *YjsManager {
	ctx, cancel := context.WithCancel(context.Background())

	manager := &YjsManager{
		logger: logger,
		ctx:    ctx,
		cancel: cancel,
	}

	// 启动清理协程
	go manager.cleanupRoutine()

	return manager
}

// HandleYjsWebSocket 处理 YJS WebSocket 连接
func (ym *YjsManager) HandleYjsWebSocket(c *gin.Context) {
	// 记录详细的请求信息用于调试
	ym.logger.Info("YJS WebSocket upgrade request received",
		zap.String("connection_header", c.Request.Header.Get("Connection")),
		zap.String("upgrade_header", c.Request.Header.Get("Upgrade")),
		zap.String("sec_websocket_key", c.Request.Header.Get("Sec-WebSocket-Key")),
		zap.String("sec_websocket_version", c.Request.Header.Get("Sec-WebSocket-Version")),
		zap.String("user_id", c.GetString("user_id")),
		zap.String("remote_addr", c.Request.RemoteAddr),
		zap.String("user_agent", c.Request.Header.Get("User-Agent")),
		zap.String("origin", c.Request.Header.Get("Origin")),
		zap.String("query", c.Request.URL.RawQuery),
		zap.String("path", c.Request.URL.Path))

	// 升级到 WebSocket
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // 在生产环境中应该进行更严格的检查
		},
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		ym.logger.Error("Failed to upgrade YJS WebSocket connection",
			zap.Error(err),
			zap.String("connection_header", c.Request.Header.Get("Connection")),
			zap.String("upgrade_header", c.Request.Header.Get("Upgrade")),
			zap.String("user_id", c.GetString("user_id")))
		return
	}
	defer conn.Close()

	// 从路径中提取文档ID
	documentID := c.Param("document_id")
	if documentID == "" {
		// 如果没有路径参数，尝试从查询参数获取
		documentID = c.Query("document")
	}

	// 创建连接信息
	connection := &YjsConnection{
		ID:         generateYjsConnectionID(),
		UserID:     c.GetString("user_id"),
		DocumentID: documentID,
		LastSeen:   time.Now(),
		IsActive:   true,
		Conn:       conn,
	}

	// 注册连接
	ym.connections.Store(connection.ID, connection)
	defer ym.connections.Delete(connection.ID)

	ym.logger.Info("🔌 YJS WebSocket 连接建立",
		zap.String("connection_id", connection.ID),
		zap.String("user_id", connection.UserID),
		zap.String("document_id", connection.DocumentID))

	// 处理连接消息
	ym.handleYjsConnection(connection)
}

// handleYjsConnection 处理 YJS 连接消息
func (ym *YjsManager) handleYjsConnection(connection *YjsConnection) {
	defer func() {
		if r := recover(); r != nil {
			ym.logger.Error("Panic in YJS connection handler", zap.Any("panic", r))
		}
	}()

	for {
		select {
		case <-ym.ctx.Done():
			return
		default:
		}

		// 读取消息
		messageType, data, err := connection.Conn.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				ym.logger.Info("YJS WebSocket connection closed normally",
					zap.String("connection_id", connection.ID))
			} else {
				ym.logger.Error("YJS WebSocket connection error",
					zap.Error(err),
					zap.String("connection_id", connection.ID))
			}
			break
		}

		// 更新最后活跃时间
		connection.LastSeen = time.Now()

		// 记录接收到的消息（用于调试）
		ym.logger.Debug("YJS message received",
			zap.String("connection_id", connection.ID),
			zap.String("message_type", fmt.Sprintf("%d", messageType)),
			zap.Int("data_length", len(data)))

		// 这里可以添加 YJS 协议处理逻辑
		// 目前只是简单地记录消息
	}
}

// GetStats 获取统计信息
func (ym *YjsManager) GetStats() map[string]interface{} {
	stats := map[string]interface{}{
		"connections": 0,
		"timestamp":   time.Now().Unix(),
	}

	// 统计连接数
	connectionCount := 0
	ym.connections.Range(func(key, value interface{}) bool {
		connectionCount++
		return true
	})
	stats["connections"] = connectionCount

	return stats
}

// Shutdown 关闭管理器
func (ym *YjsManager) Shutdown() error {
	ym.cancel()

	// 关闭所有连接
	ym.connections.Range(func(key, value interface{}) bool {
		conn := value.(*YjsConnection)
		conn.Conn.Close()
		return true
	})

	ym.logger.Info("YjsManager shutdown completed")
	return nil
}

// cleanupRoutine 清理协程
func (ym *YjsManager) cleanupRoutine() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ym.ctx.Done():
			return
		case <-ticker.C:
			ym.cleanupInactiveConnections()
		}
	}
}

// cleanupInactiveConnections 清理非活跃连接
func (ym *YjsManager) cleanupInactiveConnections() {
	now := time.Now()
	timeout := 5 * time.Minute

	ym.connections.Range(func(key, value interface{}) bool {
		conn := value.(*YjsConnection)
		if now.Sub(conn.LastSeen) > timeout {
			conn.IsActive = false
			ym.connections.Delete(key)
			ym.logger.Info("Cleaned up inactive YJS connection",
				zap.String("connection_id", conn.ID))
		}
		return true
	})
}

// generateYjsConnectionID 生成 YJS 连接ID
func generateYjsConnectionID() string {
	return "yjs_conn_" + time.Now().Format("20060102150405") + "_" + randomString(8)
}

// randomString 生成随机字符串
func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}
