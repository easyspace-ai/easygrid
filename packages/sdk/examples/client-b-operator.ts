/**
 * 客户端 B - 操作者
 * 运行: npm run test:client-b
 */

import LuckDB from '../src/index.js';

const config = {
  baseUrl: 'http://localhost:8080',
  debug: true,
};

const testData = {
  tableId: 'tbl_test_sync',
  recordId: 'rec_test_001',
};

async function runClientB() {
  console.log('🟢 客户端 B (操作者) 启动...');
  
  const sdk = new LuckDB(config);
  
  try {
    // 登录
    console.log('🟢 登录...');
    const authResponse = await sdk.login({
      email: 'admin@126.com',
      password: 'Pmker123',
    });
    console.log('🟢 登录成功:', authResponse.user.name);

    // 连接 ShareDB
    console.log('🟢 连接 ShareDB...');
    await sdk.connectShareDB();
    console.log('🟢 ShareDB 连接成功，状态:', sdk.getShareDBConnectionState());

    // 等待 10 秒让客户端 A 先订阅
    console.log('🟢 等待 10 秒让客户端 A 先订阅...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 订阅记录
    console.log('🟢 订阅记录...');
    const record = sdk.realtime.record(testData.tableId, testData.recordId);
    
    // 监听字段变化
    record.on('change', (field, value) => {
      console.log('🟢 📝 收到字段变化:', field, '=', value);
    });

    // 订阅记录
    record.subscribe();
    console.log('🟢 记录订阅成功');

    // 显示统计信息
    const stats = sdk.getRealtimeStats();
    console.log('🟢 实时统计:', stats);

    // 等待 2 秒后开始更新
    console.log('🟢 等待 2 秒后开始更新...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 执行一系列更新操作
    console.log('🟢 开始更新字段...');
    
    const updates = [
      { field: 'name', value: 'First Update', delay: 2000 },
      { field: 'name', value: 'Second Update', delay: 2000 },
      { field: 'age', value: 25, delay: 2000 },
      { field: 'email', value: 'test@example.com', delay: 2000 },
      { field: 'name', value: 'Final Update', delay: 2000 },
    ];

    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      console.log(`🟢 更新 ${i + 1}: ${update.field} = ${update.value}`);
      
      try {
        await record.set(update.field, update.value);
        console.log(`🟢 ✅ 更新 ${i + 1} 成功`);
      } catch (error) {
        console.error(`🟢 ❌ 更新 ${i + 1} 失败:`, error);
      }
      
      if (i < updates.length - 1) {
        await new Promise(resolve => setTimeout(resolve, update.delay));
      }
    }

    // 等待 5 秒观察结果
    console.log('🟢 等待 5 秒观察结果...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 清理
    console.log('🟢 清理资源...');
    record.destroy();
    sdk.disconnectShareDB();
    console.log('🟢 客户端 B 完成');

  } catch (error) {
    console.error('🟢 错误:', error);
  }
}

runClientB().catch(console.error);
