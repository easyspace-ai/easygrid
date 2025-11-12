package application

import (
	"context"
	"time"

	"github.com/easyspace-ai/luckdb/server/internal/domain/calculation/dependency"
)

// DependencyCacheAdapter 适配CacheService为CacheRepository接口
// 用于DependencyGraphRepository
type DependencyCacheAdapter struct {
	cacheService *CacheService
}

// NewDependencyCacheAdapter 创建依赖图缓存适配器
func NewDependencyCacheAdapter(cacheService *CacheService) dependency.CacheRepository {
	if cacheService == nil {
		// 如果没有缓存服务，返回一个no-op实现
		return &NoOpCacheRepository{}
	}
	return &DependencyCacheAdapter{
		cacheService: cacheService,
	}
}

// Get 从缓存获取数据
func (a *DependencyCacheAdapter) Get(ctx context.Context, key string) (string, error) {
	var value string
	err := a.cacheService.Get(ctx, key, &value)
	if err != nil {
		return "", err
	}
	return value, nil
}

// Set 设置缓存数据
func (a *DependencyCacheAdapter) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	return a.cacheService.Set(ctx, key, value, ttl)
}

// Delete 删除缓存数据
func (a *DependencyCacheAdapter) Delete(ctx context.Context, key string) error {
	return a.cacheService.Delete(ctx, key)
}

// Exists 检查缓存是否存在
func (a *DependencyCacheAdapter) Exists(ctx context.Context, key string) (bool, error) {
	var value string
	err := a.cacheService.Get(ctx, key, &value)
	if err != nil {
		return false, nil // 缓存不存在
	}
	return value != "", nil
}

// NoOpCacheRepository 无操作的缓存实现（当没有缓存服务时使用）
type NoOpCacheRepository struct{}

func (n *NoOpCacheRepository) Get(ctx context.Context, key string) (string, error) {
	return "", nil
}

func (n *NoOpCacheRepository) Set(ctx context.Context, key string, value string, ttl time.Duration) error {
	return nil
}

func (n *NoOpCacheRepository) Delete(ctx context.Context, key string) error {
	return nil
}

func (n *NoOpCacheRepository) Exists(ctx context.Context, key string) (bool, error) {
	return false, nil
}

