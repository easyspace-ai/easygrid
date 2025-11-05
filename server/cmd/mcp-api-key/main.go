package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/user"
	"path/filepath"
	"strings"
	"time"

	appdto "github.com/easyspace-ai/luckdb/server/internal/application/dto"
	"github.com/easyspace-ai/luckdb/server/internal/config"
	"github.com/easyspace-ai/luckdb/server/internal/container"
	"github.com/easyspace-ai/luckdb/server/internal/mcp/auth"
	"github.com/easyspace-ai/luckdb/server/internal/mcp/auth/repository"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	var (
		action      = flag.String("action", "", "Action: create, list, revoke")
		userID      = flag.String("user-id", "", "User ID")
		scopes      = flag.String("scopes", "", "Comma-separated scopes")
		description = flag.String("description", "", "API Key description")
		ttl         = flag.String("ttl", "", "Time to live (e.g., 1h, 24h, 7d)")
		keyID       = flag.String("key-id", "", "API Key ID (for revoke)")
		bases       = flag.String("bases", "", "Comma-separated base IDs allowlist (optional for create)")
		noExpire    = flag.Bool("no-expire", false, "Never expire (overrides -ttl)")
	)
	flag.Parse()

	if *action == "" {
		fmt.Println("Usage: mcp-api-key -action=<create|list|revoke> [options]")
		fmt.Println("")
		fmt.Println("Actions:")
		fmt.Println("  create    Create a new API key")
		fmt.Println("  list      List API keys for a user")
		fmt.Println("  revoke    Revoke an API key")
		fmt.Println("")
		fmt.Println("Options:")
		fmt.Println("  -user-id      User ID (required for create, list)")
		fmt.Println("  -scopes       Comma-separated scopes (optional for create)")
		fmt.Println("  -description  API Key description (optional for create)")
		fmt.Println("  -ttl          Time to live (optional, supports h/m/s and 'd' like 7d)")
		fmt.Println("  -no-expire    Never expire (overrides -ttl)")
		fmt.Println("  -bases        Comma-separated base IDs allowlist (optional for create)")
		fmt.Println("  -key-id       API Key ID (required for revoke)")
		os.Exit(1)
	}

	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 初始化日志（避免容器内部使用 logger.Nil 导致 panic）
	if err := logger.Init(logger.LoggerConfig{
		Level:      cfg.Logger.Level,
		Format:     cfg.Logger.Format,
		OutputPath: cfg.Logger.OutputPath,
	}); err != nil {
		log.Fatalf("Failed to init logger: %v", err)
	}

	// 连接数据库
	db, err := gorm.Open(postgres.Open(cfg.Database.GetDSN()), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// 创建仓储
	apiKeyRepo := repository.NewAPIKeyRepository(db)

	// 创建服务
	apiKeyConfig := &auth.APIKeyConfig{
		KeyLength:    32,
		SecretLength: 64,
		DefaultTTL:   8760 * time.Hour,  // 1年
		MaxTTL:       87600 * time.Hour, // 10年
		Header:       "X-MCP-API-Key",
		Format:       "key_id:key_secret",
	}
	apiKeyService := auth.NewAPIKeyService(apiKeyRepo, apiKeyConfig)

	ctx := context.Background()

	// 初始化容器以便可用 AuthService（用于用户名/密码登录）
	cont := container.NewContainer(cfg)
	if err := cont.Initialize(); err != nil {
		log.Fatalf("Failed to initialize container: %v", err)
	}
	defer cont.Close()

	switch *action {
	case "create":
		if *userID == "" {
			// 交互输入邮箱与密码，通过 AuthService 登录获取 userID
			reader := bufio.NewReader(os.Stdin)
			fmt.Print("Email: ")
			email, _ := reader.ReadString('\n')
			email = strings.TrimSpace(email)
			fmt.Print("Password: ")
			// 简化：直接读取明文（如需隐藏可改为 x/term），避免依赖外部包
			pwd, _ := reader.ReadString('\n')
			pwd = strings.TrimSpace(pwd)

			resp, err := cont.AuthService().Login(ctx, appdto.LoginRequest{Email: email, Password: pwd})
			if err != nil {
				log.Fatalf("Login failed: %v", err)
			}
			*userID = resp.User.ID
		}

		// 解析权限范围
		var scopeList []string
		if *scopes != "" {
			scopeList = strings.Split(*scopes, ",")
			for i, scope := range scopeList {
				scopeList[i] = strings.TrimSpace(scope)
			}
		} else {
			// 默认权限范围（与 MCP HTTP 授权模型对齐）
			scopeList = []string{
				"mcp.base.read", "mcp.base.write",
				"mcp.table.read", "mcp.table.write",
				"mcp.field.read", "mcp.field.write",
				"mcp.record.read", "mcp.record.write",
			}
		}

		// 解析 TTL / 永不过期
		var ttlDuration *time.Duration
		if *noExpire {
			// 先用默认流程创建，再将 ExpiresAt 置空并保存
			// 此处只标记，创建后处理
		} else if *ttl != "" {
			duration, err := parseTTL(*ttl)
			if err != nil {
				log.Fatalf("Invalid TTL format: %v", err)
			}
			ttlDuration = &duration
		}

		// 创建 API Key
		apiKey, err := apiKeyService.CreateAPIKey(ctx, *userID, scopeList, *description, ttlDuration)
		if err != nil {
			log.Fatalf("Failed to create API key: %v", err)
		}

		// 无过期：将 ExpiresAt 置空并更新
		if *noExpire {
			apiKey.ExpiresAt = nil
			if err := apiKeyService.UpdateAPIKey(ctx, apiKey); err != nil {
				log.Printf("Warning: failed to persist no-expire: %v", err)
			}
		}

		// 注入 base 白名单（可选）
		if *bases != "" {
			baseList := make([]string, 0)
			for _, b := range strings.Split(*bases, ",") {
				b = strings.TrimSpace(b)
				if b != "" {
					baseList = append(baseList, b)
				}
			}
			if apiKey.Metadata == nil {
				apiKey.Metadata = map[string]interface{}{}
			}
			apiKey.Metadata["base_allowlist"] = baseList
			if err := apiKeyService.UpdateAPIKey(ctx, apiKey); err != nil {
				log.Printf("Warning: failed to persist base allowlist: %v", err)
			}
		}

		fmt.Printf("✅ API Key created successfully!\n")
		fmt.Printf("ID: %s\n", apiKey.ID)
		fmt.Printf("Key ID: %s\n", apiKey.KeyID)
		fmt.Printf("Secret: %s\n", apiKey.Secret)
		fmt.Printf("Full Key: %s:%s\n", apiKey.KeyID, apiKey.Secret)
		fmt.Printf("User ID: %s\n", apiKey.UserID)
		fmt.Printf("Scopes: %s\n", strings.Join(apiKey.Scopes, ", "))
		fmt.Printf("Description: %s\n", apiKey.Description)
		if apiKey.ExpiresAt != nil {
			fmt.Printf("Expires At: %s\n", apiKey.ExpiresAt.Format(time.RFC3339))
		} else {
			fmt.Printf("Expires At: never\n")
		}
		fmt.Printf("Created At: %s\n", apiKey.CreatedAt.Format(time.RFC3339))

		// 保存到 ~/.easygrid/api-key
		fullKey := apiKey.KeyID + ":" + apiKey.Secret
		if err := saveAPIKeyToHomeDir(fullKey); err != nil {
			log.Printf("Warning: failed to save API key to ~/.easygrid/api-key: %v", err)
		} else {
			fmt.Printf("\n✅ API Key saved to ~/.easygrid/api-key\n")
		}

	case "list":
		if *userID == "" {
			// 交互输入邮箱与密码，登录获取 userID
			reader := bufio.NewReader(os.Stdin)
			fmt.Print("Email: ")
			email, _ := reader.ReadString('\n')
			email = strings.TrimSpace(email)
			fmt.Print("Password: ")
			pwd, _ := reader.ReadString('\n')
			pwd = strings.TrimSpace(pwd)

			resp, err := cont.AuthService().Login(ctx, appdto.LoginRequest{Email: email, Password: pwd})
			if err != nil {
				log.Fatalf("Login failed: %v", err)
			}
			*userID = resp.User.ID
		}

		// 列出用户的 API Keys
		apiKeys, err := apiKeyService.ListUserAPIKeys(ctx, *userID)
		if err != nil {
			log.Fatalf("Failed to list API keys: %v", err)
		}

		if len(apiKeys) == 0 {
			fmt.Printf("No API keys found for user: %s\n", *userID)
			return
		}

		fmt.Printf("API Keys for user: %s\n", *userID)
		fmt.Printf("Total: %d\n\n", len(apiKeys))

		for i, apiKey := range apiKeys {
			fmt.Printf("%d. ID: %s\n", i+1, apiKey.ID)
			fmt.Printf("   Key ID: %s\n", apiKey.KeyID)
			fmt.Printf("   Description: %s\n", apiKey.Description)
			fmt.Printf("   Scopes: %s\n", strings.Join(apiKey.Scopes, ", "))
			fmt.Printf("   Status: %s\n", getStatus(apiKey))
			fmt.Printf("   Created: %s\n", apiKey.CreatedAt.Format(time.RFC3339))
			if apiKey.ExpiresAt != nil {
				fmt.Printf("   Expires: %s\n", apiKey.ExpiresAt.Format(time.RFC3339))
			}
			if apiKey.LastUsedAt != nil {
				fmt.Printf("   Last Used: %s\n", apiKey.LastUsedAt.Format(time.RFC3339))
			}
			fmt.Println()
		}

	case "revoke":
		if *keyID == "" {
			log.Fatal("API Key ID is required for revoke action")
		}

		// 撤销 API Key
		err := apiKeyService.RevokeAPIKey(ctx, *keyID)
		if err != nil {
			log.Fatalf("Failed to revoke API key: %v", err)
		}

		fmt.Printf("✅ API Key revoked successfully: %s\n", *keyID)

	default:
		log.Fatalf("Unknown action: %s", *action)
	}
}

