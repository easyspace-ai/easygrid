/**
 * 集成测试脚本
 * 
 * 用于验证 StandardDataViewV3 集成是否正常工作
 */

import { LuckDB } from '@easygrid/sdk';
import { config } from './config';

export async function testIntegration() {
  console.log('🧪 开始集成测试...');

  try {
    // 1. 测试 SDK 初始化
    console.log('1️⃣ 测试 SDK 初始化...');
    const sdk = new LuckDB({
      baseUrl: config.baseURL,
      debug: true,
    });
    console.log('✅ SDK 初始化成功');

    // 2. 测试登录
    console.log('2️⃣ 测试用户登录...');
    await sdk.login({
      email: config.demo.user.email,
      password: config.demo.user.password,
    });
    console.log('✅ 用户登录成功');

    // 3. 测试表格访问
    console.log('3️⃣ 测试表格访问...');
    const table = await sdk.getTable({ tableId: config.testBase.tableId });
    console.log('✅ 表格访问成功:', table.name);

    // 4. 测试字段获取
    console.log('4️⃣ 测试字段获取...');
    const fields = await sdk.listFields({ tableId: config.testBase.tableId });
    console.log('✅ 字段获取成功:', fields.length, '个字段');

    // 5. 测试记录获取
    console.log('5️⃣ 测试记录获取...');
    const records = await sdk.listRecords({ tableId: config.testBase.tableId });
    console.log('✅ 记录获取成功:', records.data?.length || 0, '条记录');

    // 6. 测试视图获取
    console.log('6️⃣ 测试视图获取...');
    try {
      const views = await sdk.listViews({ tableId: config.testBase.tableId });
      console.log('✅ 视图获取成功:', views.length, '个视图');
    } catch (error) {
      console.log('⚠️ 视图获取失败（可能不支持）:', error);
    }

    // 7. 测试记录创建
    console.log('7️⃣ 测试记录创建...');
    const testRecord = await sdk.createRecord({
      tableId: config.testBase.tableId,
      data: {
        [fields[0]?.id]: '测试记录',
        [fields[1]?.id]: new Date().toISOString(),
      },
    });
    console.log('✅ 记录创建成功:', testRecord.id);

    // 8. 测试记录更新
    console.log('8️⃣ 测试记录更新...');
    await sdk.updateRecord({
      tableId: config.testBase.tableId,
      recordId: testRecord.id,
      data: {
        [fields[0]?.id]: '测试记录（已更新）',
      },
    });
    console.log('✅ 记录更新成功');

    // 9. 测试记录删除
    console.log('9️⃣ 测试记录删除...');
    await sdk.deleteRecord({
      tableId: config.testBase.tableId,
      recordId: testRecord.id,
    });
    console.log('✅ 记录删除成功');

    console.log('🎉 所有测试通过！集成成功！');

    return {
      success: true,
      table: table.name,
      fieldsCount: fields.length,
      recordsCount: records.data?.length || 0,
    };

  } catch (error) {
    console.error('❌ 集成测试失败:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// 如果直接运行此文件
if (typeof window === 'undefined') {
  testIntegration().then((result) => {
    if (result.success) {
      console.log('🎉 集成测试完成！');
      process.exit(0);
    } else {
      console.error('❌ 集成测试失败！');
      process.exit(1);
    }
  });
}

