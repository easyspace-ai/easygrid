import LuckDBClient from '../../src/index'
import { config } from '../config'
import { Logger } from '../utils/logger'
import { sleep, safeExecute } from '../utils/helpers'
import type { DemoContext } from '../utils/types'

const logger = new Logger('Link Field Demo')

export async function runLinkFieldDemo(context: DemoContext): Promise<boolean> {
  logger.section('关联字段 (Link Field) 测试演示')

  const { client } = context

  try {
    // 1. 创建 Space
    logger.step(1, 7, '创建 Space...')
    const space = await safeExecute(async () => {
      return await client.spaces.create({
        name: `Link Field Test Space ${Date.now()}`,
        description: '关联字段测试空间'
      })
    }, '创建 Space 失败')

    if (!space) {
      throw new Error('无法创建 Space')
    }

    context.spaceId = space.id
    logger.success(`Space 创建成功: ID=${space.id}, Name=${space.name}`)

    // 2. 创建 Base
    logger.step(2, 7, '创建 Base...')
    const base = await safeExecute(async () => {
      return await client.bases.create(space.id, {
        name: `Link Field Test Base ${Date.now()}`,
        icon: '🔗'
      })
    }, '创建 Base 失败')

    if (!base) {
      throw new Error('无法创建 Base')
    }

    context.baseId = base.id
    logger.success(`Base 创建成功: ID=${base.id}, Name=${base.name}`)

    // 3. 创建关联表（被关联的表）
    logger.step(3, 7, '创建关联表（被关联的表）...')
    const foreignTable = await safeExecute(async () => {
      return await client.tables.create(base.id, {
        name: `关联表 ${Date.now()}`,
        description: '这是被关联的表',
        fields: [
          {
            name: '名称',
            type: 'singleLineText',
            required: true
          },
          {
            name: '描述',
            type: 'longText'
          },
          {
            name: '状态',
            type: 'singleSelect',
            options: {
              choices: [
                { id: 'active', name: '活跃', color: '#00ff00' },
                { id: 'inactive', name: '非活跃', color: '#ff0000' }
              ]
            }
          }
        ]
      })
    }, '创建关联表失败')

    if (!foreignTable) {
      throw new Error('无法创建关联表')
    }

    logger.success(`关联表创建成功: ID=${foreignTable.id}, Name=${foreignTable.name}`)
    logger.info(`关联表字段: ${JSON.stringify(foreignTable.fields?.map(f => ({ name: f.name, type: f.type, id: f.id })), null, 2)}`)

    // 等待一下，确保表创建完成
    await sleep(500)

    // 4. 获取关联表的字段列表，找到第一个文本字段作为 lookup field
    logger.step(4, 7, '获取关联表的字段列表...')
    const foreignTableFields = await client.fields.getFullList(foreignTable.id)
    logger.success(`获取到 ${foreignTableFields.length} 个字段`)
    
    // 找到第一个文本字段（非虚拟字段）作为 lookup field
    const lookupField = foreignTableFields.find(f => 
      f.type === 'singleLineText' || 
      f.type === 'longText' || 
      f.type === 'text'
    )
    
    if (!lookupField) {
      // 如果没有文本字段，使用第一个字段
      const firstField = foreignTableFields[0]
      if (!firstField) {
        throw new Error('关联表中没有字段')
      }
      logger.warning(`未找到文本字段，将使用第一个字段: ${firstField.name} (${firstField.type})`)
    } else {
      logger.info(`找到 lookup field: ${lookupField.name} (${lookupField.type}), ID: ${lookupField.id}`)
    }

    // 5. 创建主表（当前表）
    logger.step(5, 7, '创建主表（当前表）...')
    const currentTable = await safeExecute(async () => {
      return await client.tables.create(base.id, {
        name: `主表 ${Date.now()}`,
        description: '这是主表，将创建关联字段',
        fields: [
          {
            name: '标题',
            type: 'singleLineText',
            required: true
          }
        ]
      })
    }, '创建主表失败')

    if (!currentTable) {
      throw new Error('无法创建主表')
    }

    context.tableId = currentTable.id
    logger.success(`主表创建成功: ID=${currentTable.id}, Name=${currentTable.name}`)

    // 等待一下，确保表创建完成
    await sleep(500)

    // 6. 在主表中创建关联字段（不提供 lookupFieldId，测试自动获取）
    logger.step(6, 7, '创建关联字段（不提供 lookupFieldId，测试自动获取）...')
    logger.info('创建关联字段，不提供 lookupFieldId，后端应该自动从关联表获取第一个非虚拟字段')
    
    let linkField
    try {
      linkField = await client.fields.create(currentTable.id, {
        name: '关联记录',
        type: 'link',
        options: {
          link: {
            foreignTableId: foreignTable.id,
            relationship: 'manyOne', // 多对一关系
            // 不提供 lookupFieldId，测试自动获取
          }
        }
      })
    } catch (error: any) {
      logger.error(`创建关联字段失败: ${error.message}`)
      if (error.details) {
        logger.error(`错误详情: ${JSON.stringify(error.details, null, 2)}`)
      }
      if (error.status) {
        logger.error(`HTTP 状态码: ${error.status}`)
      }
      if (error.code) {
        logger.error(`错误代码: ${error.code}`)
      }
      logger.error(`完整错误信息: ${JSON.stringify(error, null, 2)}`)
      throw error
    }

    if (!linkField) {
      throw new Error('无法创建关联字段')
    }

    logger.success(`关联字段创建成功: ID=${linkField.id}, Name=${linkField.name}`)
    logger.info(`关联字段完整信息: ${JSON.stringify(linkField, null, 2)}`)

    // 验证关联字段的选项
    if (linkField.options && typeof linkField.options === 'object') {
      const linkOptions = (linkField.options as any).link || (linkField.options as any).Link
      if (linkOptions) {
        logger.info(`关联字段选项:`)
        logger.info(`  - foreignTableId: ${linkOptions.foreignTableId || linkOptions.linked_table_id}`)
        logger.info(`  - relationship: ${linkOptions.relationship}`)
        logger.info(`  - lookupFieldId: ${linkOptions.lookupFieldId || linkOptions.lookup_field_id || '(未设置)'}`)
        
        // 验证 lookupFieldId 是否被自动设置
        const actualLookupFieldId = linkOptions.lookupFieldId || linkOptions.lookup_field_id
        if (actualLookupFieldId) {
          logger.success(`✅ lookupFieldId 已自动设置: ${actualLookupFieldId}`)
          
          // 验证 lookupFieldId 是否匹配关联表的第一个非虚拟字段
          if (lookupField && actualLookupFieldId === lookupField.id) {
            logger.success(`✅ lookupFieldId 正确匹配关联表的第一个文本字段`)
          } else {
            logger.warning(`⚠️ lookupFieldId 与预期不匹配，但已自动设置`)
          }
        } else {
          logger.error(`❌ lookupFieldId 未被自动设置`)
        }
      } else {
        logger.warning('关联字段选项中没有找到 link 或 Link 字段')
      }
    } else {
      logger.warning('关联字段没有 options 或 options 格式不正确')
    }

    // 7. 测试提供 lookupFieldId 的情况
    logger.step(7, 7, '测试提供 lookupFieldId 的情况...')
    if (lookupField) {
      logger.info('创建第二个关联字段，明确提供 lookupFieldId')
      
      const linkFieldWithLookup = await safeExecute(async () => {
        return await client.fields.create(currentTable.id, {
          name: '关联记录（指定字段）',
          type: 'link',
          options: {
            link: {
              foreignTableId: foreignTable.id,
              relationship: 'manyOne',
              lookupFieldId: lookupField.id, // 明确提供 lookupFieldId
            }
          }
        })
      }, '创建带 lookupFieldId 的关联字段失败')

      if (linkFieldWithLookup) {
        logger.success(`关联字段创建成功: ID=${linkFieldWithLookup.id}, Name=${linkFieldWithLookup.name}`)
        
        // 验证 lookupFieldId 是否正确设置
        const linkOptionsWithLookup = (linkFieldWithLookup.options as any)?.link || (linkFieldWithLookup.options as any)?.Link
        if (linkOptionsWithLookup) {
          const providedLookupFieldId = linkOptionsWithLookup.lookupFieldId || linkOptionsWithLookup.lookup_field_id
          if (providedLookupFieldId === lookupField.id) {
            logger.success(`✅ 提供的 lookupFieldId 正确设置: ${providedLookupFieldId}`)
          } else {
            logger.warning(`⚠️ 提供的 lookupFieldId 与预期不匹配: 期望 ${lookupField.id}, 实际 ${providedLookupFieldId}`)
          }
        }
      }
    }

    // 8. 清理（可选）
    logger.step(8, 8, '清理: 删除测试资源...')
    const shouldCleanup = process.env.CLEANUP !== 'false'
    if (shouldCleanup) {
      if (context.tableId) {
        await safeExecute(async () => {
          await client.tables.delete(context.tableId!)
          logger.success('主表已删除')
        }, '删除主表失败')
      }
      
      if (foreignTable.id) {
        await safeExecute(async () => {
          await client.tables.delete(foreignTable.id)
          logger.success('关联表已删除')
        }, '删除关联表失败')
      }
      
      if (context.baseId) {
        await safeExecute(async () => {
          await client.bases.delete(context.baseId!)
          logger.success('Base 已删除')
        }, '删除 Base 失败')
      }
      
      if (context.spaceId) {
        await safeExecute(async () => {
          await client.spaces.delete(context.spaceId!)
          logger.success('Space 已删除')
        }, '删除 Space 失败')
      }
    } else {
      logger.info('跳过清理（设置 CLEANUP=false 可保留资源）')
      logger.info(`保留的资源:`)
      logger.info(`  - Space ID: ${context.spaceId}`)
      logger.info(`  - Base ID: ${context.baseId}`)
      logger.info(`  - 主表 ID: ${context.tableId}`)
      logger.info(`  - 关联表 ID: ${foreignTable.id}`)
    }

    logger.success('\n✅ 关联字段测试演示完成')
    return true

  } catch (error: any) {
    logger.error(`\n❌ 关联字段测试演示失败: ${error.message}`)
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
  import('../config').then(({ config }) => {
    const client = new LuckDBClient(config.serverURL)
    
    // 先登录
    client.auth.login(config.testEmail, config.testPassword)
      .then(() => {
        return runLinkFieldDemo({ 
          client, 
          fieldIds: {}, 
          recordIds: [], 
          viewIds: [] 
        })
      })
      .then(success => {
        process.exit(success ? 0 : 1)
      })
      .catch(error => {
        console.error('未处理的错误:', error)
        process.exit(1)
      })
  })
}

