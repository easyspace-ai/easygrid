import LuckDB from '../src/index.js';
import dotenv from 'dotenv';

dotenv.config();

const runComprehensiveTest = async () => {
  console.log('Starting Comprehensive SDK Test...');

  const sdk = new LuckDB({
    baseUrl: process.env.API_BASE_URL || 'http://localhost:2345',
    debug: true,
  });

  try {
    // 1. 登录
    console.log('🔐 Step 1: Logging in...');
    await sdk.auth.login({
      email: process.env.TEST_EMAIL || 'admin@126.com',
      password: process.env.TEST_PASSWORD || 'Pmker123',
    });
    console.log('✅ Login successful');

    // 2. 用户配置测试
    console.log('⚙️ Step 2: Testing user configuration...');
    const userConfig = await sdk.getUserConfig();
    console.log('✅ User config retrieved');

    await sdk.updateUserConfig({
      theme: 'dark',
      language: 'zh-CN',
      preferences: { autoSave: true },
    });
    console.log('✅ User config updated');

    // 3. 创建空间
    console.log('🏠 Step 3: Creating space...');
    const space = await sdk.spaces.create({
      name: 'Test Space for SDK',
      description: 'A test space for comprehensive SDK testing',
    });
    console.log('✅ Space created:', space.id);

    // 4. 协作者管理测试
    console.log('👥 Step 4: Testing collaborator management...');
    
    // 添加空间协作者
    const spaceCollaborator = await sdk.addSpaceCollaborator(space.id, {
      userId: 'test-user-2',
      role: 'editor',
    });
    console.log('✅ Space collaborator added:', spaceCollaborator.id);

    // 列出空间协作者
    const spaceCollaborators = await sdk.listSpaceCollaborators(space.id);
    console.log('✅ Space collaborators listed:', spaceCollaborators.length);

    // 5. 创建基础
    console.log('📊 Step 5: Creating base...');
    const base = await sdk.bases.create({
      name: 'Test Base',
      description: 'A test base for SDK testing',
      spaceId: space.id,
    });
    console.log('✅ Base created:', base.id);

    // 6. 基础协作者管理
    console.log('👥 Step 6: Testing base collaborator management...');
    
    const baseCollaborator = await sdk.addBaseCollaborator(base.id, {
      userId: 'test-user-3',
      role: 'viewer',
    });
    console.log('✅ Base collaborator added:', baseCollaborator.id);

    const baseCollaborators = await sdk.listBaseCollaborators(base.id);
    console.log('✅ Base collaborators listed:', baseCollaborators.length);

    // 7. 创建表格
    console.log('📋 Step 7: Creating table...');
    const table = await sdk.tables.create({
      name: 'Test Table',
      description: 'A test table for SDK testing',
      baseId: base.id,
    });
    console.log('✅ Table created:', table.id);

    // 8. 表格管理功能测试
    console.log('🔧 Step 8: Testing table management features...');
    
    // 重命名表格
    await sdk.tables.renameTable(table.id, {
      name: 'Renamed Test Table',
    });
    console.log('✅ Table renamed');

    // 获取表格统计
    const tableStats = await sdk.tables.getTableStats(table.id);
    console.log('✅ Table stats retrieved:', tableStats);

    // 9. 创建视图
    console.log('👁️ Step 9: Creating view...');
    const view = await sdk.views.create({
      name: 'Test View',
      type: 'grid',
      tableId: table.id,
    });
    console.log('✅ View created:', view.id);

    // 10. 视图管理功能测试
    console.log('🔧 Step 10: Testing view management features...');
    
    // 启用分享
    const sharedView = await sdk.views.enableShare(view.id, 'test-password');
    console.log('✅ View sharing enabled');

    // 锁定视图
    const lockedView = await sdk.views.lock(view.id);
    console.log('✅ View locked');

    // 解锁视图
    const unlockedView = await sdk.views.unlock(view.id);
    console.log('✅ View unlocked');

    // 11. ShareDB 实时协作测试
    console.log('🔄 Step 11: Testing ShareDB real-time collaboration...');
    
    // 连接 ShareDB
    await sdk.connectShareDB();
    console.log('✅ ShareDB connected');

    // 创建文档
    const document = sdk.createDocument('test_collection', 'test_doc');
    console.log('✅ Document created');

    // 订阅文档
    document.subscribe((event) => {
      console.log('📡 Document event received:', event.type);
    });
    console.log('✅ Document subscribed');

    // 提交操作
    document.submitOp([
      {
        p: ['name'],
        oi: 'Test Document',
      },
    ]);
    console.log('✅ Operation submitted');

    // 12. 清理资源
    console.log('🧹 Step 12: Cleaning up resources...');
    
    // 移除协作者
    await sdk.removeSpaceCollaborator(space.id, spaceCollaborator.id);
    console.log('✅ Space collaborator removed');

    await sdk.removeBaseCollaborator(base.id, baseCollaborator.id);
    console.log('✅ Base collaborator removed');

    // 删除表格
    await sdk.tables.delete(table.id);
    console.log('✅ Table deleted');

    // 删除基础
    await sdk.bases.delete(base.id);
    console.log('✅ Base deleted');

    // 删除空间
    await sdk.spaces.delete(space.id);
    console.log('✅ Space deleted');

    // 断开 ShareDB 连接
    sdk.disconnectShareDB();
    console.log('✅ ShareDB disconnected');

    console.log('🎉 Comprehensive SDK Test completed successfully!');

  } catch (error) {
    console.error('❌ Comprehensive SDK Test failed:', error);
    throw error;
  }
};

runComprehensiveTest();
