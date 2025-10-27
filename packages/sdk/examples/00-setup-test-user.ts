/**
 * 设置测试账户
 * 在运行其他测试之前，确保测试账户存在
 */
import LuckDB from '../src';
import { config } from './common/config';

async function setupTestUser() {
  console.log('============================================================');
  console.log('设置测试账户');
  console.log('============================================================\n');

  const sdk = new LuckDB({
    baseUrl: config.apiUrl,
    debug: true,
  });

  try {
    // 尝试注册测试账户
    console.log('📝 尝试注册测试账户...');
    console.log(`   邮箱: ${config.testEmail}`);
    console.log(`   密码: ${config.testPassword}\n`);

    const response = await sdk.register({
      name: 'Test Admin',
      email: config.testEmail,
      password: config.testPassword,
    });

    console.log('✅ 测试账户注册成功！');
    console.log('   用户ID:', response.user.id);
    console.log('   用户名:', response.user.name);
    console.log('   邮箱:', response.user.email);
    console.log('   Token:', response.accessToken.substring(0, 20) + '...');

    // 尝试登出（如果失败也不影响）
    try {
      await sdk.logout();
      console.log('\n✅ 已登出');
    } catch (logoutError) {
      console.log('\n⚠️  登出失败（不影响使用）:', (logoutError as any).message);
    }

  } catch (error: any) {
    // 如果账户已存在，尝试登录验证
    if (error?.message?.includes('already exists') || 
        error?.message?.includes('已存在') ||
        error?.code === 'USER_EXISTS' ||
        error?.status === 409) {
      
      console.log('ℹ️  账户已存在，尝试登录验证...\n');

      try {
        const loginResponse = await sdk.login({
          email: config.testEmail,
          password: config.testPassword,
        });

        console.log('✅ 测试账户验证成功！');
        console.log('   用户ID:', loginResponse.user.id);
        console.log('   用户名:', loginResponse.user.name);
        console.log('   邮箱:', loginResponse.user.email);

        // 尝试登出（如果失败也不影响）
        try {
          await sdk.logout();
          console.log('\n✅ 已登出');
        } catch (logoutError) {
          console.log('\n⚠️  登出失败（不影响使用）');
        }

      } catch (loginError: any) {
        console.error('❌ 登录失败，可能密码不匹配:', loginError.message);
        console.error('\n请手动检查或删除现有账户后重试。');
        process.exit(1);
      }

    } else {
      // 其他错误
      console.error('❌ 设置测试账户失败:', error.message || error);
      console.error('\n错误详情:', error);
      
      // 如果是连接错误，提供帮助信息
      if (error.code === 'SERVER_ERROR' || error.message?.includes('503') || error.message?.includes('ECONNREFUSED')) {
        console.error('\n💡 提示: 请确保 LuckDB 服务器正在运行:');
        console.error('   cd /Users/leven/space/easy/luckdb/server');
        console.error('   make run');
      }
      
      process.exit(1);
    }
  }

  console.log('\n============================================================');
  console.log('✅ 测试账户设置完成！');
  console.log('============================================================');
  console.log('\n现在可以运行其他测试了:');
  console.log('  npx tsx examples/01-auth-test.ts');
  console.log('  npx tsx examples/02-space-crud.ts');
  console.log('  等等...\n');
}

// 运行设置
setupTestUser()
  .then(() => {
    console.log('✅ 完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 设置失败:', error);
    process.exit(1);
  });

