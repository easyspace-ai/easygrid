package mcp

// ErrorCode 错误码常量
const (
	ErrorCodeAuthenticationFailed = -32001
	ErrorCodeAuthorizationFailed  = -32002
	ErrorCodeInternalError        = -32000
)

// AuthenticationFailedError 认证失败错误
type AuthenticationFailedError struct {
	Message string
}

func (e *AuthenticationFailedError) Error() string {
	return e.Message
}

// NewAuthenticationFailedError 创建认证失败错误
func NewAuthenticationFailedError(message string) error {
	return &AuthenticationFailedError{Message: message}
}

// IsAuthenticationFailedError 检查是否为认证失败错误
func IsAuthenticationFailedError(err error) bool {
	_, ok := err.(*AuthenticationFailedError)
	return ok
}

