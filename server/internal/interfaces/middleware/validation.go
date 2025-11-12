package middleware

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"

	pkgErrors "github.com/easyspace-ai/luckdb/server/pkg/errors"
)

// ValidationMiddleware 输入验证中间件
// 防止SQL注入、XSS等安全问题
func ValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 验证路径参数
		if err := validatePathParams(c); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
			})
			c.Abort()
			return
		}

		// 验证查询参数
		if err := validateQueryParams(c); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": err.Error(),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// validatePathParams 验证路径参数
func validatePathParams(c *gin.Context) error {
	// 获取所有路径参数
	params := c.Params
	for _, param := range params {
		// 验证ID格式（防止SQL注入）
		if strings.Contains(param.Key, "id") || strings.Contains(param.Key, "Id") || strings.Contains(param.Key, "ID") {
			if err := validateID(param.Value); err != nil {
				return pkgErrors.ErrValidationFailed.WithMessage("无效的ID格式: " + err.Error())
			}
		}

		// 验证字符串长度
		if len(param.Value) > 255 {
			return pkgErrors.ErrValidationFailed.WithMessage("参数值过长")
		}

		// 检查危险字符（防止SQL注入和XSS）
		if containsDangerousChars(param.Value) {
			return pkgErrors.ErrValidationFailed.WithMessage("参数包含非法字符")
		}
	}

	return nil
}

// validateQueryParams 验证查询参数
func validateQueryParams(c *gin.Context) error {
	query := c.Request.URL.Query()
	
	for key, values := range query {
		for _, value := range values {
			// 验证字符串长度
			if len(value) > 10000 {
				return pkgErrors.ErrValidationFailed.WithMessage("查询参数值过长: " + key)
			}

			// 检查危险字符
			if containsDangerousChars(value) {
				return pkgErrors.ErrValidationFailed.WithMessage("查询参数包含非法字符: " + key)
			}
		}
	}

	return nil
}

// validateID 验证ID格式
func validateID(id string) error {
	if id == "" {
		return pkgErrors.ErrValidationFailed.WithMessage("ID不能为空")
	}

	// ID格式：字母数字下划线，长度1-100
	idPattern := regexp.MustCompile(`^[a-zA-Z0-9_]{1,100}$`)
	if !idPattern.MatchString(id) {
		return pkgErrors.ErrValidationFailed.WithMessage("ID格式无效")
	}

	return nil
}

// containsDangerousChars 检查是否包含危险字符
func containsDangerousChars(s string) bool {
	// SQL注入相关字符
	sqlKeywords := []string{
		"'", "\"", ";", "--", "/*", "*/", "xp_", "sp_",
		"UNION", "SELECT", "INSERT", "UPDATE", "DELETE",
		"DROP", "CREATE", "ALTER", "EXEC", "EXECUTE",
	}

	upperS := strings.ToUpper(s)
	for _, keyword := range sqlKeywords {
		if strings.Contains(upperS, strings.ToUpper(keyword)) {
			return true
		}
	}

	// XSS相关字符
	xssChars := []string{"<script", "</script", "javascript:", "onerror=", "onload="}
	lowerS := strings.ToLower(s)
	for _, char := range xssChars {
		if strings.Contains(lowerS, char) {
			return true
		}
	}

	return false
}

// ValidateStruct 验证结构体
func ValidateStruct(s interface{}) error {
	validate := validator.New()
	if err := validate.Struct(s); err != nil {
		var errors []string
		for _, err := range err.(validator.ValidationErrors) {
			errors = append(errors, err.Error())
		}
		return pkgErrors.ErrValidationFailed.WithMessage(strings.Join(errors, "; "))
	}
	return nil
}

