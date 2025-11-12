package field

import (
	"strings"
	"testing"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
	"github.com/stretchr/testify/assert"
)

func init() {
	if logger.Logger == nil {
		logger.Init(logger.LoggerConfig{
			Level:      "debug",
			Format:     "console",
			OutputPath: "stdout",
		})
	}
}

func TestFieldOptionsService_ExtractChoicesFromOptions(t *testing.T) {
	service := NewFieldOptionsService()

	tests := []struct {
		name     string
		options  map[string]interface{}
		wantLen  int
		wantNil  bool
	}{
		{
			name: "成功提取选择项",
			options: map[string]interface{}{
				"choices": []interface{}{
					map[string]interface{}{"id": "opt1", "name": "选项1", "color": "red"},
					map[string]interface{}{"id": "opt2", "name": "选项2", "color": "blue"},
				},
			},
			wantLen: 2,
			wantNil: false,
		},
		{
			name:    "nil选项",
			options: nil,
			wantLen: 0,
			wantNil: true,
		},
		{
			name:    "没有choices字段",
			options: map[string]interface{}{"other": "value"},
			wantLen: 0,
			wantNil: true,
		},
		{
			name: "choices不是数组",
			options: map[string]interface{}{
				"choices": "not an array",
			},
			wantLen: 0,
			wantNil: true,
		},
		{
			name: "部分选择项格式错误",
			options: map[string]interface{}{
				"choices": []interface{}{
					map[string]interface{}{"id": "opt1", "name": "选项1"},
					"invalid choice",
					map[string]interface{}{"id": "opt2", "name": "选项2"},
				},
			},
			wantLen: 2, // 只提取有效的选择项
			wantNil: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.ExtractChoicesFromOptions(tt.options)
			if tt.wantNil {
				assert.Nil(t, result)
			} else {
				assert.NotNil(t, result)
				assert.Len(t, result, tt.wantLen)
			}
		})
	}
}

func TestFieldOptionsService_ExtractExpressionFromOptions(t *testing.T) {
	service := NewFieldOptionsService()

	tests := []struct {
		name     string
		options  map[string]interface{}
		wantExpr string
	}{
		{
			name: "从formula字段提取",
			options: map[string]interface{}{
				"formula": "{field1} + {field2}",
			},
			wantExpr: "{field1} + {field2}",
		},
		{
			name: "从expression字段提取",
			options: map[string]interface{}{
				"expression": "{field1} * 2",
			},
			wantExpr: "{field1} * 2",
		},
		{
			name: "formula优先于expression",
			options: map[string]interface{}{
				"formula":    "{field1} + {field2}",
				"expression": "{field1} * 2",
			},
			wantExpr: "{field1} + {field2}",
		},
		{
			name:    "nil选项",
			options: nil,
			wantExpr: "",
		},
		{
			name:    "没有表达式字段",
			options: map[string]interface{}{"other": "value"},
			wantExpr: "",
		},
		{
			name: "空表达式",
			options: map[string]interface{}{
				"formula": "",
			},
			wantExpr: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.ExtractExpressionFromOptions(tt.options)
			assert.Equal(t, tt.wantExpr, result)
		})
	}
}

func TestFieldOptionsService_ExtractRollupOptionsFromOptions(t *testing.T) {
	service := NewFieldOptionsService()

	tests := []struct {
		name            string
		options         map[string]interface{}
		wantLinkFieldID string
		wantRollupFieldID string
		wantAggFunc     string
	}{
		{
			name: "成功提取Rollup选项",
			options: map[string]interface{}{
				"linkFieldId":    "fld_link_123",
				"rollupFieldId":  "fld_rollup_456",
				"aggregationFunc": "sum",
			},
			wantLinkFieldID: "fld_link_123",
			wantRollupFieldID: "fld_rollup_456",
			wantAggFunc: "sum",
		},
		{
			name:    "nil选项",
			options: nil,
			wantLinkFieldID: "",
			wantRollupFieldID: "",
			wantAggFunc: "",
		},
		{
			name: "部分选项缺失",
			options: map[string]interface{}{
				"linkFieldId": "fld_link_123",
			},
			wantLinkFieldID: "fld_link_123",
			wantRollupFieldID: "",
			wantAggFunc: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			linkFieldID, rollupFieldID, aggFunc := service.ExtractRollupOptionsFromOptions(tt.options)
			assert.Equal(t, tt.wantLinkFieldID, linkFieldID)
			assert.Equal(t, tt.wantRollupFieldID, rollupFieldID)
			assert.Equal(t, tt.wantAggFunc, aggFunc)
		})
	}
}

func TestFieldOptionsService_ExtractLookupOptionsFromOptions(t *testing.T) {
	service := NewFieldOptionsService()

	tests := []struct {
		name            string
		options         map[string]interface{}
		wantLinkFieldID string
		wantLookupFieldID string
	}{
		{
			name: "成功提取Lookup选项",
			options: map[string]interface{}{
				"linkFieldId":  "fld_link_123",
				"lookupFieldId": "fld_lookup_456",
			},
			wantLinkFieldID: "fld_link_123",
			wantLookupFieldID: "fld_lookup_456",
		},
		{
			name:    "nil选项",
			options: nil,
			wantLinkFieldID: "",
			wantLookupFieldID: "",
		},
		{
			name: "部分选项缺失",
			options: map[string]interface{}{
				"linkFieldId": "fld_link_123",
			},
			wantLinkFieldID: "fld_link_123",
			wantLookupFieldID: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			linkFieldID, lookupFieldID := service.ExtractLookupOptionsFromOptions(tt.options)
			assert.Equal(t, tt.wantLinkFieldID, linkFieldID)
			assert.Equal(t, tt.wantLookupFieldID, lookupFieldID)
		})
	}
}

