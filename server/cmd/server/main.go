package main

import (
	"fmt"
	"os"

	"github.com/easyspace-ai/luckdb/server/internal/commands"
	"github.com/spf13/cobra"
)

var (
	// Version 版本号，通过 ldflags 注入
	Version   = "0.1.0"
	GitCommit = "dev"
	BuildTime = "unknown"

	// 配置文件路径
	configPath string
)

func main() {
	rootCmd := &cobra.Command{
		Use:   "luckdb",
		Short: "LuckDB - Modern Database Management Platform",
		Long: `LuckDB 是一个现代化的数据库管理平台，提供：
  - 强大的 API 服务
  - 实时协作功能
  - AI 增强能力`,
		Version: fmt.Sprintf("%s (commit: %s, built: %s)", Version, GitCommit, BuildTime),
	}

	// 全局标志
	rootCmd.PersistentFlags().StringVarP(&configPath, "config", "c", "config.yaml", "配置文件路径")

	// 添加子命令
	rootCmd.AddCommand(commands.NewServeCmd(&configPath, Version))
	rootCmd.AddCommand(commands.NewMigrateCmd(&configPath))
	rootCmd.AddCommand(commands.NewUtilCmd(&configPath))

	// 执行命令
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "错误: %v\n", err)
		os.Exit(1)
	}
}
