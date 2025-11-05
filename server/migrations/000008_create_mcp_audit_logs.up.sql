-- =====================================================
-- Migration: 000008_create_mcp_audit_logs
-- Description: 创建 MCP 审计日志表
-- =====================================================

CREATE TABLE IF NOT EXISTS mcp_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(255),
    tenant_id VARCHAR(255),
    api_key_id VARCHAR(255),
    tool VARCHAR(255) NOT NULL,
    input_hash VARCHAR(255),
    output_hash VARCHAR(255),
    duration_ms INT,
    http_status INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mcp_audit_logs_api_key ON mcp_audit_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_logs_tool ON mcp_audit_logs(tool);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_logs_created_at ON mcp_audit_logs(created_at);

COMMENT ON TABLE mcp_audit_logs IS 'MCP HTTP 调用审计日志';

