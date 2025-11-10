package valueobject

// FilterOptions 过滤选项（用于 Link 字段等）
type FilterOptions struct {
	Conjunction string            `json:"conjunction,omitempty"` // and, or
	Conditions  []FilterCondition `json:"conditions,omitempty"`
}

// FilterCondition 过滤条件
type FilterCondition struct {
	FieldID  string      `json:"fieldId"`
	Operator string      `json:"operator"` // is, isNot, contains, etc.
	Value    interface{} `json:"value"`
}

// LinkFieldOptions Link字段选项
// 参考 teable 的 ILinkFieldOptions schema
type LinkFieldOptions struct {
	// BaseID 跨 Base 链接支持（可选）
	BaseID string `json:"baseId,omitempty"`

	// Relationship 关系类型（从当前表到关联表的关系）
	// 对应 teable 的 relationship: oneOne, manyMany, oneMany, manyOne
	Relationship string `json:"relationship"`

	// ForeignTableID 关联的表ID（必需）
	// 对应 teable 的 foreignTableId
	ForeignTableID string `json:"foreignTableId"`

	// LookupFieldID 显示字段ID（必需）
	// 关联表中用于显示的字段ID
	LookupFieldID string `json:"lookupFieldId"`

	// IsOneWay 是否为单向关联（可选）
	// true: 不创建对称字段，性能更好
	// false: 创建对称字段，双向关联
	IsOneWay bool `json:"isOneWay,omitempty"`

	// FkHostTableName 存储外键的表名（必需）
	// ManyMany: junction table 名称
	// ManyOne: 当前表名
	// OneMany: 关联表名
	// OneOne: 其中一个表名
	FkHostTableName string `json:"fkHostTableName"`

	// SelfKeyName 自身主键字段名（必需）
	// 存储当前表主键的字段名
	SelfKeyName string `json:"selfKeyName"`

	// ForeignKeyName 外键字段名（必需）
	// 存储关联表主键的字段名
	ForeignKeyName string `json:"foreignKeyName"`

	// SymmetricFieldID 对称字段ID（可选）
	// 关联表中的对称字段ID，空表示单向关联
	SymmetricFieldID string `json:"symmetricFieldId,omitempty"`

	// FilterByViewID 视图过滤（可选）
	// 限制 link 字段中显示的记录数量
	FilterByViewID *string `json:"filterByViewId,omitempty"`

	// VisibleFieldIDs 可见字段列表（可选）
	// link 字段中显示的字段列表
	VisibleFieldIDs []string `json:"visibleFieldIds,omitempty"`

	// Filter 复杂过滤条件（可选）
	Filter *FilterOptions `json:"filter,omitempty"`

	// ==================== 向后兼容字段 ====================
	// RelatedTableID 关联的表ID（向后兼容，映射到 ForeignTableID）
	RelatedTableID string `json:"relatedTableId,omitempty"`

	// RelatedFieldID 对称字段ID（向后兼容，映射到 SymmetricFieldID）
	RelatedFieldID string `json:"relatedFieldId,omitempty"`

	// RelationType 关系类型（向后兼容，映射到 Relationship）
	RelationType RelationType `json:"relationType,omitempty"`

	// ForeignKeyFieldID 外键字段ID（向后兼容，已废弃）
	ForeignKeyFieldID string `json:"foreignKeyFieldId,omitempty"`

	// AllowMultiple 是否允许多个关联（向后兼容，从 Relationship 推导）
	AllowMultiple bool `json:"allowMultiple,omitempty"`
}

// NewLinkFieldOptions 创建Link字段选项
// 新版本：使用 teable 风格的参数
func NewLinkFieldOptions(
	foreignTableID string,
	relationship string,
	lookupFieldID string,
	fkHostTableName string,
	selfKeyName string,
	foreignKeyName string,
) (*LinkFieldOptions, error) {
	if foreignTableID == "" {
		return nil, ErrRelatedTableIDRequired
	}

	if lookupFieldID == "" {
		return nil, ErrLookupFieldIDRequired
	}

	if fkHostTableName == "" {
		return nil, ErrFkHostTableNameRequired
	}

	if selfKeyName == "" {
		return nil, ErrSelfKeyNameRequired
	}

	if foreignKeyName == "" {
		return nil, ErrForeignKeyNameRequired
	}

	// 转换 relationship 字符串到 RelationType（向后兼容）
	relationType := relationshipToRelationType(relationship)

	return &LinkFieldOptions{
		ForeignTableID:  foreignTableID,
		Relationship:    relationship,
		LookupFieldID:   lookupFieldID,
		FkHostTableName: fkHostTableName,
		SelfKeyName:     selfKeyName,
		ForeignKeyName:  foreignKeyName,
		IsOneWay:        false,
		// 向后兼容字段
		RelatedTableID: foreignTableID,
		RelationType:   relationType,
		AllowMultiple:  relationType == ManyToMany || relationType == OneToMany,
	}, nil
}

// NewLinkFieldOptionsLegacy 创建Link字段选项（向后兼容版本）
func NewLinkFieldOptionsLegacy(relatedTableID string, relationType RelationType) (*LinkFieldOptions, error) {
	if relatedTableID == "" {
		return nil, ErrRelatedTableIDRequired
	}

	if !relationType.IsValid() {
		return nil, ErrInvalidRelationType
	}

	// 转换 RelationType 到 relationship 字符串
	relationship := relationTypeToRelationship(relationType)

	return &LinkFieldOptions{
		RelatedTableID: relatedTableID,
		RelationType:   relationType,
		Relationship:   relationship,
		ForeignTableID: relatedTableID, // 映射到新字段
		IsOneWay:       false,
		AllowMultiple:  relationType == ManyToMany || relationType == OneToMany,
	}, nil
}

