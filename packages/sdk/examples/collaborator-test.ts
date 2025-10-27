/**
 * 协作者管理测试
 * 演示如何使用协作者管理功能
 */

import LuckDB from '../src/index.js';
import type { AddCollaboratorRequest, UpdateCollaboratorRequest } from '../src/types/index.js';

// 配置
const config = {
  baseUrl: 'http://localhost:2345',
  debug: true,
};

async function testCollaboratorManagement() {
  console.log('🚀 开始协作者管理测试...\n');

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

    // 2. 获取空间列表
    console.log('\n2. 获取空间列表...');
    const spaces = await easyspace.listSpaces();
    console.log('✅ 空间列表:', spaces.map(s => s.name));

    if (spaces.length === 0) {
      console.log('❌ 没有找到空间，请先创建空间');
      return;
    }

    const spaceId = spaces[0].id;
    console.log('📝 使用空间:', spaces[0].name);

    // 3. 获取 Space 协作者列表
    console.log('\n3. 获取 Space 协作者列表...');
    const spaceCollaborators = await easyspace.listSpaceCollaborators(spaceId);
    console.log('✅ Space 协作者:', spaceCollaborators);

    // 4. 添加 Space 协作者
    console.log('\n4. 添加 Space 协作者...');
    const addSpaceCollaboratorRequest: AddCollaboratorRequest = {
      principalId: 'usr_weZb3N78EFgm2oYhUPMb6', // 使用当前登录用户的 ID
      principalType: 'user',
      role: 'editor',
    };
    
    try {
      const newSpaceCollaborator = await easyspace.addSpaceCollaborator(spaceId, addSpaceCollaboratorRequest);
      console.log('✅ Space 协作者添加成功:', newSpaceCollaborator);
    } catch (error) {
      console.log('⚠️ 添加 Space 协作者失败（可能是用户不存在）:', error);
    }

    // 5. 获取基础表列表
    console.log('\n5. 获取基础表列表...');
    const bases = await easyspace.listBases({ spaceId });
    console.log('✅ 基础表列表:', bases.map(b => b.name));

    if (bases.length === 0) {
      console.log('❌ 没有找到基础表，请先创建基础表');
      return;
    }

    const baseId = bases[0].id;
    console.log('📝 使用基础表:', bases[0].name);

    // 6. 获取 Base 协作者列表
    console.log('\n6. 获取 Base 协作者列表...');
    const baseCollaborators = await easyspace.listBaseCollaborators(baseId);
    console.log('✅ Base 协作者:', baseCollaborators);

    // 7. 添加 Base 协作者
    console.log('\n7. 添加 Base 协作者...');
    const addBaseCollaboratorRequest: AddCollaboratorRequest = {
      principalId: 'usr_weZb3N78EFgm2oYhUPMb6', // 使用当前登录用户的 ID
      principalType: 'user',
      role: 'viewer',
    };
    
    try {
      const newBaseCollaborator = await easyspace.addBaseCollaborator(baseId, addBaseCollaboratorRequest);
      console.log('✅ Base 协作者添加成功:', newBaseCollaborator);
    } catch (error) {
      console.log('⚠️ 添加 Base 协作者失败（可能是用户不存在）:', error);
    }

    // 8. 更新协作者角色
    if (spaceCollaborators.length > 0) {
      console.log('\n8. 更新 Space 协作者角色...');
      const collaboratorId = spaceCollaborators[0].id;
      const updateRequest: UpdateCollaboratorRequest = {
        role: 'viewer',
      };
      
      try {
        const updatedCollaborator = await easyspace.updateSpaceCollaborator(
          spaceId,
          collaboratorId,
          updateRequest
        );
        console.log('✅ Space 协作者更新成功:', updatedCollaborator);
      } catch (error) {
        console.log('⚠️ 更新 Space 协作者失败:', error);
      }
    }

    // 9. 检查用户权限
    console.log('\n9. 检查用户权限...');
    try {
      const hasPermission = await easyspace.collaborators.hasPermission(
        'space',
        spaceId,
        'current_user_id',
        'editor'
      );
      console.log('✅ 用户权限检查:', hasPermission);
    } catch (error) {
      console.log('⚠️ 权限检查失败:', error);
    }

    // 10. 获取用户角色
    console.log('\n10. 获取用户角色...');
    try {
      const userRole = await easyspace.collaborators.getUserRole(
        'space',
        spaceId,
        'current_user_id'
      );
      console.log('✅ 用户角色:', userRole);
    } catch (error) {
      console.log('⚠️ 获取用户角色失败:', error);
    }

    // 11. 根据角色获取协作者
    console.log('\n11. 根据角色获取协作者...');
    try {
      const editors = await easyspace.collaborators.getCollaboratorsByRole(
        'space',
        spaceId,
        'editor'
      );
      console.log('✅ 编辑者协作者:', editors.map(c => c.userId));
    } catch (error) {
      console.log('⚠️ 获取编辑者协作者失败:', error);
    }

    console.log('\n🎉 协作者管理测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testCollaboratorManagement().catch(console.error);
}

export default testCollaboratorManagement;
