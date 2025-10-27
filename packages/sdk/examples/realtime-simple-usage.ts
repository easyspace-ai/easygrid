/**
 * 实时协作简单使用示例
 * 展示新的高级 API 的使用方法
 */

import LuckDB from '../src/index.js';

// 配置
const config = {
  baseUrl: 'http://localhost:8080',
  debug: true,
};

async function demonstrateRealtimeAPI() {
  console.log('🚀 开始演示 LuckDB 实时协作 API...\n');

  // 初始化 SDK
  const sdk = new LuckDB(config);

  try {
    // 1. 用户登录
    console.log('1. 用户登录...');
    const authResponse = await sdk.login({
      email: 'admin@126.com',
      password: 'Pmker123',
    });
    console.log('✅ 登录成功:', authResponse.user.name);

    // 2. 连接 ShareDB
    console.log('\n2. 连接 ShareDB...');
    await sdk.connectShareDB();
    console.log('✅ ShareDB 连接成功');

    // 3. 使用新的实时 API - 记录操作
    console.log('\n3. 记录操作示例...');
    const record = sdk.realtime.record('tbl_123', 'rec_456');
    
    // 监听字段变化
    record.on('change', (field, value) => {
      console.log(`📝 字段 ${field} 更新为:`, value);
    });

    // 更新字段 - 无需处理 OT 操作
    await record.set('name', 'New Name');
    await record.set('age', 25);
    console.log('✅ 记录字段更新完成');

    // 4. 表格操作示例
    console.log('\n4. 表格操作示例...');
    const table = sdk.realtime.table('tbl_123');
    
    // 监听表格变更
    table.on('record-added', (event) => {
      console.log('➕ 新记录添加:', event.recordId);
    });
    
    table.on('record-changed', (event) => {
      console.log('📝 记录变更:', event.recordId, event.data);
    });

    // 批量更新
    await table.batchUpdate([
      { recordId: 'rec_1', fieldId: 'name', value: 'Alice' },
      { recordId: 'rec_2', fieldId: 'name', value: 'Bob' }
    ]);
    console.log('✅ 批量更新完成');

    // 5. 视图操作示例
    console.log('\n5. 视图操作示例...');
    const view = sdk.realtime.view('viw_123', 'tbl_123');
    
    // 监听视图变更
    view.on('view-changed', (event) => {
      console.log('👁️ 视图变更:', event.type, event.data);
    });

    // 更新过滤器
    await view.updateFilter({
      field: 'status',
      operator: 'equals',
      value: 'active'
    });
    console.log('✅ 视图过滤器更新完成');

    // 6. 在线状态示例
    console.log('\n6. 在线状态示例...');
    const presence = sdk.realtime.presence('table', 'tbl_123', {
      userId: authResponse.user.id,
      name: authResponse.user.name,
      avatar: authResponse.user.avatar
    });

    // 监听用户加入/离开
    presence.onUserJoined((user) => {
      console.log(`👋 ${user.name} 加入协作`);
    });
    
    presence.onUserLeft((user) => {
      console.log(`👋 ${user.name} 离开协作`);
    });

    // 更新光标位置
    presence.updateCursor({
      tableId: 'tbl_123',
      recordId: 'rec_456',
      fieldId: 'fld_name',
      x: 100,
      y: 200,
      timestamp: Date.now()
    });
    console.log('✅ 在线状态设置完成');

    // 7. 获取统计信息
    console.log('\n7. 获取统计信息...');
    const stats = sdk.getRealtimeStats();
    console.log('📊 实时统计:', stats);

    // 8. 等待一段时间观察实时更新
    console.log('\n8. 等待实时更新...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 9. 清理资源
    console.log('\n9. 清理资源...');
    record.destroy();
    table.destroy();
    view.destroy();
    presence.destroy();
    sdk.disconnectShareDB();
    console.log('✅ 资源清理完成');

    console.log('\n🎉 实时协作 API 演示完成！');

  } catch (error) {
    console.error('❌ 演示失败:', error);
  }
}

// 运行演示
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateRealtimeAPI().catch(console.error);
}

export default demonstrateRealtimeAPI;
