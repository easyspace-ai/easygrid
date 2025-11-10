package valueobject

// LinkCellValue Link 单元格值
// 参考 teable 的 ILinkCellValue
type LinkCellValue struct {
	// ID 关联记录的ID（必需）
	ID string `json:"id"`

	// Title 显示文本（可选）
	// 从 lookup field 提取的显示文本
	Title string `json:"title,omitempty"`
}

// NewLinkCellValue 创建 Link 单元格值
func NewLinkCellValue(id string, title string) *LinkCellValue {
	return &LinkCellValue{
		ID:    id,
		Title: title,
	}
}

// IsEmpty 判断是否为空
func (lcv *LinkCellValue) IsEmpty() bool {
	return lcv == nil || lcv.ID == ""
}

// ToArray 转换为数组（用于多值场景）
func ToLinkCellValueArray(value interface{}) []*LinkCellValue {
	if value == nil {
		return nil
	}

	// 如果是数组
	if arr, ok := value.([]interface{}); ok {
		result := make([]*LinkCellValue, 0, len(arr))
		for _, item := range arr {
			if lcv := toLinkCellValue(item); lcv != nil {
				result = append(result, lcv)
			}
		}
		return result
	}

	// 如果是单个值
	if lcv := toLinkCellValue(value); lcv != nil {
		return []*LinkCellValue{lcv}
	}

	return nil
}

// toLinkCellValue 将值转换为 LinkCellValue
func toLinkCellValue(value interface{}) *LinkCellValue {
	if value == nil {
		return nil
	}

	// 如果是 map
	if m, ok := value.(map[string]interface{}); ok {
		id, _ := m["id"].(string)
		if id == "" {
			return nil
		}
		title, _ := m["title"].(string)
		return NewLinkCellValue(id, title)
	}

	// 如果是字符串（仅 ID）
	if id, ok := value.(string); ok && id != "" {
		return NewLinkCellValue(id, "")
	}

	return nil
}

