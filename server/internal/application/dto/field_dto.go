package dto

import (
	"time"

	fieldEntity "github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	fieldVO "github.com/easyspace-ai/luckdb/server/internal/domain/fields/valueobject"
)

// CreateFieldRequest 创建字段请求
type CreateFieldRequest struct {
	TableID  string                 `json:"tableId" binding:"required"` // ✅ 统一使用 camelCase
	Name     string                 `json:"name" binding:"required"`
	Type     string                 `json:"type" binding:"required"`
	Options  map[string]interface{} `json:"options"`
	Required bool                   `json:"required"`
	Unique   bool                   `json:"unique"`
    // 顶层默认值，兼容 SDK 传参
    DefaultValue interface{}        `json:"defaultValue"`
}

// UpdateFieldRequest 更新字段请求
type UpdateFieldRequest struct {
	Name        *string                `json:"name"`
	Description *string                `json:"description"`
	Options     map[string]interface{} `json:"options"`
	Required    *bool                  `json:"required"`
	Unique      *bool                  `json:"unique"`
	// 顶层默认值，兼容 SDK 传参
	DefaultValue interface{} `json:"defaultValue"`
}

// FieldResponse 字段响应
type FieldResponse struct {
	ID          string                 `json:"id"`
	TableID     string                 `json:"tableId"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"`
	Options     map[string]interface{} `json:"options"`
	Required    bool                   `json:"required"`
	Unique      bool                   `json:"unique"`
	IsPrimary   bool                   `json:"isPrimary"`
	Description string                 `json:"description"`
	CreatedAt   time.Time              `json:"createdAt"`
	UpdatedAt   time.Time              `json:"updatedAt"`
}

// FieldListResponse 字段列表响应
type FieldListResponse struct {
	Fields []*FieldResponse `json:"fields"`
}

// FromFieldEntity 从Domain实体转换为DTO
func FromFieldEntity(field *fieldEntity.Field) *FieldResponse {
	if field == nil {
		return nil
	}

	desc := ""
	if field.Description() != nil {
		desc = *field.Description()
	}

	return &FieldResponse{
		ID:          field.ID().String(),
		TableID:     field.TableID(),
		Name:        field.Name().String(),
		Type:        field.Type().String(),
		Options:     fieldOptionsToMap(field.Options()),
		Required:    field.IsRequired(),
		Unique:      field.IsUnique(),
		IsPrimary:   field.IsPrimary(),
		Description: desc,
		CreatedAt:   field.CreatedAt(),
		UpdatedAt:   field.UpdatedAt(),
	}
}

