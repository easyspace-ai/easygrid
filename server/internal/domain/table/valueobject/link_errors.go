package valueobject

import "errors"

// Link字段相关错误
var (
	ErrRelatedTableIDRequired  = errors.New("related table ID is required")
	ErrInvalidRelationType     = errors.New("invalid relation type")
	ErrSymmetricFieldRequired  = errors.New("symmetric field ID is required for symmetric relations")
	ErrInvalidLinkValue        = errors.New("invalid link value")
	ErrLookupFieldIDRequired    = errors.New("lookup field ID is required")
	ErrFkHostTableNameRequired = errors.New("fk host table name is required")
	ErrSelfKeyNameRequired     = errors.New("self key name is required")
	ErrForeignKeyNameRequired  = errors.New("foreign key name is required")
)
