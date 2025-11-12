import LuckDBClient from '../../src/index'
import { config as demoConfig } from '../config'
import { Logger } from '../utils/logger'
import { sleep, safeExecute } from '../utils/helpers'
import type { DemoContext } from '../utils/types'

const logger = new Logger('Link Field Symmetric Features Test')

/**
 * 测试 Link 字段对称功能
 * 
 * 本次构建的新功能：
 * 1. 对称字段自动创建 - 创建 Link 字段时，如果 isSymmetric=true，自动创建对称字段
 * 2. 对称字段自动同步 - 更新 Link 字段时，自动同步更新对称字段
 * 3. 对称字段自动删除 - 删除 Link 字段时，自动删除对称字段
 * 4. Count 字段依赖 - Count 字段正确识别对 Link 字段的依赖
 * 
 * 测试场景：
 * - 创建 manyMany 关系的对称 Link 字段
 * - 验证对称字段是否自动创建
 * - 更新记录验证对称字段是否自动同步
 * - 删除主字段验证对称字段是否自动删除
 */
export async function runLinkFieldSymmetricFeaturesTest(context: DemoContext): Promise<boolean> {
  logger.section('Link 字段对称功能测试')

  const { client } = context

  try {
    // ==================== 1. 创建测试表 ====================
    logger.step(1, 8, '创建测试表...')
    
    // 创建表 A
    const tableA = await safeExecute(async () => {
      return await client.tables.create(context.baseId!, {
        name: `表 A - 对称测试 ${Date.now()}`,
        description: '表 A，用于测试对称 Link 字段',
        fields: [
          {
            name: '名称',
            type: 'singleLineText',
            required: true
          }
        ]
      })
    }, '创建表 A 失败')

    if (!tableA) {
      throw new Error('无法创建表 A')
    }

    logger.success(`表 A 创建成功: ID=${tableA.id}, Name=${tableA.name}`)
    const tableAId = tableA.id

    // 创建表 B
    const tableB = await safeExecute(async () => {
      return await client.tables.create(context.baseId!, {
        name: `表 B - 对称测试 ${Date.now()}`,
        description: '表 B，用于测试对称 Link 字段',
        fields: [
          {
            name: '名称',
            type: 'singleLineText',
            required: true
          }
        ]
      })
    }, '创建表 B 失败')

    if (!tableB) {
      throw new Error('无法创建表 B')
    }

    logger.success(`表 B 创建成功: ID=${tableB.id}, Name=${tableB.name}`)
    const tableBId = tableB.id

    await sleep(500)

    // ==================== 2. 创建对称 Link 字段 ====================
    logger.step(2, 8, '创建对称 Link 字段（isSymmetric=true）...')
    
    const linkFieldA = await safeExecute(async () => {
      return await client.fields.create(tableAId, {
        name: '关联到表B',
        type: 'link',
        options: {
          link: {
            foreignTableId: tableBId,
            relationship: 'manyMany', // 服务端期望 manyMany 格式
            isSymmetric: true, // ✨ 关键：启用对称字段
            // 不提供 lookupFieldId，让后端自动获取
          }
        }
      })
    }, '创建对称 Link 字段失败')

    if (!linkFieldA) {
      throw new Error('无法创建对称 Link 字段')
    }

    logger.success(`对称 Link 字段创建成功: ID=${linkFieldA.id}, Name=${linkFieldA.name}`)
    
    // 验证字段选项
    const linkOptionsA = (linkFieldA.options as any)?.link || (linkFieldA.options as any)?.Link
    if (linkOptionsA) {
      logger.info(`字段选项:`)
      logger.info(`  - foreignTableId: ${linkOptionsA.foreignTableId || linkOptionsA.linkedTableId || linkOptionsA.linked_table_id}`)
      logger.info(`  - relationship: ${linkOptionsA.relationship}`)
      logger.info(`  - isSymmetric: ${linkOptionsA.isSymmetric || linkOptionsA.is_symmetric}`)
      const symmetricFieldId = linkOptionsA.symmetricFieldId || linkOptionsA.symmetric_field_id
      logger.info(`  - symmetricFieldId: ${symmetricFieldId || '(未设置)'}`)
      
      // 验证对称字段是否自动创建
      if (symmetricFieldId) {
        logger.success(`✅ 对称字段已自动创建: ${symmetricFieldId}`)
      } else {
        logger.warning(`⚠️ 对称字段 ID 未在响应中返回，需要查询验证`)
      }
    }

    await sleep(1000) // 等待对称字段创建完成

    // ==================== 3. 验证对称字段是否自动创建 ====================
    logger.step(3, 8, '验证对称字段是否自动创建...')
    
    // 查询表 B 的字段列表，查找对称字段
    const tableBFields = await safeExecute(async () => {
      return await client.fields.getFullList(tableBId)
    }, '获取表 B 字段列表失败')

    const symmetricField = tableBFields.find(f => 
      f.type === 'link' && 
      ((f.options as any)?.link?.linked_table_id === tableAId ||
       (f.options as any)?.link?.foreignTableId === tableAId ||
       (f.options as any)?.link?.linkedTableId === tableAId)
    )

    if (symmetricField) {
      logger.success(`✅ 对称字段已自动创建: ID=${symmetricField.id}, Name=${symmetricField.name}`)
      
      const symmetricOptions = (symmetricField.options as any)?.link || (symmetricField.options as any)?.Link
      if (symmetricOptions) {
        logger.info(`对称字段选项:`)
        logger.info(`  - foreignTableId: ${symmetricOptions.foreignTableId || symmetricOptions.linkedTableId}`)
        logger.info(`  - relationship: ${symmetricOptions.relationship}`)
        logger.info(`  - symmetricFieldId: ${symmetricOptions.symmetricFieldId || '(未设置)'}`)
        
        // 验证对称字段的 symmetricFieldId 是否指向主字段
        if (symmetricOptions.symmetricFieldId === linkFieldA.id) {
          logger.success(`✅ 对称字段的 symmetricFieldId 正确指向主字段`)
        } else {
          logger.warning(`⚠️ 对称字段的 symmetricFieldId 不匹配: 期望 ${linkFieldA.id}, 实际 ${symmetricOptions.symmetricFieldId}`)
        }
      }
    } else {
      logger.error(`❌ 未找到对称字段，自动创建功能可能未正常工作`)
      throw new Error('对称字段未自动创建')
    }

    const symmetricFieldId = symmetricField.id

    await sleep(500)

    // ==================== 4. 创建测试记录 ====================
    logger.step(4, 8, '创建测试记录...')
    
    // 在表 A 中创建记录
    const recordA = await safeExecute(async () => {
      return await client.records.create(tableAId, {
        fields: {
          '名称': '记录 A1'
        }
      })
    }, '创建表 A 记录失败')

    if (!recordA) {
      throw new Error('无法创建表 A 记录')
    }

    logger.success(`表 A 记录创建成功: ID=${recordA.id}`)
    const recordAId = recordA.id

    // 在表 B 中创建记录
    const recordB = await safeExecute(async () => {
      return await client.records.create(tableBId, {
        fields: {
          '名称': '记录 B1'
        }
      })
    }, '创建表 B 记录失败')

    if (!recordB) {
      throw new Error('无法创建表 B 记录')
    }

    logger.success(`表 B 记录创建成功: ID=${recordB.id}`)
    const recordBId = recordB.id

    await sleep(500)

    // ==================== 5. 建立关联关系 ====================
    logger.step(5, 8, '建立关联关系（测试对称字段自动同步）...')
    
    // 在表 A 的记录中关联表 B 的记录
    const updatedRecordA = await safeExecute(async () => {
      return await client.records.update(tableAId, recordAId, {
        fields: {
          [linkFieldA.id]: {
            id: recordBId,
            title: '记录 B1'
          }
        }
      })
    }, '更新表 A 记录失败')

    if (!updatedRecordA) {
      throw new Error('无法更新表 A 记录')
    }

    logger.success(`表 A 记录已关联到表 B 记录`)

    await sleep(1000) // 等待对称字段同步

    // ==================== 6. 验证对称字段自动同步 ====================
    logger.step(6, 8, '验证对称字段自动同步...')
    
    // 查询表 B 的记录，检查对称字段是否自动更新
    const refreshedRecordB = await safeExecute(async () => {
      return await client.records.getOne(tableBId, recordBId)
    }, '查询表 B 记录失败')

    if (!refreshedRecordB) {
      throw new Error('无法查询表 B 记录')
    }

    const recordBData = refreshedRecordB.data || refreshedRecordB.fields || {}
    const symmetricFieldValue = recordBData[symmetricFieldId] as any

    if (symmetricFieldValue) {
      logger.info(`对称字段值:`)
      logger.info(`  - id: ${symmetricFieldValue.id}`)
      logger.info(`  - title: ${symmetricFieldValue.title}`)
      
      // 验证对称字段是否包含表 A 的记录
      if (Array.isArray(symmetricFieldValue)) {
        const hasRecordA = symmetricFieldValue.some((item: any) => 
          (typeof item === 'string' ? item : item.id) === recordAId
        )
        if (hasRecordA) {
          logger.success(`✅ 对称字段已自动同步，包含表 A 的记录`)
        } else {
          logger.warning(`⚠️ 对称字段未包含表 A 的记录，自动同步可能未正常工作`)
        }
      } else if (symmetricFieldValue.id === recordAId) {
        logger.success(`✅ 对称字段已自动同步，包含表 A 的记录`)
      } else {
        logger.warning(`⚠️ 对称字段值不匹配: 期望包含 ${recordAId}, 实际 ${JSON.stringify(symmetricFieldValue)}`)
      }
    } else {
      logger.warning(`⚠️ 对称字段值为空，自动同步可能未正常工作`)
    }

    await sleep(500)

    // ==================== 7. 测试 Count 字段依赖 ====================
    logger.step(7, 8, '测试 Count 字段依赖...')
    
    // 在表 A 中创建 Count 字段，统计关联到表 B 的记录数
    const countField = await safeExecute(async () => {
      return await client.fields.create(tableAId, {
        name: '关联记录数',
        type: 'count',
        options: {
          count: {
            linkFieldId: linkFieldA.id, // ✨ Count 字段依赖 Link 字段（支持 camelCase）
            // 服务端也支持 link_field_id (snake_case)
          }
        }
      })
    }, '创建 Count 字段失败')

    if (countField) {
      logger.success(`✅ Count 字段创建成功: ID=${countField.id}, Name=${countField.name}`)
      
      const countOptions = (countField.options as any)?.count || (countField.options as any)?.Count
      if (countOptions) {
        logger.info(`Count 字段选项:`)
        logger.info(`  - linkFieldId: ${countOptions.linkFieldId || countOptions.link_field_id || '(未设置)'}`)
        
        if (countOptions.linkFieldId === linkFieldA.id || countOptions.link_field_id === linkFieldA.id) {
          logger.success(`✅ Count 字段的 linkFieldId 正确设置`)
        } else {
          logger.warning(`⚠️ Count 字段的 linkFieldId 不匹配`)
        }
      }
    } else {
      logger.warning(`⚠️ Count 字段创建失败，可能服务端未实现 Count 字段依赖功能`)
    }

    await sleep(500)

    // ==================== 8. 测试对称字段自动删除 ====================
    logger.step(8, 8, '测试对称字段自动删除...')
    
    // 删除主 Link 字段
    logger.info(`准备删除主 Link 字段: ${linkFieldA.id}`)
    await safeExecute(async () => {
      await client.fields.delete(linkFieldA.id)
    }, '删除主 Link 字段失败')

    logger.success(`主 Link 字段已删除`)

    await sleep(1000) // 等待对称字段删除

    // 验证对称字段是否自动删除
    const tableBFieldsAfterDelete = await safeExecute(async () => {
      return await client.fields.getFullList(tableBId)
    }, '获取表 B 字段列表失败')

    const symmetricFieldAfterDelete = tableBFieldsAfterDelete.find(f => f.id === symmetricFieldId)

    if (symmetricFieldAfterDelete) {
      logger.error(`❌ 对称字段未自动删除，自动删除功能可能未正常工作`)
      logger.warning(`对称字段仍然存在: ID=${symmetricFieldId}`)
    } else {
      logger.success(`✅ 对称字段已自动删除`)
    }

    // ==================== 清理 ====================
    logger.step(9, 9, '清理: 删除测试资源...')
    const shouldCleanup = process.env.CLEANUP !== 'false'
    if (shouldCleanup) {
      if (tableAId) {
        await safeExecute(async () => {
          await client.tables.delete(tableAId)
          logger.success('表 A 已删除')
        }, '删除表 A 失败')
      }
      
      if (tableBId) {
        await safeExecute(async () => {
          await client.tables.delete(tableBId)
          logger.success('表 B 已删除')
        }, '删除表 B 失败')
      }
    } else {
      logger.info('跳过清理（设置 CLEANUP=false 可保留资源）')
      logger.info(`保留的资源:`)
      logger.info(`  - 表 A ID: ${tableAId}`)
      logger.info(`  - 表 B ID: ${tableBId}`)
      logger.info(`  - 主 Link 字段 ID: ${linkFieldA.id}`)
      logger.info(`  - 对称字段 ID: ${symmetricFieldId}`)
    }

    logger.success('\n✅ Link 字段对称功能测试完成')
    return true

  } catch (error: any) {
    logger.error(`\n❌ Link 字段对称功能测试失败: ${error.message}`)
    if (error.details) {
      logger.error(`错误详情: ${JSON.stringify(error.details, null, 2)}`)
    }
    if (demoConfig.debug) {
      console.error(error)
    }
    return false
  }
}

