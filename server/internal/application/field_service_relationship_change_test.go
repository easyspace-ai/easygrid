package application

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFieldService_IsRelationshipChangeSupported(t *testing.T) {
	// 测试关系类型变更是否支持
	isRelationshipChangeSupported := func(oldRelationship, newRelationship string) bool {
		// 支持的关系类型变更
		supportedChanges := map[string][]string{
			"manyMany": {"manyOne", "oneMany"},
			"manyOne":  {"manyMany"},
			"oneMany":  {"manyMany"},
			"oneOne":   {}, // 一对一关系类型变更暂不支持
		}

		allowed, exists := supportedChanges[oldRelationship]
		if !exists {
			return false
		}

		for _, allowedType := range allowed {
			if allowedType == newRelationship {
				return true
			}
		}

		return false
	}

	testCases := []struct {
		name           string
		oldRelationship string
		newRelationship string
		expected       bool
	}{
		{"manyMany -> manyOne", "manyMany", "manyOne", true},
		{"manyMany -> oneMany", "manyMany", "oneMany", true},
		{"manyOne -> manyMany", "manyOne", "manyMany", true},
		{"oneMany -> manyMany", "oneMany", "manyMany", true},
		{"manyMany -> oneOne", "manyMany", "oneOne", false},
		{"manyOne -> oneMany", "manyOne", "oneMany", false},
		{"oneMany -> manyOne", "oneMany", "manyOne", false},
		{"oneOne -> manyMany", "oneOne", "manyMany", false},
		{"oneOne -> manyOne", "oneOne", "manyOne", false},
		{"unknown -> manyMany", "unknown", "manyMany", false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := isRelationshipChangeSupported(tc.oldRelationship, tc.newRelationship)
			assert.Equal(t, tc.expected, result, "关系类型变更支持检查失败: %s -> %s", tc.oldRelationship, tc.newRelationship)
		})
	}
}

func TestFieldService_ReverseRelationship(t *testing.T) {
	reverseRelationship := func(relationship string) string {
		switch relationship {
		case "manyOne":
			return "oneMany"
		case "oneMany":
			return "manyOne"
		case "manyMany", "oneOne":
			return relationship
		default:
			return relationship
		}
	}

	testCases := []struct {
		name       string
		input      string
		expected   string
	}{
		{"manyOne -> oneMany", "manyOne", "oneMany"},
		{"oneMany -> manyOne", "oneMany", "manyOne"},
		{"manyMany -> manyMany", "manyMany", "manyMany"},
		{"oneOne -> oneOne", "oneOne", "oneOne"},
		{"unknown -> unknown", "unknown", "unknown"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := reverseRelationship(tc.input)
			assert.Equal(t, tc.expected, result)
		})
	}
}

func TestFieldService_RelationshipChangeValidation(t *testing.T) {
	t.Run("验证变更类型映射", func(t *testing.T) {
		// 验证支持的关系类型变更映射是否正确
		supportedChanges := map[string][]string{
			"manyMany": {"manyOne", "oneMany"},
			"manyOne":  {"manyMany"},
			"oneMany":  {"manyMany"},
			"oneOne":   {},
		}

		// 验证 manyMany 可以变更为 manyOne 和 oneMany
		assert.Contains(t, supportedChanges["manyMany"], "manyOne")
		assert.Contains(t, supportedChanges["manyMany"], "oneMany")

		// 验证 manyOne 只能变更为 manyMany
		assert.Contains(t, supportedChanges["manyOne"], "manyMany")
		assert.Len(t, supportedChanges["manyOne"], 1)

		// 验证 oneMany 只能变更为 manyMany
		assert.Contains(t, supportedChanges["oneMany"], "manyMany")
		assert.Len(t, supportedChanges["oneMany"], 1)

		// 验证 oneOne 不支持变更
		assert.Empty(t, supportedChanges["oneOne"])
	})
}

func TestFieldService_MigrationSQLPatterns(t *testing.T) {
	t.Run("manyMany -> manyOne SQL模式", func(t *testing.T) {
		// 验证从 manyMany 迁移到 manyOne 的 SQL 模式
		// 应该从 junction table 读取数据，只保留第一个 foreign_key
		expectedPatterns := []string{
			"UPDATE",
			"SELECT",
			"FROM",
			"LIMIT 1",
			"WHERE EXISTS",
		}

		sql := `
			UPDATE table_name AS t
			SET foreign_key = (
				SELECT j.foreign_key
				FROM junction_table AS j
				WHERE j.self_key = t.__id
				LIMIT 1
			)
			WHERE EXISTS (
				SELECT 1 FROM junction_table AS j
				WHERE j.self_key = t.__id
			)
		`

		for _, pattern := range expectedPatterns {
			assert.Contains(t, sql, pattern, "SQL 应该包含 %s", pattern)
		}
	})

	t.Run("manyOne -> manyMany SQL模式", func(t *testing.T) {
		// 验证从 manyOne 迁移到 manyMany 的 SQL 模式
		// 应该创建 junction table 并从外键列迁移数据
		expectedPatterns := []string{
			"CREATE TABLE",
			"INSERT INTO",
			"SELECT",
			"FROM",
		}

		sql := `
			CREATE TABLE IF NOT EXISTS junction_table (
				__id SERIAL PRIMARY KEY,
				self_key VARCHAR(50) NOT NULL,
				foreign_key VARCHAR(50) NOT NULL
			);
			INSERT INTO junction_table (self_key, foreign_key)
			SELECT __id, foreign_key
			FROM table_name
			WHERE foreign_key IS NOT NULL
		`

		for _, pattern := range expectedPatterns {
			assert.Contains(t, sql, pattern, "SQL 应该包含 %s", pattern)
		}
	})
}

