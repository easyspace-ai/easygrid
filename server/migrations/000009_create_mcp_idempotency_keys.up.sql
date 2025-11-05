-- =====================================================
-- Migration: 000009_create_mcp_idempotency_keys
-- Description: 创建 MCP 幂等键缓存表（可选，Redis 为主）
-- =====================================================

CREATE TABLE IF NOT EXISTS mcp_idempotency_keys (
    api_key_id VARCHAR(255) NOT NULL,
    idem_key VARCHAR(255) NOT NULL,
    route_hash VARCHAR(255) NOT NULL,
    body_hash VARCHAR(255) NOT NULL,
    response JSONB,
    expires_at TIMESTAMP NOT NULL,
    PRIMARY KEY (api_key_id, idem_key)
);

CREATE INDEX IF NOT EXISTS idx_mcp_idem_expires ON mcp_idempotency_keys(expires_at);

COMMENT ON TABLE mcp_idempotency_keys IS 'MCP 幂等键结果缓存（后备存储）';