func getStatus(apiKey *auth.APIKey) string {
	if !apiKey.IsActive {
		return "INACTIVE"
	}
	if apiKey.IsExpired() {
		return "EXPIRED"
	}
	return "ACTIVE"
}

// parseTTL 支持标准 time.ParseDuration 以及简写的天单位（如 7d）
func parseTTL(s string) (time.Duration, error) {
	s = strings.TrimSpace(s)
	if strings.HasSuffix(s, "d") {
		// 去掉末尾 d，解析为天数
		daysStr := strings.TrimSuffix(s, "d")
		if daysStr == "" {
			return 0, fmt.Errorf("invalid days format")
		}
		// 允许小数天：转为小时
		// 使用 ParseDuration 兼容如 1.5h；这里直接转 float 不安全，简单按整数天处理
		// 为稳妥起见，先尝试整数，再尝试浮点
		if dInt, err := time.ParseDuration(daysStr + "h"); err == nil {
			// 这是错误路径，留给下方逻辑
			_ = dInt
		}
		// 尝试整数
		var hours int64
		{
			// 手动解析整数天
			// 忽略错误细节：只支持整数天即可
			var di int64 = 0
			for _, ch := range daysStr {
				if ch < '0' || ch > '9' {
					return 0, fmt.Errorf("invalid days: %s", daysStr)
				}
				di = di*10 + int64(ch-'0')
			}
			hours = di * 24
		}
		return time.Duration(hours) * time.Hour, nil
	}
	return time.ParseDuration(s)
}

// saveAPIKeyToHomeDir 保存 API Key 到 ~/.easygrid/api-key
func saveAPIKeyToHomeDir(fullKey string) error {
	// 获取用户主目录
	usr, err := user.Current()
	if err != nil {
		return fmt.Errorf("get user home: %w", err)
	}

	// 构建目录路径
	dir := filepath.Join(usr.HomeDir, ".easygrid")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("create dir: %w", err)
	}

	// 写入文件
	filePath := filepath.Join(dir, "api-key")
	if err := os.WriteFile(filePath, []byte(fullKey), 0600); err != nil {
		return fmt.Errorf("write file: %w", err)
	}

	return nil
}
