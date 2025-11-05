/* Minimal MCP HTTP client example (Node >=18) */
import http from 'node:http';
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const BASE_URL = process.env.MCP_BASE_URL; // e.g. http://localhost:8080/api/mcp/v1

// 优先从 ~/.easygrid/api-key 读取，fallback 到环境变量
function getAPIKey() {
  if (process.env.MCP_API_KEY) {
    return process.env.MCP_API_KEY;
  }
  try {
    const keyPath = join(homedir(), '.easygrid', 'api-key');
    return readFileSync(keyPath, 'utf-8').trim();
  } catch (err) {
    return null;
  }
}

const API_KEY = getAPIKey();

if (!BASE_URL || !API_KEY) {
  console.error('Set MCP_BASE_URL and MCP_API_KEY, or run: mcp-api-key -action=create');
  process.exit(1);
}

const agent = BASE_URL.startsWith('https') ? https : http;

async function get(path) {
  const url = new URL(path, BASE_URL);
  return fetch(url, { headers: { 'X-MCP-API-Key': API_KEY } }).then(r => r.text()).then(t => console.log('GET', url.toString(), t));
}

async function post(path, body) {
  const url = new URL(path, BASE_URL);
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-MCP-API-Key': API_KEY },
    body: JSON.stringify(body)
  }).then(r => r.text()).then(t => console.log('POST', url.toString(), t));
}

await get('/tools');
await post('/tools/base.list/invoke', { id: 'req-1', input: { spaceId: 'default' } });


