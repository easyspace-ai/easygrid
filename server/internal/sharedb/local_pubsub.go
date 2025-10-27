package sharedb

import (
	"context"
	"sync"

	"go.uber.org/zap"
)

// LocalPubSub 本地发布订阅实现
type LocalPubSub struct {
	channels sync.Map // channel -> []chan *Operation
	logger   *zap.Logger
	mu       sync.RWMutex
}

// NewLocalPubSub 创建本地发布订阅
func NewLocalPubSub(logger *zap.Logger) PubSub {
	return &LocalPubSub{
		logger: logger,
	}
}

// Publish 发布消息
func (p *LocalPubSub) Publish(ctx context.Context, channels []string, op *Operation) error {
	p.mu.RLock()
	defer p.mu.RUnlock()

	for _, channel := range channels {
		// 获取频道的订阅者
		subscribersInterface, exists := p.channels.Load(channel)
		if !exists {
			continue
		}

		subscribers := subscribersInterface.([]chan *Operation)
		
		// 向所有订阅者发送消息
		for _, subscriber := range subscribers {
			select {
			case subscriber <- op:
			case <-ctx.Done():
				return ctx.Err()
			default:
				// 如果订阅者通道已满，跳过
				p.logger.Warn("Subscriber channel is full, skipping",
					zap.String("channel", channel))
			}
		}
	}

	p.logger.Debug("Message published",
		zap.Strings("channels", channels),
		zap.String("op_type", string(op.Type)))

	return nil
}

// Subscribe 订阅频道
func (p *LocalPubSub) Subscribe(ctx context.Context, channel string, handler func(*Operation)) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	// 创建订阅者通道
	subscriber := make(chan *Operation, 100) // 缓冲100个消息

	// 获取或创建频道的订阅者列表
	subscribersInterface, _ := p.channels.LoadOrStore(channel, make([]chan *Operation, 0))
	subscribers := subscribersInterface.([]chan *Operation)
	subscribers = append(subscribers, subscriber)
	p.channels.Store(channel, subscribers)

	p.logger.Debug("Subscribed to channel", zap.String("channel", channel))

	// 启动处理协程
	go func() {
		defer func() {
			// 取消订阅
			p.Unsubscribe(ctx, channel)
		}()

		for {
			select {
			case <-ctx.Done():
				return
			case op := <-subscriber:
				if op != nil {
					handler(op)
				}
			}
		}
	}()

	return nil
}

// Unsubscribe 取消订阅
func (p *LocalPubSub) Unsubscribe(ctx context.Context, channel string) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	subscribersInterface, exists := p.channels.Load(channel)
	if !exists {
		return nil
	}

	subscribers := subscribersInterface.([]chan *Operation)
	
	// 关闭所有订阅者通道
	for _, subscriber := range subscribers {
		close(subscriber)
	}

	// 删除频道
	p.channels.Delete(channel)

	p.logger.Debug("Unsubscribed from channel", zap.String("channel", channel))
	return nil
}

// Close 关闭发布订阅
func (p *LocalPubSub) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	// 关闭所有频道
	p.channels.Range(func(key, value interface{}) bool {
		subscribers := value.([]chan *Operation)
		for _, subscriber := range subscribers {
			close(subscriber)
		}
		p.channels.Delete(key)
		return true
	})

	p.logger.Info("Local pub/sub closed")
	return nil
}
