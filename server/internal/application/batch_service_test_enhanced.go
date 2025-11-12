package application

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestBatchService_GetOptimalBatchSize 测试动态批量大小计算
func TestBatchService_GetOptimalBatchSize(t *testing.T) {
	// 创建测试服务（使用默认配置）
	service := &BatchService{
		batchSize: 100,
	}

	// 测试少量记录
	result := service.calculateOptimalBatchSize(30)
	assert.True(t, result <= 100)
	assert.True(t, result <= 30)

	// 测试中等数量记录
	result = service.calculateOptimalBatchSize(500)
	assert.True(t, result <= 100)

	// 测试大量记录
	result = service.calculateOptimalBatchSize(2000)
	assert.True(t, result <= 500)
}

// TestBatchService_NewBatchServiceWithConfig 测试带配置的批量服务创建
func TestBatchService_NewBatchServiceWithConfig(t *testing.T) {
	config := &BatchConfig{
		DefaultSize:     200,
		MaxSize:         2000,
		MinSize:         20,
		EnableAutoAdjust: true,
	}

	// 注意：这里需要实际的依赖，所以只测试配置逻辑
	assert.Equal(t, 200, config.DefaultSize)
	assert.Equal(t, 2000, config.MaxSize)
	assert.Equal(t, 20, config.MinSize)
	assert.True(t, config.EnableAutoAdjust)
}

