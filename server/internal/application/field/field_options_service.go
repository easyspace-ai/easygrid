package field

import (
	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
)

// FieldOptionsService 字段选项处理服务
// 职责：字段选项提取和处理（纯函数服务，无状态）
type FieldOptionsService struct{}

// NewFieldOptionsService 创建字段选项服务
func NewFieldOptionsService() *FieldOptionsService {
	return &FieldOptionsService{}
}

// ExtractChoicesFromOptions 提取选择项
func (s *FieldOptionsService) ExtractChoicesFromOptions(options map[string]interface{}) []valueobject.SelectChoice {
	if options == nil {
		return nil
	}

	choicesData, ok := options["choices"]
	if !ok {
		return nil
	}

	choicesArray, ok := choicesData.([]interface{})
	if !ok {
		return nil
	}

	choices := make([]valueobject.SelectChoice, 0, len(choicesArray))
	for _, item := range choicesArray {
		choiceMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		choice := valueobject.SelectChoice{}
		if id, ok := choiceMap["id"].(string); ok {
			choice.ID = id
		}
		if name, ok := choiceMap["name"].(string); ok {
			choice.Name = name
		}
		if color, ok := choiceMap["color"].(string); ok {
			choice.Color = color
		}

		choices = append(choices, choice)
	}

	return choices
}

// ExtractExpressionFromOptions 提取表达式
func (s *FieldOptionsService) ExtractExpressionFromOptions(options map[string]interface{}) string {
	if options == nil {
		return ""
	}

	// 支持 formula 和 expression 两种格式（兼容前端SDK）
	if expr, ok := options["formula"].(string); ok && expr != "" {
		return expr
	}
	if expr, ok := options["expression"].(string); ok && expr != "" {
		return expr
	}

	return ""
}

// ExtractRollupOptionsFromOptions 提取Rollup选项
func (s *FieldOptionsService) ExtractRollupOptionsFromOptions(options map[string]interface{}) (linkFieldID, rollupFieldID, aggregationFunc string) {
	if options == nil {
		return "", "", ""
	}

	if linkFieldIDVal, ok := options["linkFieldId"].(string); ok {
		linkFieldID = linkFieldIDVal
	}
	if rollupFieldIDVal, ok := options["rollupFieldId"].(string); ok {
		rollupFieldID = rollupFieldIDVal
	}
	if aggFuncVal, ok := options["aggregationFunc"].(string); ok {
		aggregationFunc = aggFuncVal
	}

	return linkFieldID, rollupFieldID, aggregationFunc
}

// ExtractLookupOptionsFromOptions 提取Lookup选项
func (s *FieldOptionsService) ExtractLookupOptionsFromOptions(options map[string]interface{}) (linkFieldID, lookupFieldID string) {
	if options == nil {
		return "", ""
	}

	if linkFieldIDVal, ok := options["linkFieldId"].(string); ok {
		linkFieldID = linkFieldIDVal
	}
	if lookupFieldIDVal, ok := options["lookupFieldId"].(string); ok {
		lookupFieldID = lookupFieldIDVal
	}

	return linkFieldID, lookupFieldID
}

// ApplyCommonFieldOptions 应用通用选项
// 注意：这是一个简化的实现，完整的实现需要根据字段类型设置不同的选项
func (s *FieldOptionsService) ApplyCommonFieldOptions(field interface {
	Options() *valueobject.FieldOptions
	UpdateOptions(*valueobject.FieldOptions)
	Type() valueobject.FieldType
}, options map[string]interface{}) {
	if options == nil || len(options) == 0 {
		return
	}

	currentOptions := field.Options()
	if currentOptions == nil {
		currentOptions = valueobject.NewFieldOptions()
	}

	// 应用通用的 ShowAs 配置
	if showAsData, ok := options["showAs"].(map[string]interface{}); ok {
		currentOptions.ShowAs = &valueobject.ShowAsOptions{
			Type:   getStringFromMap(showAsData, "type"),
			Color:  getStringFromMap(showAsData, "color"),
			Config: showAsData,
		}
	}

	// 应用通用的 Formatting 配置
	if formattingData, ok := options["formatting"].(map[string]interface{}); ok {
		formatting := &valueobject.FormattingOptions{
			Type:       getStringFromMap(formattingData, "type"),
			DateFormat: getStringFromMap(formattingData, "dateFormat"),
			TimeFormat: getStringFromMap(formattingData, "timeFormat"),
			TimeZone:   getStringFromMap(formattingData, "timeZone"),
			Currency:   getStringFromMap(formattingData, "currency"),
			ShowCommas: getBoolFromMap(formattingData, "showCommas"),
		}
		if precision, ok := formattingData["precision"].(float64); ok {
			p := int(precision)
			formatting.Precision = &p
		}
		currentOptions.Formatting = formatting
	}

	// 根据字段类型应用特定配置（defaultValue等）
	fieldType := field.Type().String()
	switch fieldType {
	case "number":
		if currentOptions.Number == nil {
			currentOptions.Number = &valueobject.NumberOptions{}
		}
		if defaultValue, ok := options["defaultValue"].(float64); ok {
			currentOptions.Number.DefaultValue = &defaultValue
		}
	case "singleSelect", "multipleSelect":
		if currentOptions.Select == nil {
			currentOptions.Select = &valueobject.SelectOptions{}
		}
		if defaultValue, ok := options["defaultValue"]; ok {
			currentOptions.Select.DefaultValue = defaultValue
		}
	case "date", "datetime":
		if currentOptions.Date == nil {
			currentOptions.Date = &valueobject.DateOptions{}
		}
		if defaultValue, ok := options["defaultValue"].(string); ok {
			currentOptions.Date.DefaultValue = &defaultValue
		}
	}

	// 更新字段选项
	field.UpdateOptions(currentOptions)
}

// getStringFromMap 从 map 中安全获取字符串
func getStringFromMap(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

// getBoolFromMap 从 map 中安全获取布尔值
func getBoolFromMap(m map[string]interface{}, key string) bool {
	if v, ok := m[key].(bool); ok {
		return v
	}
	return false
}

