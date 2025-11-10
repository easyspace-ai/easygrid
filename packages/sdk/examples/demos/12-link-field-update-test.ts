import LuckDBClient from '../../src/index'
import { config } from '../config'
import { Logger } from '../utils/logger'
import { sleep, safeExecute } from '../utils/helpers'
import type { DemoContext } from '../utils/types'

const logger = new Logger('Link Field Update Test')

/**
 * 测试关联字段自动更新功能
 * 1. 创建源表和目标表
 * 2. 在目标表中创建关联字段，关联到源表
 * 3. 在目标表中创建记录，引用源表的记录
 * 4. 更新源表的记录（修改名称）
 * 5. 检查目标表中关联字段的 title 是否自动更新
 */
export async function runLinkFieldUpdateTest(context: DemoContext): Promise<boolean> {
  logger.section('关联字段自动更新测试')

  const { client } = context

  try {
    // 1. 创建源表（tags 表）
    logger.step(1, 6, '创建源表（tags 表）...')
    const sourceTable = await safeExecute(async () => {
      return await client.tables.create(context.baseId!, {
        name: `Tags 表 ${Date.now()}`,
        description: '源表，用于测试关联字段自动更新',
        fields: [
          {
            name: 'name',
            type: 'singleLineText',
            required: true
          }
        ]
      })
    }, '创建源表失败')

    if (!sourceTable) {
      throw new Error('无法创建源表')
    }

    logger.success(`源表创建成功: ID=${sourceTable.id}, Name=${sourceTable.name}`)
    const sourceTableId = sourceTable.id

    // 等待表创建完成
    await sleep(500)

    // 2. 在源表中创建记录
    logger.step(2, 6, '在源表中创建记录...')
    const sourceRecord = await safeExecute(async () => {
      return await client.records.create(sourceTableId, {
        fields: {
          name: '维护保养'
        }
      })
    }, '创建源记录失败')

    if (!sourceRecord) {
      throw new Error('无法创建源记录')
    }

    logger.success(`源记录创建成功: ID=${sourceRecord.id}`)
    logger.info(`源记录数据: ${JSON.stringify(sourceRecord.fields, null, 2)}`)
    const sourceRecordId = sourceRecord.id
    const sourceRecordName = sourceRecord.fields.name as string

    // 等待记录创建完成
    await sleep(500)

    // 3. 创建目标表
    logger.step(3, 6, '创建目标表...')
    const targetTable = await safeExecute(async () => {
      return await client.tables.create(context.baseId!, {
        name: `目标表 ${Date.now()}`,
        description: '目标表，包含关联字段',
        fields: [
          {
            name: 'title',
            type: 'singleLineText',
            required: true
          }
        ]
      })
    }, '创建目标表失败')

    if (!targetTable) {
      throw new Error('无法创建目标表')
    }

    logger.success(`目标表创建成功: ID=${targetTable.id}, Name=${targetTable.name}`)
    const targetTableId = targetTable.id

    // 等待表创建完成
    await sleep(500)

    // 4. 在目标表中创建关联字段
    logger.step(4, 6, '在目标表中创建关联字段...')
    const linkField = await safeExecute(async () => {
      return await client.fields.create(targetTableId, {
        name: '关联的标签',
        type: 'link',
        options: {
          link: {
            foreignTableId: sourceTableId,
            relationship: 'manyOne',
            // 不提供 lookupFieldId，让后端自动获取
          }
        }
      })
    }, '创建关联字段失败')

    if (!linkField) {
      throw new Error('无法创建关联字段')
    }

    logger.success(`关联字段创建成功: ID=${linkField.id}, Name=${linkField.name}`)
    const linkFieldId = linkField.id

    // 等待字段创建完成
    await sleep(500)

    // 5. 在目标表中创建记录，引用源表的记录
    logger.step(5, 6, '在目标表中创建记录，引用源表的记录...')
    const targetRecord = await safeExecute(async () => {
      return await client.records.create(targetTableId, {
        fields: {
          title: '测试记录',
          [linkFieldId]: {
            id: sourceRecordId,
            title: sourceRecordName
          }
        }
      })
    }, '创建目标记录失败')

    if (!targetRecord) {
      throw new Error('无法创建目标记录')
    }

    logger.success(`目标记录创建成功: ID=${targetRecord.id}`)
    logger.info(`目标记录数据: ${JSON.stringify(targetRecord.fields, null, 2)}`)
    const targetRecordId = targetRecord.id

    // 检查关联字段的值
    const linkValue = targetRecord.fields[linkFieldId] as any
    if (linkValue) {
      logger.info(`关联字段初始值:`)
      logger.info(`  - id: ${linkValue.id}`)
      logger.info(`  - title: ${linkValue.title}`)
      
      if (linkValue.title === sourceRecordName) {
        logger.success(`✅ 关联字段的 title 正确: ${linkValue.title}`)
      } else {
        logger.warning(`⚠️ 关联字段的 title 不匹配: 期望 ${sourceRecordName}, 实际 ${linkValue.title}`)
      }
    } else {
      logger.error(`❌ 关联字段值为空`)
    }

    // 等待记录创建完成
    await sleep(1000)

    // 6. 更新源表的记录（修改名称）
    logger.step(6, 6, '更新源表的记录（修改名称）...')
    const newSourceRecordName = '维护保养（已更新）'
    logger.info(`准备将源记录名称从 "${sourceRecordName}" 更新为 "${newSourceRecordName}"`)
    
    const updatedSourceRecord = await safeExecute(async () => {
      return await client.records.update(sourceTableId, sourceRecordId, {
        fields: {
          name: newSourceRecordName
        }
      })
    }, '更新源记录失败')

    if (!updatedSourceRecord) {
      throw new Error('无法更新源记录')
    }

    logger.success(`源记录更新成功: ID=${updatedSourceRecord.id}`)
    logger.info(`更新后的源记录数据: ${JSON.stringify(updatedSourceRecord.fields, null, 2)}`)

    // 验证源记录是否已更新
    if (updatedSourceRecord.fields.name === newSourceRecordName) {
      logger.success(`✅ 源记录名称已更新: ${updatedSourceRecord.fields.name}`)
    } else {
      logger.error(`❌ 源记录名称未更新: 期望 ${newSourceRecordName}, 实际 ${updatedSourceRecord.fields.name}`)
    }

    // 等待后端处理关联字段更新（可能需要一些时间）
    logger.info('等待后端处理关联字段更新...')
    await sleep(2000)

    // 7. 检查目标表中关联字段的 title 是否自动更新
    logger.step(7, 7, '检查目标表中关联字段的 title 是否自动更新...')
    
    // 重新查询目标记录
    const refreshedTargetRecord = await safeExecute(async () => {
      return await client.records.getOne(targetTableId, targetRecordId)
    }, '查询目标记录失败')

    if (!refreshedTargetRecord) {
      throw new Error('无法查询目标记录')
    }

    // 注意：RecordResponse 使用 data 字段，但 SDK 会映射到 fields 字段
    const recordData = refreshedTargetRecord.data || refreshedTargetRecord.fields || {}
    logger.info(`刷新后的目标记录数据: ${JSON.stringify(recordData, null, 2)}`)

    // 检查关联字段的值
    const refreshedLinkValue = recordData[linkFieldId] as any
    if (refreshedLinkValue) {
      logger.info(`关联字段更新后的值:`)
      logger.info(`  - id: ${refreshedLinkValue.id}`)
      logger.info(`  - title: ${refreshedLinkValue.title}`)
      
      if (refreshedLinkValue.title === newSourceRecordName) {
        logger.success(`✅ 关联字段的 title 已自动更新: ${refreshedLinkValue.title}`)
      } else {
        logger.error(`❌ 关联字段的 title 未自动更新:`)
        logger.error(`  期望: ${newSourceRecordName}`)
        logger.error(`  实际: ${refreshedLinkValue.title}`)
        logger.error(`  原始: ${sourceRecordName}`)
        
        // 如果 title 还是旧的，说明更新失败
        if (refreshedLinkValue.title === sourceRecordName) {
          logger.error(`❌ 关联字段的 title 仍然是旧值，自动更新功能可能未正常工作`)
        }
      }
    } else {
      logger.error(`❌ 关联字段值为空`)
    }

    // 8. 清理（可选）
    logger.step(8, 8, '清理: 删除测试资源...')
    const shouldCleanup = process.env.CLEANUP !== 'false'
    if (shouldCleanup) {
      if (targetTableId) {
        await safeExecute(async () => {
          await client.tables.delete(targetTableId)
          logger.success('目标表已删除')
        }, '删除目标表失败')
      }
      
      if (sourceTableId) {
        await safeExecute(async () => {
          await client.tables.delete(sourceTableId)
          logger.success('源表已删除')
        }, '删除源表失败')
      }
    } else {
      logger.info('跳过清理（设置 CLEANUP=false 可保留资源）')
      logger.info(`保留的资源:`)
      logger.info(`  - 源表 ID: ${sourceTableId}`)
      logger.info(`  - 目标表 ID: ${targetTableId}`)
      logger.info(`  - 源记录 ID: ${sourceRecordId}`)
      logger.info(`  - 目标记录 ID: ${targetRecordId}`)
      logger.info(`  - 关联字段 ID: ${linkFieldId}`)
    }

    logger.success('\n✅ 关联字段自动更新测试完成')
    return true

  } catch (error: any) {
    logger.error(`\n❌ 关联字段自动更新测试失败: ${error.message}`)
    if (error.details) {
      logger.error(`错误详情: ${JSON.stringify(error.details, null, 2)}`)
    }
    if (config.debug) {
      console.error(error)
    }
    return false
  }
}

