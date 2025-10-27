/**
 * 客户端 A - 监听者
 * 运行: npm run test:client-a
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

async function runClientA() {
  console.log('🔵 客户端 A (监听者) 启动...');
  
  const sdk = new LuckDB(config);
  
  try {
    // 登录
    console.log('🔵 登录...');
    const authResponse = await sdk.login({
      email: 'admin@126.com',
      password: 'Pmker123',
    });
    console.log('🔵 登录成功:', authResponse.user.name);

    // 连接 ShareDB
    console.log('🔵 连接 ShareDB...');
    await sdk.connectShareDB();
    console.log('🔵 ShareDB 连接成功，状态:', sdk.getShareDBConnectionState());

    // 订阅记录
    console.log('🔵 订阅记录...');
    const record = sdk.realtime.record(testData.tableId, testData.recordId);
    
    // 监听字段变化
    record.on('change', (field, value) => {
      console.log('🔵 📝 收到字段变化:', field, '=', value);
    });

    // 订阅记录
    record.subscribe();
    console.log('🔵 记录订阅成功，等待来自客户端 B 的更新...');

    // 显示统计信息
    const stats = sdk.getRealtimeStats();
    console.log('🔵 实时统计:', stats);

    // 保持连接，等待更新
    console.log('🔵 等待 60 秒...');
    await new Promise(resolve => setTimeout(resolve, 60000));

    // 清理
    console.log('🔵 清理资源...');
    record.destroy();
    sdk.disconnectShareDB();
    console.log('🔵 客户端 A 完成');

  } catch (error) {
    console.error('🔵 错误:', error);
  }
}

runClientA().catch(console.error);
