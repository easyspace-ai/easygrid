#!/usr/bin/env python3
"""
自动从 ~/.easygrid/api-key 读取并更新 ~/.cursor/mcp.json
"""

import json
import os
from pathlib import Path

def main():
    home = Path.home()
    api_key_file = home / ".easygrid" / "api-key"
    mcp_json = home / ".cursor" / "mcp.json"
    
    if not api_key_file.exists():
        print(f"Error: API Key file not found at {api_key_file}")
        print("Run: go run server/cmd/mcp-api-key/main.go -action=create")
        return 1
    
    api_key = api_key_file.read_text().strip()
    if not api_key:
        print("Error: API Key is empty")
        return 1
    
    if not mcp_json.exists():
        print(f"Error: mcp.json not found at {mcp_json}")
        return 1
    
    # 读取并更新配置
    with open(mcp_json, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    # 备份
    backup = mcp_json.with_suffix('.json.bak')
    with open(backup, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    # 更新 easygrid 或 easygrid-mcp 的配置（优先使用 easygrid）
    if "mcpServers" not in config:
        config["mcpServers"] = {}
    
    # 优先使用 "easygrid"，如果不存在则使用 "easygrid-mcp"
    server_name = "easygrid"
    if server_name not in config["mcpServers"]:
        # 如果 easygrid 不存在，检查是否有 easygrid-mcp
        if "easygrid-mcp" in config["mcpServers"]:
            server_name = "easygrid-mcp"
        else:
            config["mcpServers"][server_name] = {}
    
    if "headers" not in config["mcpServers"][server_name]:
        config["mcpServers"][server_name]["headers"] = {}
    
    config["mcpServers"][server_name]["headers"]["X-MCP-API-Key"] = api_key
    config["mcpServers"][server_name]["url"] = "http://localhost:8080/api/mcp/v1"
    config["mcpServers"][server_name]["description"] = "EasyGrid CRUD - MCP HTTP"
    
    # 写入
    with open(mcp_json, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Updated {mcp_json} with API Key from {api_key_file}")
    print("Please restart Cursor to apply changes")
    return 0

if __name__ == "__main__":
    exit(main())

