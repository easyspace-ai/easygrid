/**
 * 实时同步测试
 * 模拟两个客户端进行实时数据同步测试
 */

import LuckDB from '../src/index.js';

// 配置
const config = {
  baseUrl: 'http://localhost:8080',
  debug: true,
};

// 测试数据
const testData = {
  tableId: 'tbl_test_sync',
  recordId: 'rec_test_001',
  fieldId: 'name',
  initialValue: 'Initial Value',
  updatedValue: 'Updated Value'
};

/**
 * 客户端 A - 监听者
 */
async function createClientA() {
  console.log('🔵 客户端 A 启动...');
  
  const sdk = new LuckDB(config);
  
  try {
    // 1. 登录
    console.log('🔵 客户端 A 登录...');
    const authResponse = await sdk.login({
      email: 'admin@126.com',
      password: 'Pmker123',
    });
    console.log('🔵 客户端 A 登录成功:', authResponse.user.name);

    // 2. 连接 ShareDB
    console.log('🔵 客户端 A 连接 ShareDB...');
    await sdk.connectShareDB();
    console.log('🔵 客户端 A ShareDB 连接成功');

    // 3. 订阅记录
    console.log('🔵 客户端 A 订阅记录...');
    const record = sdk.realtime.record(testData.tableId, testData.recordId);
    
    // 监听字段变化
    record.on('change', (field, value) => {
      console.log('🔵 客户端 A 收到字段变化:', field, '=', value);
    });

    // 订阅记录
    record.subscribe();
    console.log('🔵 客户端 A 记录订阅成功');

    // 4. 等待来自客户端 B 的更新
    console.log('🔵 客户端 A 等待来自客户端 B 的更新...');
    
    // 保持连接，等待更新
    await new Promise(resolve => setTimeout(resolve, 30000)); // 等待 30 秒

    // 5. 清理
    console.log('🔵 客户端 A 清理资源...');
    record.destroy();
    sdk.disconnectShareDB();
    console.log('🔵 客户端 A 测试完成');

  } catch (error) {
    console.error('🔵 客户端 A 错误:', error);
  }
}

/**
 * 客户端 B - 操作者
 */
async function createClientB() {
  console.log('🟢 客户端 B 启动...');
  
  const sdk = new LuckDB(config);
  
  try {
    // 1. 登录
    console.log('🟢 客户端 B 登录...');
    const authResponse = await sdk.login({
      email: 'admin@126.com',
      password: 'Pmker123',
    });
    console.log('🟢 客户端 B 登录成功:', authResponse.user.name);

    // 2. 连接 ShareDB
    console.log('🟢 客户端 B 连接 ShareDB...');
    await sdk.connectShareDB();
    console.log('🟢 客户端 B ShareDB 连接成功');

    // 3. 等待 5 秒让客户端 A 先订阅
    console.log('🟢 客户端 B 等待 5 秒...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 4. 订阅记录
    console.log('🟢 客户端 B 订阅记录...');
    const record = sdk.realtime.record(testData.tableId, testData.recordId);
    
    // 监听字段变化
    record.on('change', (field, value) => {
      console.log('🟢 客户端 B 收到字段变化:', field, '=', value);
    });

    // 订阅记录
    record.subscribe();
    console.log('🟢 客户端 B 记录订阅成功');

    // 5. 等待 2 秒后开始更新
    console.log('🟢 客户端 B 等待 2 秒后开始更新...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. 执行一系列更新操作
    console.log('🟢 客户端 B 开始更新字段...');
    
    // 更新 1
    console.log('🟢 客户端 B 更新 1: name = "First Update"');
    await record.set('name', 'First Update');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 更新 2
    console.log('🟢 客户端 B 更新 2: name = "Second Update"');
    await record.set('name', 'Second Update');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 更新 3
    console.log('🟢 客户端 B 更新 3: age = 25');
    await record.set('age', 25);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 更新 4
    console.log('🟢 客户端 B 更新 4: email = "test@example.com"');
    await record.set('email', 'test@example.com');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 更新 5
    console.log('🟢 客户端 B 更新 5: name = "Final Update"');
    await record.set('name', 'Final Update');

    // 7. 等待 5 秒观察结果
    console.log('🟢 客户端 B 等待 5 秒观察结果...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 8. 清理
    console.log('🟢 客户端 B 清理资源...');
    record.destroy();
    sdk.disconnectShareDB();
    console.log('🟢 客户端 B 测试完成');

  } catch (error) {
    console.error('🟢 客户端 B 错误:', error);
  }
}

/**
 * 运行测试
 */
async function runSyncTest() {
  console.log('🚀 开始实时同步测试...\n');
  console.log('测试配置:', testData);
  console.log('');

  // 并行启动两个客户端
  const clientA = createClientA();
  const clientB = createClientB();

  try {
    await Promise.all([clientA, clientB]);
    console.log('\n🎉 实时同步测试完成！');
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runSyncTest().catch(console.error);
}

export default runSyncTest;
