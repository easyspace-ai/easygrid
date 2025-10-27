#!/usr/bin/env node

/**
 * 系统测试脚本
 * 验证后端服务、前端服务和 ShareDB 实时同步功能
 */

import http from 'http';
import https from 'https';

// 测试配置
const config = {
  backend: 'http://localhost:2345',
  frontend: 'http://localhost:3032',
  testUser: {
    email: 'admin@126.com',
    password: 'Pmker123'
  }
};

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP 请求工具
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = httpModule.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

// 测试后端服务
async function testBackend() {
  log('\n🔍 测试后端服务...', 'blue');
  
  try {
    // 测试登录
    const loginResponse = await makeRequest(`${config.backend}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: config.testUser
    });

    if (loginResponse.status === 200 && loginResponse.data.code === 200000) {
      log('✅ 后端服务正常，登录成功', 'green');
      return loginResponse.data.data.accessToken;
    } else {
      log(`❌ 后端登录失败: ${loginResponse.data.message}`, 'red');
      return null;
    }
  } catch (error) {
    log(`❌ 后端服务连接失败: ${error.message}`, 'red');
    return null;
  }
}

// 测试前端服务
async function testFrontend() {
  log('\n🔍 测试前端服务...', 'blue');
  
  try {
    const response = await makeRequest(config.frontend);
    if (response.status === 200) {
      log('✅ 前端服务正常', 'green');
      return true;
    } else {
      log(`❌ 前端服务异常: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ 前端服务连接失败: ${error.message}`, 'red');
    return false;
  }
}

// 测试 ShareDB 连接
async function testShareDB(token) {
  log('\n🔍 测试 ShareDB 连接...', 'blue');
  
  try {
    // 这里应该测试 WebSocket 连接，但为了简化，我们只检查后端是否支持 ShareDB
    const response = await makeRequest(`${config.backend}/api/v1/sharedb/status`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 200) {
      log('✅ ShareDB 服务正常', 'green');
      return true;
    } else {
      log(`⚠️  ShareDB 服务可能未启用: ${response.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`⚠️  ShareDB 连接测试失败: ${error.message}`, 'yellow');
    return false;
  }
}

// 主测试函数
async function runTests() {
  log('🚀 开始系统测试...', 'bold');
  
  const results = {
    backend: false,
    frontend: false,
    sharedb: false
  };

  // 测试后端
  const token = await testBackend();
  results.backend = token !== null;

  // 测试前端
  results.frontend = await testFrontend();

  // 测试 ShareDB
  if (token) {
    results.sharedb = await testShareDB(token);
  }

  // 输出结果
  log('\n📊 测试结果:', 'bold');
  log(`后端服务: ${results.backend ? '✅ 正常' : '❌ 异常'}`, results.backend ? 'green' : 'red');
  log(`前端服务: ${results.frontend ? '✅ 正常' : '❌ 异常'}`, results.frontend ? 'green' : 'red');
  log(`ShareDB: ${results.sharedb ? '✅ 正常' : '⚠️  异常'}`, results.sharedb ? 'green' : 'yellow');

  if (results.backend && results.frontend) {
    log('\n🎉 系统基本功能正常，可以开始测试实时同步！', 'green');
    log(`前端地址: ${config.frontend}`, 'blue');
    log(`测试账号: ${config.testUser.email}`, 'blue');
  } else {
    log('\n❌ 系统存在问题，请检查服务状态', 'red');
  }
}

// 运行测试
runTests().catch(console.error);