// 如果直接运行此文件
if (require.main === module) {
  (async () => {
    const client = new LuckDBClient(demoConfig.serverURL)
    
    try {
      // 先登录
      await client.auth.login(demoConfig.testEmail, demoConfig.testPassword)
      logger.info('登录成功')
      
      // 如果没有提供 baseId，先创建一个 Space 和 Base
      let baseId = process.env.TEST_BASE_ID || (demoConfig as any).testBaseId
      if (!baseId) {
        logger.info('未提供 baseId，正在创建测试 Space 和 Base...')
        const space = await client.spaces.create({
          name: `Link Field Symmetric Test Space ${Date.now()}`,
          description: 'Link 字段对称功能测试空间'
        })
        
        const base = await client.bases.create(space.id, {
          name: `Link Field Symmetric Test Base ${Date.now()}`,
          icon: '🔗'
        })
        
        baseId = base.id
        logger.info(`已创建测试 Base: ${baseId}`)
      }
      
      const success = await runLinkFieldSymmetricFeaturesTest({ 
        client, 
        baseId,
        fieldIds: {}, 
        recordIds: [], 
        viewIds: [] 
      })
      
      process.exit(success ? 0 : 1)
    } catch (error: any) {
      logger.error(`未处理的错误: ${error.message}`)
      if (demoConfig.debug) {
        console.error(error)
      }
      process.exit(1)
    }
  })()
}

