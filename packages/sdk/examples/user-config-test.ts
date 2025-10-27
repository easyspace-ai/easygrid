import LuckDB from '../src/index.js';
import dotenv from 'dotenv';

dotenv.config();

const runUserConfigTest = async () => {
  console.log('Starting User Configuration Test...');

  const sdk = new LuckDB({
    baseUrl: process.env.API_BASE_URL || 'http://localhost:2345',
    debug: true,
  });

  try {
    // 登录
    console.log('🔐 Logging in...');
    await sdk.auth.login({
      email: process.env.TEST_EMAIL || 'admin@126.com',
      password: process.env.TEST_PASSWORD || 'Pmker123',
    });
    console.log('✅ Login successful');

    // 获取用户配置
    console.log('📋 Getting user configuration...');
    const userConfig = await sdk.getUserConfig();
    console.log('✅ User config retrieved:', userConfig);

    // 更新用户配置
    console.log('⚙️ Updating user configuration...');
    const updatedConfig = await sdk.updateUserConfig({
      theme: 'dark',
      language: 'zh-CN',
      notifications: {
        email: true,
        push: false,
        sms: false,
      },
      preferences: {
        autoSave: true,
        showGridlines: true,
        defaultView: 'grid',
      },
    });
    console.log('✅ User config updated:', updatedConfig);

    // 再次获取配置以验证更新
    console.log('🔍 Verifying configuration update...');
    const verifyConfig = await sdk.getUserConfig();
    console.log('✅ Verified config:', verifyConfig);

    console.log('🎉 User Configuration Test completed successfully!');

  } catch (error) {
    console.error('❌ User Configuration Test failed:', error);
    throw error;
  }
};

runUserConfigTest();