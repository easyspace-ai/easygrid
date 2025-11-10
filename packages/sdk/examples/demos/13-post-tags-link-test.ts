import LuckDBClient from '../../src/index'
import { config } from '../config'
import { Logger } from '../utils/logger'
import { sleep, safeExecute } from '../utils/helpers'
import type { DemoContext } from '../utils/types'

const logger = new Logger('Post Tags Link Test')

/**
 * 全面的关联字段自动更新测试
 * 1. 创建 tags 表（源表）
 * 2. 创建 post 表（目标表），包含关联字段
 * 3. 在 tags 表中创建记录
 * 4. 在 post 表中创建记录，关联 tags
 * 5. 验证初始关联字段值
 * 6. 更新 tags 表的记录
 * 7. 验证关联字段是否自动更新
 * 8. 测试多选场景
 * 9. 清理测试数据
 */
export async function runPostTagsLinkTest(context: DemoContext): Promise<boolean> {
  logger.section('Post Tags 关联字段自动更新测试')

  const { client } = context

  try {
    // 1. 创建 tags 表（源表）
    logger.step(1, 9, '创建 tags 表（源表）...')
    const tagsTable = await safeExecute(async () => {
      return await client.tables.create(context.baseId!, {
        name: `Tags 表 ${Date.now()}`,
        description: '标签表，用于测试关联字段自动更新',
        fields: [
          {
            name: 'name',
            type: 'singleLineText',
            required: true
          }
        ]
      })
    }, '创建 tags 表失败')

    if (!tagsTable) {
      throw new Error('无法创建 tags 表')
    }

    logger.success(`Tags 表创建成功: ID=${tagsTable.id}, Name=${tagsTable.name}`)
    const tagsTableId = tagsTable.id

    // 等待表创建完成
    await sleep(500)

    // 2. 在 tags 表中创建记录
    logger.step(2, 9, '在 tags 表中创建记录...')
    const tag1 = await safeExecute(async () => {
      return await client.records.create(tagsTableId, {
        fields: {
          name: '技术'
        }
      })
    }, '创建 tag1 失败')

    if (!tag1) {
      throw new Error('无法创建 tag1')
    }

    const tag2 = await safeExecute(async () => {
      return await client.records.create(tagsTableId, {
        fields: {
          name: '产品'
        }
      })
    }, '创建 tag2 失败')

    if (!tag2) {
      throw new Error('无法创建 tag2')
    }

    logger.success(`Tag1 创建成功: ID=${tag1.id}, Name=${tag1.fields.name}`)
    logger.success(`Tag2 创建成功: ID=${tag2.id}, Name=${tag2.fields.name}`)
    const tag1Id = tag1.id
    const tag2Id = tag2.id
    const tag1Name = tag1.fields.name as string
    const tag2Name = tag2.fields.name as string

    // 等待记录创建完成
    await sleep(500)

    // 3. 创建 post 表（目标表）
    logger.step(3, 9, '创建 post 表（目标表）...')
    const postTable = await safeExecute(async () => {
      return await client.tables.create(context.baseId!, {
        name: `Post 表 ${Date.now()}`,
        description: '文章表，包含关联字段',
        fields: [
          {
            name: 'title',
            type: 'singleLineText',
            required: true
          }
        ]
      })
    }, '创建 post 表失败')

    if (!postTable) {
      throw new Error('无法创建 post 表')
    }

    logger.success(`Post 表创建成功: ID=${postTable.id}, Name=${postTable.name}`)
    const postTableId = postTable.id

    // 等待表创建完成
    await sleep(500)

    // 4. 在 post 表中创建关联字段
    logger.step(4, 9, '在 post 表中创建关联字段...')
    const tagsField = await safeExecute(async () => {
      return await client.fields.create(postTableId, {
        name: 'tags',
        type: 'link',
        options: {
          link: {
            foreignTableId: tagsTableId,
            relationship: 'manyOne',
            allowMultiple: true
          }
        }
      })
    }, '创建关联字段失败')

    if (!tagsField) {
      throw new Error('无法创建关联字段')
    }

    logger.success(`关联字段创建成功: ID=${tagsField.id}, Name=${tagsField.name}`)
    const tagsFieldId = tagsField.id

    // 等待字段创建完成
    await sleep(500)

    // 5. 在 post 表中创建记录，关联 tags
    logger.step(5, 9, '在 post 表中创建记录，关联 tags...')
    const post1 = await safeExecute(async () => {
      return await client.records.create(postTableId, {
        fields: {
          title: '测试文章1',
          [tagsFieldId]: {
            id: tag1Id,
            title: tag1Name
          }
        }
      })
    }, '创建 post1 失败')

    if (!post1) {
      throw new Error('无法创建 post1')
    }

    logger.success(`Post1 创建成功: ID=${post1.id}`)
    logger.info(`Post1 数据: ${JSON.stringify(post1.fields, null, 2)}`)
    const post1Id = post1.id

    // 检查关联字段的值
    const post1TagsValue = post1.fields[tagsFieldId] as any
    if (post1TagsValue) {
      logger.info(`Post1 关联字段初始值:`)
      if (Array.isArray(post1TagsValue)) {
        post1TagsValue.forEach((tag: any, index: number) => {
          logger.info(`  [${index}] id: ${tag.id}, title: ${tag.title}`)
        })
      } else {
        logger.info(`  id: ${post1TagsValue.id}, title: ${post1TagsValue.title}`)
      }
      
      if (Array.isArray(post1TagsValue)) {
        const firstTag = post1TagsValue[0]
        if (firstTag && firstTag.title === tag1Name) {
          logger.success(`✅ Post1 关联字段的 title 正确: ${firstTag.title}`)
        } else {
          logger.warning(`⚠️ Post1 关联字段的 title 不匹配: 期望 ${tag1Name}, 实际 ${firstTag?.title}`)
        }
      } else if (post1TagsValue.title === tag1Name) {
        logger.success(`✅ Post1 关联字段的 title 正确: ${post1TagsValue.title}`)
      } else {
        logger.warning(`⚠️ Post1 关联字段的 title 不匹配: 期望 ${tag1Name}, 实际 ${post1TagsValue.title}`)
      }
    } else {
      logger.error(`❌ Post1 关联字段值为空`)
    }

    // 等待记录创建完成
    await sleep(1000)

    // 6. 更新 tags 表的记录
    logger.step(6, 9, '更新 tags 表的记录...')
    const newTag1Name = '技术（已更新）'
    logger.info(`准备将 tag1 名称从 "${tag1Name}" 更新为 "${newTag1Name}"`)
    
    const updatedTag1 = await safeExecute(async () => {
      return await client.records.update(tagsTableId, tag1Id, {
        fields: {
          name: newTag1Name
        }
      })
    }, '更新 tag1 失败')

    if (!updatedTag1) {
      throw new Error('无法更新 tag1')
    }

    logger.success(`Tag1 更新成功: ID=${updatedTag1.id}`)
    logger.info(`更新后的 Tag1 数据: ${JSON.stringify(updatedTag1.fields, null, 2)}`)

    // 验证 tag1 是否已更新
    if (updatedTag1.fields.name === newTag1Name) {
      logger.success(`✅ Tag1 名称已更新: ${updatedTag1.fields.name}`)
    } else {
      logger.error(`❌ Tag1 名称未更新: 期望 ${newTag1Name}, 实际 ${updatedTag1.fields.name}`)
    }

    // 等待后端处理关联字段更新（可能需要一些时间）
    logger.info('等待后端处理关联字段更新...')
    await sleep(3000)

    // 7. 验证关联字段是否自动更新
    logger.step(7, 9, '验证关联字段是否自动更新...')
    
    // 重新查询 post1 记录
    const refreshedPost1 = await safeExecute(async () => {
      return await client.records.getOne(postTableId, post1Id)
    }, '查询 post1 失败')

    if (!refreshedPost1) {
      throw new Error('无法查询 post1')
    }

    logger.info(`刷新后的 Post1 数据: ${JSON.stringify(refreshedPost1.fields, null, 2)}`)

    // 检查关联字段的值
    const refreshedPost1TagsValue = refreshedPost1.fields[tagsFieldId] as any
    if (refreshedPost1TagsValue) {
      logger.info(`Post1 关联字段更新后的值:`)
      if (Array.isArray(refreshedPost1TagsValue)) {
        refreshedPost1TagsValue.forEach((tag: any, index: number) => {
          logger.info(`  [${index}] id: ${tag.id}, title: ${tag.title}`)
        })
        
        const firstTag = refreshedPost1TagsValue[0]
        if (firstTag && firstTag.title === newTag1Name) {
          logger.success(`✅ Post1 关联字段的 title 已自动更新: ${firstTag.title}`)
        } else {
          logger.error(`❌ Post1 关联字段的 title 未自动更新:`)
          logger.error(`  期望: ${newTag1Name}`)
          logger.error(`  实际: ${firstTag?.title}`)
          logger.error(`  原始: ${tag1Name}`)
        }
      } else {
        logger.info(`  id: ${refreshedPost1TagsValue.id}, title: ${refreshedPost1TagsValue.title}`)
        
        if (refreshedPost1TagsValue.title === newTag1Name) {
          logger.success(`✅ Post1 关联字段的 title 已自动更新: ${refreshedPost1TagsValue.title}`)
        } else {
          logger.error(`❌ Post1 关联字段的 title 未自动更新:`)
          logger.error(`  期望: ${newTag1Name}`)
          logger.error(`  实际: ${refreshedPost1TagsValue.title}`)
          logger.error(`  原始: ${tag1Name}`)
        }
      }
    } else {
      logger.error(`❌ Post1 关联字段值为空`)
    }

    // 8. 测试多选场景
    logger.step(8, 9, '测试多选场景...')
    
    // 创建包含多个 tags 的 post
    const post2 = await safeExecute(async () => {
      return await client.records.create(postTableId, {
        fields: {
          title: '测试文章2',
          [tagsFieldId]: [
            {
              id: tag1Id,
              title: newTag1Name // 使用更新后的名称
            },
            {
              id: tag2Id,
              title: tag2Name
            }
          ]
        }
      })
    }, '创建 post2 失败')

    if (!post2) {
      throw new Error('无法创建 post2')
    }

    logger.success(`Post2 创建成功: ID=${post2.id}`)
    const post2Id = post2.id

    // 等待记录创建完成
    await sleep(1000)

    // 更新 tag2
    const newTag2Name = '产品（已更新）'
    logger.info(`准备将 tag2 名称从 "${tag2Name}" 更新为 "${newTag2Name}"`)
    
    const updatedTag2 = await safeExecute(async () => {
      return await client.records.update(tagsTableId, tag2Id, {
        fields: {
          name: newTag2Name
        }
      })
    }, '更新 tag2 失败')

    if (!updatedTag2) {
      throw new Error('无法更新 tag2')
    }

    logger.success(`Tag2 更新成功: ID=${updatedTag2.id}`)

    // 等待后端处理
    await sleep(3000)

    // 验证 post2 的关联字段
    const refreshedPost2 = await safeExecute(async () => {
      return await client.records.getOne(postTableId, post2Id)
    }, '查询 post2 失败')

    if (!refreshedPost2) {
      throw new Error('无法查询 post2')
    }

    const refreshedPost2TagsValue = refreshedPost2.fields[tagsFieldId] as any
    if (Array.isArray(refreshedPost2TagsValue) && refreshedPost2TagsValue.length === 2) {
      const tag1InPost2 = refreshedPost2TagsValue.find((tag: any) => tag.id === tag1Id)
      const tag2InPost2 = refreshedPost2TagsValue.find((tag: any) => tag.id === tag2Id)
      
      if (tag1InPost2 && tag1InPost2.title === newTag1Name) {
        logger.success(`✅ Post2 中 tag1 的 title 已更新: ${tag1InPost2.title}`)
      } else {
        logger.error(`❌ Post2 中 tag1 的 title 未更新: 期望 ${newTag1Name}, 实际 ${tag1InPost2?.title}`)
      }
      
      if (tag2InPost2 && tag2InPost2.title === newTag2Name) {
        logger.success(`✅ Post2 中 tag2 的 title 已更新: ${tag2InPost2.title}`)
      } else {
        logger.error(`❌ Post2 中 tag2 的 title 未更新: 期望 ${newTag2Name}, 实际 ${tag2InPost2?.title}`)
      }
    } else {
      logger.error(`❌ Post2 关联字段值不正确: 期望数组长度为 2, 实际 ${Array.isArray(refreshedPost2TagsValue) ? refreshedPost2TagsValue.length : '非数组'}`)
    }

    // 9. 清理测试数据（可选）
    logger.step(9, 9, '清理测试数据...')
    const shouldCleanup = process.env.CLEANUP !== 'false'
    if (shouldCleanup) {
      if (postTableId) {
        await safeExecute(async () => {
          await client.tables.delete(postTableId)
          logger.success('Post 表已删除')
        }, '删除 Post 表失败')
      }
      
      if (tagsTableId) {
        await safeExecute(async () => {
          await client.tables.delete(tagsTableId)
          logger.success('Tags 表已删除')
        }, '删除 Tags 表失败')
      }
    } else {
      logger.info('跳过清理（设置 CLEANUP=false 可保留资源）')
      logger.info(`保留的资源:`)
      logger.info(`  - Tags 表 ID: ${tagsTableId}`)
      logger.info(`  - Post 表 ID: ${postTableId}`)
      logger.info(`  - Tag1 ID: ${tag1Id}`)
      logger.info(`  - Tag2 ID: ${tag2Id}`)
      logger.info(`  - Post1 ID: ${post1Id}`)
      logger.info(`  - Post2 ID: ${post2Id}`)
      logger.info(`  - 关联字段 ID: ${tagsFieldId}`)
    }

    logger.success('\n✅ Post Tags 关联字段自动更新测试完成')
    return true

  } catch (error: any) {
    logger.error(`\n❌ Post Tags 关联字段自动更新测试失败: ${error.message}`)
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
          name: `Post Tags Test Space ${Date.now()}`,
          description: 'Post Tags 关联字段测试空间'
        })
        
        const base = await client.bases.create(space.id, {
          name: `Post Tags Test Base ${Date.now()}`,
          icon: '🔗'
        })
        
        baseId = base.id
        logger.info(`已创建测试 Base: ${baseId}`)
      }
      
      const success = await runPostTagsLinkTest({ 
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