// fieldOptionsToMap 将FieldOptions转换为map（支持所有字段类型）
func fieldOptionsToMap(options *fieldVO.FieldOptions) map[string]interface{} {
	if options == nil {
		return nil
	}

	result := make(map[string]interface{})

	// Formula 选项
	if options.Formula != nil {
		result["formula"] = map[string]interface{}{
			"expression": options.Formula.Expression,
		}
		if options.Formula.TimeZone != "" {
			result["timeZone"] = options.Formula.TimeZone
		}
		if options.Formula.Formatting != nil {
			result["formatting"] = options.Formula.Formatting
		}
		if options.Formula.ShowAs != nil {
			result["showAs"] = options.Formula.ShowAs
		}
	}

	// Rollup 选项
	if options.Rollup != nil {
		result["rollup"] = map[string]interface{}{
			"link_field_id":        options.Rollup.LinkFieldID,
			"aggregation_function": options.Rollup.AggregationFunction,
		}
		if options.Rollup.RollupFieldID != "" {
			result["rollup_field_id"] = options.Rollup.RollupFieldID
		}
		if options.Rollup.Expression != "" {
			result["expression"] = options.Rollup.Expression
		}
		if options.Rollup.TimeZone != "" {
			result["timeZone"] = options.Rollup.TimeZone
		}
		if options.Rollup.Formatting != nil {
			result["formatting"] = options.Rollup.Formatting
		}
		if options.Rollup.ShowAs != nil {
			result["showAs"] = options.Rollup.ShowAs
		}
	}

	// Lookup 选项
	if options.Lookup != nil {
		result["lookup"] = map[string]interface{}{
			"link_field_id":   options.Lookup.LinkFieldID,
			"lookup_field_id": options.Lookup.LookupFieldID,
		}
		if options.Lookup.Formatting != nil {
			result["formatting"] = options.Lookup.Formatting
		}
		if options.Lookup.ShowAs != nil {
			result["showAs"] = options.Lookup.ShowAs
		}
	}

	// Select 选项（单选/多选字段）- 转换为扁平格式
	if options.Select != nil {
		// 将 choices 转换为前端期望的格式
		choices := make([]map[string]interface{}, 0, len(options.Select.Choices))
		for _, choice := range options.Select.Choices {
			choiceMap := map[string]interface{}{
				"id":   choice.ID,
				"name": choice.Name,
			}
			if choice.Color != "" {
				choiceMap["color"] = choice.Color
			}
			choices = append(choices, choiceMap)
		}
		result["choices"] = choices
		
		if options.Select.DefaultValue != nil {
			result["defaultValue"] = options.Select.DefaultValue
		}
		if options.Select.PreventAutoNewOptions {
			result["preventAutoNewOptions"] = options.Select.PreventAutoNewOptions
		}
	}

	// Link 选项
	if options.Link != nil {
		result["link"] = map[string]interface{}{
			"linked_table_id":     options.Link.LinkedTableID,
			"foreign_key_field_id": options.Link.ForeignKeyFieldID,
			"symmetric_field_id":   options.Link.SymmetricFieldID,
			"relationship":         options.Link.Relationship,
			"is_symmetric":         options.Link.IsSymmetric,
			"allow_multiple":       options.Link.AllowMultiple,
		}
		if options.Link.BaseID != "" {
			result["baseId"] = options.Link.BaseID
		}
		if options.Link.LookupFieldID != "" {
			result["lookupFieldId"] = options.Link.LookupFieldID
		}
		if options.Link.FilterByViewID != nil {
			result["filterByViewId"] = options.Link.FilterByViewID
		}
		if len(options.Link.VisibleFieldIDs) > 0 {
			result["visibleFieldIds"] = options.Link.VisibleFieldIDs
		}
		if options.Link.Filter != nil {
			result["filter"] = options.Link.Filter
		}
	}

	// Number 选项
	if options.Number != nil {
		if options.Number.Precision != nil {
			result["precision"] = *options.Number.Precision
		}
		if options.Number.Format != "" {
			result["numberFormat"] = options.Number.Format
		}
		if options.Number.Currency != "" {
			result["currency"] = options.Number.Currency
		}
		if options.Number.ShowCommas {
			result["showCommas"] = options.Number.ShowCommas
		}
		if options.Number.Min != nil {
			result["min"] = *options.Number.Min
		}
		if options.Number.Max != nil {
			result["max"] = *options.Number.Max
		}
		if options.Number.MinValue != nil {
			result["minValue"] = *options.Number.MinValue
		}
		if options.Number.MaxValue != nil {
			result["maxValue"] = *options.Number.MaxValue
		}
		if options.Number.DefaultValue != nil {
			result["defaultValue"] = *options.Number.DefaultValue
		}
		if options.Number.ShowAs != nil {
			result["showAs"] = options.Number.ShowAs
		}
	}

	// Date 选项
	if options.Date != nil {
		if options.Date.Format != "" {
			result["dateFormat"] = options.Date.Format
		}
		if options.Date.IncludeTime {
			result["includeTime"] = options.Date.IncludeTime
		}
		if options.Date.TimeFormat != "" {
			result["timeFormat"] = options.Date.TimeFormat
		}
		if options.Date.TimeZone != "" {
			result["timezone"] = options.Date.TimeZone
		}
		if options.Date.DefaultValue != nil {
			result["defaultValue"] = *options.Date.DefaultValue
		}
	}

	// AI 选项
	if options.AI != nil {
		result["ai"] = map[string]interface{}{
			"provider": options.AI.Provider,
			"model":    options.AI.Model,
			"prompt":   options.AI.Prompt,
		}
		if options.AI.Config != nil {
			result["aiConfig"] = options.AI.Config
		}
	}

	// Count 选项
	if options.Count != nil {
		result["count"] = map[string]interface{}{
			"link_field_id": options.Count.LinkFieldID,
		}
		if options.Count.Filter != "" {
			result["filterExpression"] = options.Count.Filter
		}
	}

	// Duration 选项
	if options.Duration != nil {
		result["durationFormat"] = options.Duration.Format
	}

	// Button 选项
	if options.Button != nil {
		result["button"] = map[string]interface{}{
			"label":  options.Button.Label,
			"action": options.Button.Action,
		}
		if options.Button.Config != nil {
			result["buttonConfig"] = options.Button.Config
		}
	}

	// User 选项
	if options.User != nil {
		result["isMultiple"] = options.User.IsMultiple
	}

	// Rating 选项
	if options.Rating != nil {
		result["rating"] = map[string]interface{}{
			"maxRating": options.Rating.Max,
		}
		if options.Rating.Icon != "" {
			result["icon"] = options.Rating.Icon
		}
	}

	// 通用配置
	if options.ShowAs != nil {
		result["showAs"] = options.ShowAs
	}
	if options.Formatting != nil {
		result["formatting"] = options.Formatting
	}

	return result
}

// FromFieldEntities 批量转换
func FromFieldEntities(fields []*fieldEntity.Field) []*FieldResponse {
	result := make([]*FieldResponse, len(fields))
	for i, field := range fields {
		result[i] = FromFieldEntity(field)
	}
	return result
}
