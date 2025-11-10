import LuckDBClient from '../../src/index'
import { config } from '../config'
import { Logger } from '../utils/logger'
import { sleep, safeExecute } from '../utils/helpers'
import type { DemoContext } from '../utils/types'

const logger = new Logger('Blog Link Field Update Test')

/**
 * Blog 关联字段自动更新测试
 * 测试场景：
 * 1. 使用现有的 baseId 和 tableId（posts 表）
 * 2. 找到 posts 表的"字段 5"（Link 字段）
 * 3. 找到 tags 表（通过 Link 字段的配置）
 * 4. 更新 tags 表的值
 * 5. 轮询检查 posts 表中 Link 字段的值是否自动更新
 * 6. 直到值正确更新才算测试通过
 */
export async function runBlogLinkFieldUpdateTest(context: DemoContext): Promise<boolean> {
  logger.section('Blog 关联字段自动更新测试')

  const { client } = context

  // 从 URL 提取的信息
  const baseId = 'd1bf33f2-5b1b-4d29-b31c-2e59dab42d36'
  // ✅ 修正：posts 表 ID 是 tbl_j3lKQGOh607NaH1giWXXv（不是 tbl_TpBUvM10QEjVoDDN9drdD）
  const postsTableId = 'tbl_j3lKQGOh607NaH1giWXXv'
  // tags 表 ID 是 tbl_TpBUvM10QEjVoDDN9drdD
  const tagsTableId = 'tbl_TpBUvM10QEjVoDDN9drdD'
  const viewId = 'viw_65wOMzrnlyznYOCy7DoHx'
  // Link 字段 ID（"字段 5"）
  const linkFieldId = 'fld_GkjItapKYqGYLVunV5pAL'

  try {
    // 1. 先获取 posts 表的记录，从记录中查找 Link 字段
    logger.step(1, 7, '获取 posts 表的记录，从记录中查找 Link 字段...')
    const postsRecords = await safeExecute(async () => {
      return await client.records.getFullList(postsTableId)
    }, '获取 posts 表记录列表失败')

    if (!postsRecords || postsRecords.length === 0) {
      throw new Error('posts 表没有记录，无法测试')
    }

    logger.success(`获取到 ${postsRecords.length} 条 posts 记录`)

    // 打印所有记录的数据键，看看是否有 Link 字段
    logger.info('所有记录的数据键:')
    postsRecords.forEach((record, index) => {
      const data = record.fields || record.data || {}
      logger.info(`  记录 ${index + 1} (${record.id}): ${Object.keys(data).join(', ')}`)
      // 打印所有键值对，看看是否有 Link 格式的值
      for (const [key, value] of Object.entries(data)) {
        if (value != null && typeof value === 'object') {
          logger.info(`    ${key}: ${JSON.stringify(value)}`)
        }
      }
    })

    // 从第一条记录中查找 Link 字段（Link 字段的值通常是对象或数组）
    const firstRecord = postsRecords[0]
    const recordData = firstRecord.fields || firstRecord.data || {}
    logger.info(`第一条记录的数据键: ${Object.keys(recordData).join(', ')}`)
    logger.info(`第一条记录的完整数据: ${JSON.stringify(recordData, null, 2)}`)

    // 查找 Link 字段：Link 字段的值通常是对象 {id, title} 或数组 [{id, title}]
    let linkFieldId: string | null = null
    for (const [key, value] of Object.entries(recordData)) {
      if (value != null) {
        // 检查是否是 Link 字段的值格式
        const isLinkValue = 
          (typeof value === 'object' && !Array.isArray(value) && 'id' in value && 'title' in value) ||
          (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] != null && 'id' in value[0] && 'title' in value[0])
        
        if (isLinkValue) {
          linkFieldId = key
          logger.success(`从记录中找到可能的 Link 字段: ${key}`)
          logger.info(`Link 字段值: ${JSON.stringify(value, null, 2)}`)
          break
        }
      }
    }

    // 如果还是找不到，检查所有记录
    if (!linkFieldId) {
      logger.info('从第一条记录中未找到 Link 字段，检查所有记录...')
      for (const record of postsRecords) {
        const data = record.fields || record.data || {}
        for (const [key, value] of Object.entries(data)) {
          if (value != null) {
            const isLinkValue = 
              (typeof value === 'object' && !Array.isArray(value) && 'id' in value && 'title' in value) ||
              (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] != null && 'id' in value[0] && 'title' in value[0])
            
            if (isLinkValue) {
              linkFieldId = key
              logger.success(`从记录 ${record.id} 中找到可能的 Link 字段: ${key}`)
              logger.info(`Link 字段值: ${JSON.stringify(value, null, 2)}`)
              break
            }
          }
        }
        if (linkFieldId) break
      }
    }

    if (!linkFieldId) {
      // 如果从记录中找不到，尝试获取字段列表
      logger.info('从记录中未找到 Link 字段，尝试获取字段列表...')
      const postsFields = await safeExecute(async () => {
        return await client.fields.getFullList(postsTableId)
      }, '获取 posts 表字段列表失败')

      if (postsFields && postsFields.length > 0) {
        logger.info(`获取到 ${postsFields.length} 个字段`)
        logger.info(`字段列表: ${postsFields.map(f => `${f.name}(${f.type})`).join(', ')}`)
        
        // 找到类型为 'link' 的字段
        const linkField = postsFields.find(f => f.type === 'link')
        if (linkField) {
          linkFieldId = linkField.id
          logger.success(`从字段列表中找到 Link 字段: ${linkField.name} (${linkField.id})`)
        }
      }
    }

    // 如果还是找不到，尝试通过已知的字段ID查找（根据用户描述，"字段 5"是 Link 字段）
    // 或者尝试通过记录数据中的其他字段来推断
    if (!linkFieldId) {
      logger.warning('无法通过常规方式找到 Link 字段，尝试其他方法...')
      
      // 方法1: 尝试通过记录数据中的字段ID来推断
      // 如果记录数据中有多个字段ID，可能是 Link 字段
      const allFieldIds = new Set<string>()
      postsRecords.forEach(record => {
        const data = record.fields || record.data || {}
        Object.keys(data).forEach(key => {
          if (key.startsWith('fld_')) {
            allFieldIds.add(key)
          }
        })
      })
      
      logger.info(`从记录数据中找到的字段ID: ${Array.from(allFieldIds).join(', ')}`)
      
      // 如果找到多个字段ID，尝试获取每个字段的详细信息
      if (allFieldIds.size > 1) {
        logger.info('找到多个字段ID，尝试获取每个字段的详细信息...')
        for (const fieldId of allFieldIds) {
          try {
            const field = await client.fields.getOne(fieldId)
            logger.info(`字段 ${fieldId}: ${field.name} (${field.type})`)
            if (field.type === 'link') {
              linkFieldId = fieldId
              logger.success(`找到 Link 字段: ${field.name} (${field.id})`)
              break
            }
          } catch (error: any) {
            logger.warning(`无法获取字段 ${fieldId} 的详细信息: ${error.message}`)
          }
        }
      }
    }

    if (!linkFieldId) {
      throw new Error('无法找到 Link 字段。请检查 posts 表是否有 Link 字段，或者字段列表 API 是否正常工作。\n' +
        '提示：如果知道 Link 字段的 ID，可以在测试脚本中手动指定')
    }

    logger.success(`找到 Link 字段 ID: ${linkFieldId}`)

    // 获取 Link 字段的详细信息
    let linkField: any = null
    try {
      linkField = await client.fields.getOne(linkFieldId)
      if (linkField && linkField.id) {
        logger.success(`获取 Link 字段详情成功: ${linkField.name} (${linkField.type})`)
        logger.info(`Link 字段详情: ${JSON.stringify(linkField, null, 2)}`)
      } else {
        logger.warning(`获取 Link 字段详情返回空数据，尝试通过字段列表获取...`)
        // 如果 getOne 返回空，尝试通过字段列表获取
        const postsFields = await client.fields.getFullList(postsTableId)
        linkField = postsFields.find(f => f.id === linkFieldId)
        if (linkField) {
          logger.success(`从字段列表中找到 Link 字段: ${linkField.name} (${linkField.type})`)
        }
      }
    } catch (error: any) {
      logger.warning(`无法获取 Link 字段详情: ${error.message}`)
      // 如果 getOne 失败，尝试通过字段列表获取
      try {
        const postsFields = await client.fields.getFullList(postsTableId)
        linkField = postsFields.find(f => f.id === linkFieldId)
        if (linkField) {
          logger.success(`从字段列表中找到 Link 字段: ${linkField.name} (${linkField.type})`)
        }
      } catch (err: any) {
        logger.warning(`通过字段列表获取也失败: ${err.message}`)
      }
    }

    // 从 Link 字段配置中获取 tags 表 ID
    let linkedTableId: string | null = null
    if (linkField && linkField.options) {
      const linkOptions = linkField.options as any
      if (linkOptions && linkOptions.link) {
        linkedTableId = linkOptions.link.linkedTableId || linkOptions.link.foreignTableId
      }
    }

    // 如果无法从字段配置获取，使用已知的 tags 表 ID
    if (!linkedTableId) {
      logger.warning(`无法从 Link 字段配置获取 tags 表 ID，使用已知的 tags 表 ID: ${tagsTableId}`)
      linkedTableId = tagsTableId
    }

    logger.success(`找到 tags 表 ID: ${linkedTableId}`)

    // 3. 获取 tags 表的字段列表
    logger.step(3, 7, '获取 tags 表的字段列表...')
    const tagsFields = await safeExecute(async () => {
      return await client.fields.getFullList(linkedTableId)
    }, '获取 tags 表字段列表失败')

    if (!tagsFields || tagsFields.length === 0) {
      throw new Error('无法获取 tags 表字段列表')
    }

    logger.success(`获取到 ${tagsFields.length} 个字段`)

    // 找到 tags 表的主字段（通常是第一个非虚拟字段，或 name 字段）
    let tagsNameField = tagsFields.find(f => f.name === 'name' || f.name === 'Name')
    if (!tagsNameField) {
      // 查找第一个非虚拟字段
      tagsNameField = tagsFields.find(f => {
        const virtualTypes = ['formula', 'rollup', 'lookup', 'count']
        return !virtualTypes.includes(f.type)
      })
    }
    if (!tagsNameField) {
      tagsNameField = tagsFields[0] // 如果都找不到，使用第一个字段
    }

    logger.success(`找到 tags 表主字段: ${tagsNameField.name} (${tagsNameField.id})`)
    const tagsNameFieldId = tagsNameField.id

    // 4. 找到包含 Link 字段值的记录
    logger.step(4, 7, '找到包含 Link 字段值的记录...')
    
    // 找到包含 Link 字段值的记录
    let testPost = postsRecords.find(record => {
      const linkValue = (record.fields || record.data || {})[linkFieldId]
      return linkValue != null
    })

    if (!testPost) {
      throw new Error('posts 表中没有包含 Link 字段值的记录')
    }

    logger.success(`找到测试记录: ${testPost.id}`)
    logger.info(`测试记录数据: ${JSON.stringify(testPost.fields || testPost.data, null, 2)}`)

    const testPostId = testPost.id
    const linkValue = (testPost.fields || testPost.data || {})[linkFieldId] as any

    // 提取关联的 tag ID
    let tagId: string | null = null
    if (Array.isArray(linkValue)) {
      if (linkValue.length > 0 && linkValue[0].id) {
        tagId = linkValue[0].id
      }
    } else if (linkValue && linkValue.id) {
      tagId = linkValue.id
    }

    if (!tagId) {
      throw new Error('无法从 Link 字段值中提取 tag ID')
    }

    logger.success(`找到关联的 tag ID: ${tagId}`)

    // 5. 获取 tag 记录的当前值
    logger.step(5, 7, '获取 tag 记录的当前值...')
    const tagRecord = await safeExecute(async () => {
      return await client.records.getOne(linkedTableId, tagId)
    }, '获取 tag 记录失败')

    if (!tagRecord) {
      throw new Error('无法获取 tag 记录')
    }

    const currentTagName = (tagRecord.fields || tagRecord.data || {})[tagsNameFieldId] as string
    logger.success(`Tag 当前值: ${currentTagName}`)
    logger.info(`Tag 记录数据: ${JSON.stringify(tagRecord.fields || tagRecord.data, null, 2)}`)

    // 6. 更新 tag 记录的值
    logger.step(6, 7, '更新 tag 记录的值...')
    const newTagName = `${currentTagName}（已更新 ${Date.now()}）`
    logger.info(`准备将 tag 名称从 "${currentTagName}" 更新为 "${newTagName}"`)

    // ✅ 使用字段名更新（测试字段名转换功能）
    const updatedTag = await safeExecute(async () => {
      return await client.records.update(linkedTableId, tagId, {
        fields: {
          [tagsNameField.name]: newTagName  // 使用字段名而不是字段ID
        }
      })
    }, '更新 tag 记录失败')

    if (!updatedTag) {
      throw new Error('无法更新 tag 记录')
    }

    logger.success(`Tag 更新成功: ID=${updatedTag.id}`)
    logger.info(`更新后的 Tag 数据: ${JSON.stringify(updatedTag.fields || updatedTag.data, null, 2)}`)

    // 验证 tag 是否已更新
    const updatedTagName = (updatedTag.fields || updatedTag.data || {})[tagsNameFieldId] as string
    if (updatedTagName === newTagName) {
      logger.success(`✅ Tag 名称已更新: ${updatedTagName}`)
    } else {
      logger.error(`❌ Tag 名称未更新: 期望 ${newTagName}, 实际 ${updatedTagName}`)
      throw new Error('Tag 更新失败')
    }

    // 7. 轮询检查 posts 表中 Link 字段的值是否自动更新
    logger.step(7, 7, '轮询检查 posts 表中 Link 字段的值是否自动更新...')
    
    const maxRetries = 20 // 最多重试20次
    const retryInterval = 1000 // 每次间隔1秒
    let retryCount = 0
    let isUpdated = false
    let finalPostRecord: any = null

    while (retryCount < maxRetries && !isUpdated) {
      retryCount++
      logger.info(`第 ${retryCount}/${maxRetries} 次检查...`)

      // 重新查询 posts 记录
      const refreshedPost = await safeExecute(async () => {
        return await client.records.getOne(postsTableId, testPostId)
      }, '查询 posts 记录失败')

      if (!refreshedPost) {
        logger.warning(`无法查询 posts 记录，等待 ${retryInterval}ms 后重试...`)
        await sleep(retryInterval)
        continue
      }

      finalPostRecord = refreshedPost
      const refreshedLinkValue = (refreshedPost.fields || refreshedPost.data || {})[linkFieldId] as any

      if (refreshedLinkValue) {
        let linkTitle: string | null = null

        // 提取 title
        if (Array.isArray(refreshedLinkValue)) {
          if (refreshedLinkValue.length > 0 && refreshedLinkValue[0].title) {
            linkTitle = refreshedLinkValue[0].title
          }
        } else if (refreshedLinkValue.title) {
          linkTitle = refreshedLinkValue.title
        }

        logger.info(`Link 字段当前值: ${linkTitle}`)

        // 检查是否已更新
        if (linkTitle === newTagName) {
          logger.success(`✅ Link 字段的 title 已自动更新: ${linkTitle}`)
          isUpdated = true
          break
        } else if (linkTitle === currentTagName) {
          logger.info(`⏳ Link 字段的 title 仍然是旧值: ${linkTitle}，继续等待...`)
        } else {
          logger.warning(`⚠️ Link 字段的 title 值异常: ${linkTitle}，期望: ${newTagName}`)
        }
      } else {
        logger.warning(`⚠️ Link 字段值为空，继续等待...`)
      }

      // 等待后重试
      if (retryCount < maxRetries) {
        await sleep(retryInterval)
      }
    }

    // 8. 验证测试结果
    logger.step(8, 8, '验证测试结果...')

    if (isUpdated) {
      logger.success(`\n✅ 测试通过！Link 字段已自动更新`)
      logger.info(`最终 posts 记录数据: ${JSON.stringify(finalPostRecord?.fields || finalPostRecord?.data, null, 2)}`)
      return true
    } else {
      logger.error(`\n❌ 测试失败！Link 字段未在 ${maxRetries * retryInterval / 1000} 秒内自动更新`)
      logger.error(`期望值: ${newTagName}`)
      if (finalPostRecord) {
        const finalLinkValue = (finalPostRecord.fields || finalPostRecord.data || {})[linkFieldId] as any
        let finalLinkTitle: string | null = null
        if (Array.isArray(finalLinkValue)) {
          if (finalLinkValue.length > 0 && finalLinkValue[0].title) {
            finalLinkTitle = finalLinkValue[0].title
          }
        } else if (finalLinkValue && finalLinkValue.title) {
          finalLinkTitle = finalLinkValue.title
        }
        logger.error(`实际值: ${finalLinkTitle}`)
        logger.error(`原始值: ${currentTagName}`)
      }
      return false
    }

  } catch (error: any) {
    logger.error(`\n❌ Blog 关联字段自动更新测试失败: ${error.message}`)
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
      // 登录
      logger.info('正在登录...')
      await client.auth.login('admin@126.com', 'Pmker123')
      logger.success('登录成功')
      
      const success = await runBlogLinkFieldUpdateTest({ 
        client, 
        baseId: 'd1bf33f2-5b1b-4d29-b31c-2e59dab42d36',
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

