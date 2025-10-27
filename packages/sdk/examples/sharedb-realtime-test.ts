/**
 * ShareDB 实时协作测试
 * 演示如何使用 ShareDB 进行实时协作
 */

import LuckDB from '../src/index.js';
import type { ShareDBMessage, ShareDBOperation } from '../src/types/index.js';

// 配置
const config = {
  baseUrl: 'http://localhost:2345',
  debug: true,
};

async function testShareDBRealtime() {
  console.log('🚀 开始 ShareDB 实时协作测试...\n');

  // 初始化 SDK
  const easyspace = new LuckDB(config);

  try {
    // 1. 用户登录
    console.log('1. 用户登录...');
    const authResponse = await easyspace.login({
      email: 'admin@126.com',
      password: 'Pmker123',
    });
    console.log('✅ 登录成功:', authResponse.user.name);

    // 2. 连接 ShareDB
    console.log('\n2. 连接 ShareDB...');
    await easyspace.connectShareDB();
    console.log('✅ ShareDB 连接成功');

    // 3. 创建文档实例
    console.log('\n3. 创建文档实例...');
    const document = easyspace.createDocument('record_tbl_123', 'rec_456');
    console.log('✅ 文档实例创建成功');

    // 4. 获取文档快照
    console.log('\n4. 获取文档快照...');
    const snapshot = await document.fetch();
    console.log('✅ 文档快照:', snapshot);

    // 5. 订阅文档变更
    console.log('\n5. 订阅文档变更...');
    document.subscribe();
    document.on('operation', (event) => {
      console.log('📝 收到操作:', event.data);
    });
    document.on('snapshot', (event) => {
      console.log('📸 收到快照:', event.data);
    });
    console.log('✅ 文档订阅成功');

    // 6. 提交操作
    console.log('\n6. 提交操作...');
    const operation: ShareDBOperation[] = [
      {
        p: ['fields', 'name'],
        oi: 'New Value',
        od: 'Old Value',
      },
    ];
    document.submitOp(operation);
    console.log('✅ 操作提交成功');

    // 7. 创建在线状态管理器
    console.log('\n7. 创建在线状态管理器...');
    const presence = easyspace.createPresence('record_tbl_123', 'rec_456');
    presence.start();
    presence.updateCursor({ x: 100, y: 200 });
    console.log('✅ 在线状态管理启动');

    // 8. 监听在线状态变化
    presence.onPresenceUpdate((update) => {
      console.log('👥 在线状态更新:', update);
    });

    // 9. 测试连接状态
    console.log('\n9. 检查连接状态...');
    const connectionState = easyspace.getShareDBConnectionState();
    console.log('✅ 连接状态:', connectionState);

    // 10. 等待一段时间观察实时更新
    console.log('\n10. 等待实时更新...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 11. 清理资源
    console.log('\n11. 清理资源...');
    document.unsubscribe();
    presence.stop();
    easyspace.disconnectShareDB();
    console.log('✅ 资源清理完成');

    console.log('\n🎉 ShareDB 实时协作测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testShareDBRealtime().catch(console.error);
}

export default testShareDBRealtime;