// fieldOptionsWrapper 包装器，用于适配FieldOptionsService的接口
type fieldOptionsWrapper struct {
	field *entity.Field
}

func (w *fieldOptionsWrapper) Options() *valueobject.FieldOptions {
	return w.field.Options()
}

func (w *fieldOptionsWrapper) UpdateOptions(opts *valueobject.FieldOptions) {
	_ = w.field.UpdateOptions(opts) // 忽略error
}

func (w *fieldOptionsWrapper) Type() valueobject.FieldType {
	return w.field.Type()
}

func TestFieldOptionsService_ApplyCommonFieldOptions(t *testing.T) {
	service := NewFieldOptionsService()

	tests := []struct {
		name    string
		options map[string]interface{}
		verify  func(*testing.T, *entity.Field)
	}{
		{
			name: "应用ShowAs配置",
			options: map[string]interface{}{
				"showAs": map[string]interface{}{
					"type":  "badge",
					"color": "red",
				},
			},
			verify: func(t *testing.T, f *entity.Field) {
				opts := f.Options()
				assert.NotNil(t, opts)
				assert.NotNil(t, opts.ShowAs)
				assert.Equal(t, "badge", opts.ShowAs.Type)
				assert.Equal(t, "red", opts.ShowAs.Color)
			},
		},
		{
			name: "应用Formatting配置",
			options: map[string]interface{}{
				"formatting": map[string]interface{}{
					"type":       "number",
					"dateFormat": "YYYY-MM-DD",
					"precision":  float64(2),
					"showCommas": true,
				},
			},
			verify: func(t *testing.T, f *entity.Field) {
				opts := f.Options()
				assert.NotNil(t, opts)
				assert.NotNil(t, opts.Formatting)
				assert.Equal(t, "number", opts.Formatting.Type)
				assert.Equal(t, "YYYY-MM-DD", opts.Formatting.DateFormat)
				assert.Equal(t, 2, *opts.Formatting.Precision)
				assert.True(t, opts.Formatting.ShowCommas)
			},
		},
		{
			name:    "nil选项",
			options: nil,
			verify: func(t *testing.T, f *entity.Field) {
				// 不应该改变字段
			},
		},
		{
			name:    "空选项",
			options: map[string]interface{}{},
			verify: func(t *testing.T, f *entity.Field) {
				// 不应该改变字段
			},
		},
		{
			name: "number类型应用defaultValue",
			options: map[string]interface{}{
				"defaultValue": float64(100),
			},
			verify: func(t *testing.T, f *entity.Field) {
				opts := f.Options()
				assert.NotNil(t, opts)
				assert.NotNil(t, opts.Number)
				assert.NotNil(t, opts.Number.DefaultValue)
				assert.Equal(t, float64(100), *opts.Number.DefaultValue)
			},
		},
		{
			name: "singleSelect类型应用defaultValue",
			options: map[string]interface{}{
				"defaultValue": "option1",
			},
			verify: func(t *testing.T, f *entity.Field) {
				opts := f.Options()
				assert.NotNil(t, opts)
				assert.NotNil(t, opts.Select)
				assert.Equal(t, "option1", opts.Select.DefaultValue)
			},
		},
		{
			name: "date类型应用defaultValue",
			options: map[string]interface{}{
				"defaultValue": "2024-01-01",
			},
			verify: func(t *testing.T, f *entity.Field) {
				opts := f.Options()
				assert.NotNil(t, opts)
				assert.NotNil(t, opts.Date)
				assert.NotNil(t, opts.Date.DefaultValue)
				assert.Equal(t, "2024-01-01", *opts.Date.DefaultValue)
			},
		},
		{
			name: "formatting配置包含precision",
			options: map[string]interface{}{
				"formatting": map[string]interface{}{
					"precision": float64(3),
				},
			},
			verify: func(t *testing.T, f *entity.Field) {
				opts := f.Options()
				assert.NotNil(t, opts)
				assert.NotNil(t, opts.Formatting)
				assert.NotNil(t, opts.Formatting.Precision)
				assert.Equal(t, 3, *opts.Formatting.Precision)
			},
		},
		{
			name: "formatting配置showCommas为false",
			options: map[string]interface{}{
				"formatting": map[string]interface{}{
					"showCommas": false,
				},
			},
			verify: func(t *testing.T, f *entity.Field) {
				opts := f.Options()
				assert.NotNil(t, opts)
				assert.NotNil(t, opts.Formatting)
				assert.False(t, opts.Formatting.ShowCommas)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 为每个测试创建新字段，根据测试需要设置不同的字段类型
			fieldName, _ := valueobject.NewFieldName("test_field")
			var fieldType valueobject.FieldType
			
			// 根据测试名称确定字段类型
			if strings.Contains(tt.name, "number") {
				fieldType, _ = valueobject.NewFieldType("number")
			} else if strings.Contains(tt.name, "singleSelect") {
				fieldType, _ = valueobject.NewFieldType("singleSelect")
			} else if strings.Contains(tt.name, "date") {
				fieldType, _ = valueobject.NewFieldType("date")
			} else {
				fieldType, _ = valueobject.NewFieldType("singleLineText")
			}
			
			field, _ := entity.NewField("tbl_123", fieldName, fieldType, "user_123")

			// 使用包装器适配接口
			wrapper := &fieldOptionsWrapper{field: field}
			service.ApplyCommonFieldOptions(wrapper, tt.options)
			tt.verify(t, field)
		})
	}
}