// relationshipToRelationType 将 relationship 字符串转换为 RelationType
func relationshipToRelationType(relationship string) RelationType {
	switch relationship {
	case "oneOne":
		return OneToOne
	case "manyMany":
		return ManyToMany
	case "oneMany":
		return OneToMany
	case "manyOne":
		return ManyToOne
	default:
		return ""
	}
}

// relationTypeToRelationship 将 RelationType 转换为 relationship 字符串
func relationTypeToRelationship(relationType RelationType) string {
	switch relationType {
	case OneToOne:
		return "oneOne"
	case ManyToMany:
		return "manyMany"
	case OneToMany:
		return "oneMany"
	case ManyToOne:
		return "manyOne"
	default:
		return ""
	}
}

// WithSymmetricField 设置对称字段
func (o *LinkFieldOptions) WithSymmetricField(fieldID string) *LinkFieldOptions {
	o.SymmetricFieldID = fieldID
	o.RelatedFieldID = fieldID // 向后兼容
	o.IsOneWay = false
	return o
}

// WithForeignKey 设置外键字段
func (o *LinkFieldOptions) WithForeignKey(fieldID string) *LinkFieldOptions {
	o.ForeignKeyFieldID = fieldID
	return o
}

// AsOneWay 设置为单向关联
func (o *LinkFieldOptions) AsOneWay() *LinkFieldOptions {
	o.IsOneWay = true
	o.SymmetricFieldID = ""
	o.RelatedFieldID = "" // 向后兼容
	return o
}

// Validate 验证Link字段选项
func (o *LinkFieldOptions) Validate() error {
	// 优先使用新字段，如果没有则使用向后兼容字段
	foreignTableID := o.ForeignTableID
	if foreignTableID == "" {
		foreignTableID = o.RelatedTableID
	}

	if foreignTableID == "" {
		return ErrRelatedTableIDRequired
	}

	// 验证 relationship
	relationship := o.Relationship
	if relationship == "" {
		// 从 RelationType 转换
		if o.RelationType.IsValid() {
			relationship = relationTypeToRelationship(o.RelationType)
		}
	}

	if relationship == "" {
		return ErrInvalidRelationType
	}

	// 验证必需字段（新版本）
	if o.LookupFieldID == "" {
		return ErrLookupFieldIDRequired
	}

	if o.FkHostTableName == "" {
		return ErrFkHostTableNameRequired
	}

	if o.SelfKeyName == "" {
		return ErrSelfKeyNameRequired
	}

	if o.ForeignKeyName == "" {
		return ErrForeignKeyNameRequired
	}

	// 对称关系需要对称字段ID
	relationType := o.RelationType
	if !relationType.IsValid() {
		relationType = relationshipToRelationType(relationship)
	}

	if relationType.IsSymmetric() && !o.IsOneWay {
		symmetricFieldID := o.SymmetricFieldID
		if symmetricFieldID == "" {
			symmetricFieldID = o.RelatedFieldID
		}
		if symmetricFieldID == "" {
			return ErrSymmetricFieldRequired
		}
	}

	return nil
}

// HasSymmetricField 是否有对称字段
func (o *LinkFieldOptions) HasSymmetricField() bool {
	if o.IsOneWay {
		return false
	}
	symmetricFieldID := o.SymmetricFieldID
	if symmetricFieldID == "" {
		symmetricFieldID = o.RelatedFieldID
	}
	return symmetricFieldID != ""
}

// NeedsSymmetricSync 是否需要对称同步
func (o *LinkFieldOptions) NeedsSymmetricSync() bool {
	if !o.HasSymmetricField() {
		return false
	}
	relationType := o.RelationType
	if !relationType.IsValid() {
		relationType = relationshipToRelationType(o.Relationship)
	}
	return relationType.IsSymmetric()
}

// GetForeignTableID 获取关联表ID（优先使用新字段）
func (o *LinkFieldOptions) GetForeignTableID() string {
	if o.ForeignTableID != "" {
		return o.ForeignTableID
	}
	return o.RelatedTableID
}

// GetSymmetricFieldID 获取对称字段ID（优先使用新字段）
func (o *LinkFieldOptions) GetSymmetricFieldID() string {
	if o.SymmetricFieldID != "" {
		return o.SymmetricFieldID
	}
	return o.RelatedFieldID
}

// GetRelationship 获取关系类型（优先使用新字段）
func (o *LinkFieldOptions) GetRelationship() string {
	if o.Relationship != "" {
		return o.Relationship
	}
	return relationTypeToRelationship(o.RelationType)
}

// GetRelationType 获取关系类型（优先使用新字段）
func (o *LinkFieldOptions) GetRelationType() RelationType {
	if o.RelationType.IsValid() {
		return o.RelationType
	}
	return relationshipToRelationType(o.Relationship)
}

// IsMultipleCellValue 判断是否为多值单元格
func (o *LinkFieldOptions) IsMultipleCellValue() bool {
	relationType := o.GetRelationType()
	return relationType == ManyToMany || relationType == OneToMany
}
