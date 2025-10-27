/**
 * 环境变量管理工具
 * 提供 .env 文件的创建、验证和管理功能
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

export interface EnvConfig {
  apiUrl: string;
  apiTimeout: number;
  testEmail: string;
  testPassword: string;
  spaceId?: string;
  baseId?: string;
  tableId?: string;
  debug: boolean;
  verboseLogging: boolean;
  yjsEnabled: boolean;
  yjsDebug: boolean;
  sseEnabled: boolean;
  sseReconnectInterval: number;
  sseMaxReconnectAttempts: number;
  testTimeout: number;
  testCleanup: boolean;
  testParallel: boolean;
}

export class EnvManager {
  private envPath: string;
  private examplePath: string;

  constructor() {
    // 获取当前文件的目录路径（ES 模块兼容）
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    this.envPath = path.join(__dirname, '../.env');
    this.examplePath = path.join(__dirname, '../.env.example');
  }

  /**
   * 创建 .env.example 文件
   */
  createExampleFile(): void {
    const exampleContent = `# LuckDB SDK 测试环境配置示例
# 复制此文件为 .env 并根据需要修改配置

# API 配置
API_URL=http://localhost:8888
API_TIMEOUT=30000

# 测试账户配置
TEST_EMAIL=admin@126.com
TEST_PASSWORD=Pmker123

# 目标资源配置（可选，如果不设置会使用发现模式）
SPACE_ID=spc_rtpLk96gJHLeYTv7JJMlo
BASE_ID=7ec1e878-91b9-4c1b-ad86-05cdf801318f
TABLE_ID=tbl_Pweb3NpbtiUb4Fwbi90WP

# 调试配置
DEBUG=true
VERBOSE_LOGGING=false

# YJS 配置
YJS_ENABLED=true
YJS_DEBUG=false

# SSE 配置
SSE_ENABLED=true
SSE_RECONNECT_INTERVAL=5000
SSE_MAX_RECONNECT_ATTEMPTS=10

# 测试配置
TEST_TIMEOUT=30000
TEST_CLEANUP=true
TEST_PARALLEL=false
`;

    fs.writeFileSync(this.examplePath, exampleContent);
    console.log('✅ 已创建 .env.example 文件');
  }

  /**
   * 创建 .env 文件
   */
  createEnvFile(): void {
    if (fs.existsSync(this.envPath)) {
      console.log('⚠️  .env 文件已存在');
      return;
    }

    this.createExampleFile();
    
    // 复制示例文件为 .env
    const exampleContent = fs.readFileSync(this.examplePath, 'utf8');
    fs.writeFileSync(this.envPath, exampleContent);
    console.log('✅ 已创建 .env 文件');
  }

  /**
   * 检查 .env 文件是否存在
   */
  hasEnvFile(): boolean {
    return fs.existsSync(this.envPath);
  }

  /**
   * 验证配置
   */
  validateConfig(config: EnvConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.apiUrl) {
      errors.push('API_URL 不能为空');
    }

    if (!config.testEmail) {
      errors.push('TEST_EMAIL 不能为空');
    }

    if (!config.testPassword) {
      errors.push('TEST_PASSWORD 不能为空');
    }

    if (config.apiTimeout <= 0) {
      errors.push('API_TIMEOUT 必须大于 0');
    }

    if (config.testTimeout <= 0) {
      errors.push('TEST_TIMEOUT 必须大于 0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 显示配置帮助信息
   */
  showHelp(): void {
    console.log(`
🔧 环境配置帮助

1. 创建配置文件：
   - 复制 .env.example 为 .env
   - 或运行: node -e "require('./common/env-manager').createEnvFile()"

2. 主要配置项：
   - API_URL: 服务器地址 (默认: http://localhost:8888)
   - TEST_EMAIL: 测试账户邮箱
   - TEST_PASSWORD: 测试账户密码
   - DEBUG: 是否开启调试模式 (true/false)
   - YJS_ENABLED: 是否启用 YJS (true/false)
   - SSE_ENABLED: 是否启用 SSE (true/false)

3. 目标资源配置（可选）：
   - SPACE_ID: 目标空间 ID
   - BASE_ID: 目标基础表 ID
   - TABLE_ID: 目标表格 ID

4. 如果不设置目标资源，测试会自动发现可用的资源

5. 示例 .env 文件：
   API_URL=http://localhost:8888
   TEST_EMAIL=admin@126.com
   TEST_PASSWORD=Pmker123
   DEBUG=true
   YJS_ENABLED=true
   SSE_ENABLED=true
`);
  }

  /**
   * 初始化环境配置
   */
  initialize(): void {
    console.log('🔧 初始化环境配置...\n');

    if (!this.hasEnvFile()) {
      console.log('📝 创建 .env 文件...');
      this.createEnvFile();
      console.log('✅ 请编辑 .env 文件以配置你的测试环境\n');
    } else {
      console.log('✅ .env 文件已存在\n');
    }

    this.showHelp();
  }
}

// 导出单例实例
export const envManager = new EnvManager();

// 如果直接运行此文件，则初始化配置
if (import.meta.url === `file://${process.argv[1]}`) {
  envManager.initialize();
}
