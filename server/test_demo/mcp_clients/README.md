# MCP HTTP Clients & Tests

## Real DB Integration Test

- Ensure database is up and config is correct (`server/config.yaml` or env vars used by config loader)
- Export:
  - `MCP_REALDB_TEST=1`
  - any DB-related envs your config loader needs
- Run:
  - `go test ./internal/interfaces/http -run Test_MCP_HTTP_EndToEnd_WithRealDB -v`

## Go Client

```bash
export MCP_BASE_URL=http://localhost:8080/api/mcp/v1
export MCP_API_KEY=key_id:key_secret
go run server/test_demo/mcp_clients/go_client/main.go
```

## JS Client (Node >= 18)

```bash
export MCP_BASE_URL=http://localhost:8080/api/mcp/v1
export MCP_API_KEY=key_id:key_secret
node server/test_demo/mcp_clients/js_client/index.js
```
