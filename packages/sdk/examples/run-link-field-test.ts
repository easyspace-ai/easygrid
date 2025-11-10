import LuckDBClient from '../src/index'
import { config } from './config'
import { runLinkFieldUpdateTest } from './demos/12-link-field-update-test'
import { createDemoContext } from './utils/types'
import { Logger } from './utils/logger'

const logger = new Logger('Link Field Update Test Runner')

async function main() {
  logger.section('Link 字段标题自动更新测试')

  const client = new LuckDBClient(config.serverURL)

  try {
    // 登录
    logger.info('正在登录...')
    await client.auth.login(config.testEmail, config.testPassword)
    logger.success('登录成功')

    // 创建上下文
    const context = createDemoContext(client)

    // 先创建 Space 和 Base（测试需要）
    logger.info('创建测试资源...')
    
    // 创建 Space
    logger.info('创建 Space...')
    const space = await client.spaces.create({
      name: `Link Test Space ${Date.now()}`,
      description: 'Link 字段测试空间'
    })
    context.spaceId = space.id
    logger.success(`Space 创建成功: ${space.id}`)
    
    // 等待 Space 创建完成
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 创建 Base
    logger.info('创建 Base...')
    const base = await client.bases.create(context.spaceId, {
      name: `Link Test Base ${Date.now()}`,
      icon: '📊'
    })
    context.baseId = base.id
    logger.success(`Base 创建成功: ${base.id}`)
    
    // 等待 Base 创建完成
    await new Promise(resolve => setTimeout(resolve, 500))

    // 运行测试
    const success = await runLinkFieldUpdateTest(context)

    if (success) {
      logger.success('\n✅ 测试完成')
      process.exit(0)
    } else {
      logger.error('\n❌ 测试失败')
      process.exit(1)
    }
  } catch (error: any) {
    logger.error(`\n❌ 测试运行失败: ${error.message}`)
    if (config.debug) {
      console.error(error)
    }
    process.exit(1)
  }
}

main().catch(error => {
  console.error('未处理的错误:', error)
  process.exit(1)
})