// 如果直接运行此文件
if (require.main === module) {
  import('../config').then(async ({ config }) => {
    const client = new LuckDBClient(config.serverURL)
    
    try {
      // 先登录
      await client.auth.login(config.testEmail, config.testPassword)
      logger.info('登录成功')
      
      // 如果没有提供 baseId，先创建一个 Space 和 Base
      let baseId = process.env.TEST_BASE_ID || (config as any).testBaseId
      if (!baseId) {
        logger.info('未提供 baseId，正在创建测试 Space 和 Base...')
        const space = await client.spaces.create({
          name: `Link Field Test Space ${Date.now()}`,
          description: '关联字段测试空间'
        })
        
        const base = await client.bases.create(space.id, {
          name: `Link Field Test Base ${Date.now()}`,
          icon: '🔗'
        })
        
        baseId = base.id
        logger.info(`已创建测试 Base: ${baseId}`)
      }
      
      const success = await runLinkFieldUpdateTest({ 
        client, 
        baseId,
        fieldIds: {}, 
        recordIds: [], 
        viewIds: [] 
      })
      
      process.exit(success ? 0 : 1)
    } catch (error: any) {
      logger.error(`未处理的错误: ${error.message}`)
      if (config.debug) {
        console.error(error)
      }
      process.exit(1)
    }
  })
}

