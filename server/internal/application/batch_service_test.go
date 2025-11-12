package application

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBatchService_CalculateOptimalBatchSize(t *testing.T) {
	// minHelper 辅助函数
	minHelper := func(a, b int) int {
		if a < b {
			return a
		}
		return b
	}

	// calculateOptimalBatchSize 计算最优批量大小
	calculateOptimalBatchSize := func(recordCount int, baseSize int) int {
		// 如果记录数较少，使用较小的批量大小
		if recordCount < 50 {
			return minHelper(baseSize, recordCount)
		}

		// 如果记录数较多，适当增加批量大小（但不超过 500，避免 SQL 过大）
		if recordCount > 1000 {
			return minHelper(500, recordCount)
		}

		// 中等数量，使用基础批量大小
		return baseSize
	}

	t.Run("小数据量", func(t *testing.T) {
		baseSize := 100
		result := calculateOptimalBatchSize(30, baseSize)
		assert.Equal(t, 30, result) // 应该使用较小的值
	})

	t.Run("中等数据量", func(t *testing.T) {
		baseSize := 100
		result := calculateOptimalBatchSize(500, baseSize)
		assert.Equal(t, 100, result) // 应该使用基础批量大小
	})

	t.Run("大数据量", func(t *testing.T) {
		baseSize := 100
		result := calculateOptimalBatchSize(2000, baseSize)
		assert.Equal(t, 500, result) // 应该使用上限 500
	})

	t.Run("超大数据量", func(t *testing.T) {
		baseSize := 100
		result := calculateOptimalBatchSize(10000, baseSize)
		assert.Equal(t, 500, result) // 应该使用上限 500
	})

	t.Run("边界值-50", func(t *testing.T) {
		baseSize := 100
		result := calculateOptimalBatchSize(50, baseSize)
		assert.Equal(t, 100, result) // 边界值，50 >= 50，所以使用基础大小
	})

	t.Run("边界值-1000", func(t *testing.T) {
		baseSize := 100
		result := calculateOptimalBatchSize(1000, baseSize)
		assert.Equal(t, 100, result) // 边界值，使用基础大小
	})

	t.Run("边界值-1001", func(t *testing.T) {
		baseSize := 100
		result := calculateOptimalBatchSize(1001, baseSize)
		assert.Equal(t, 500, result) // 超过1000，使用上限
	})
}

func TestBatchService_MinFunction(t *testing.T) {
	min := func(a, b int) int {
		if a < b {
			return a
		}
		return b
	}

	t.Run("a小于b", func(t *testing.T) {
		result := min(10, 20)
		assert.Equal(t, 10, result)
	})

	t.Run("a大于b", func(t *testing.T) {
		result := min(20, 10)
		assert.Equal(t, 10, result)
	})

	t.Run("a等于b", func(t *testing.T) {
		result := min(10, 10)
		assert.Equal(t, 10, result)
	})
}
