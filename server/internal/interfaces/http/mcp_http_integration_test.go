package http

import (
    "bytes"
    "context"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "os"
    "testing"

    "github.com/gin-gonic/gin"

    appcfg "github.com/easyspace-ai/luckdb/server/internal/config"
    "github.com/easyspace-ai/luckdb/server/internal/container"
    mcpauth "github.com/easyspace-ai/luckdb/server/internal/mcp/auth"
    mcpRepo "github.com/easyspace-ai/luckdb/server/internal/mcp/auth/repository"
)

func newTestContainer(t *testing.T) *container.Container {
    t.Helper()
    cfg, err := appcfg.Load()
    if err != nil { t.Fatalf("load config: %v", err) }
    cont := container.NewContainer(cfg)
    if err := cont.Initialize(); err != nil { t.Fatalf("init container: %v", err) }
    t.Cleanup(func(){ cont.Close() })
    return cont
}

func issueAPIKey(t *testing.T, cont *container.Container) string {
    t.Helper()
    repo := mcpRepo.NewAPIKeyRepository(cont.DB())
    cfg := cont.Config().MCP.Auth.APIKey
    svc := mcpauth.NewAPIKeyService(repo, &mcpauth.APIKeyConfig{
        Enabled: cfg.Enabled, KeyLength: cfg.KeyLength, SecretLength: cfg.SecretLength,
        DefaultTTL: cfg.DefaultTTL, MaxTTL: cfg.MaxTTL, Header: cfg.Header, Format: cfg.Format,
    })
    ctx := context.Background()
    key, err := svc.CreateAPIKey(ctx, "test-user", []string{"mcp.base.read","mcp.base.write","mcp.table.read","mcp.table.write","mcp.field.read","mcp.field.write","mcp.record.read","mcp.record.write"}, "it", nil)
    if err != nil { t.Fatalf("create api key: %v", err) }
    return key.KeyID + ":" + key.Secret
}

func Test_MCP_HTTP_EndToEnd_WithRealDB(t *testing.T) {
    if os.Getenv("MCP_REALDB_TEST") != "1" {
        t.Skip("set MCP_REALDB_TEST=1 to run real DB integration test")
    }

    gin.SetMode(gin.ReleaseMode)
    cont := newTestContainer(t)
    apiKey := issueAPIKey(t, cont)

    r := gin.New()
    // 使用新的 MCP 处理器
    mcpHandler, err := NewMCPHandler(cont)
    if err != nil {
        t.Fatalf("create MCP handler: %v", err)
    }
    mcpHandler.SetupRoutes(r)

    // 1) GET /tools
    req := httptest.NewRequest("GET", "/api/mcp/v1/tools", nil)
    req.Header.Set("X-MCP-API-Key", apiKey)
    w := httptest.NewRecorder()
    r.ServeHTTP(w, req)
    if w.Code != http.StatusOK { t.Fatalf("tools status=%d body=%s", w.Code, w.Body.String()) }

    // 2) base.create
    bodyCreate := map[string]interface{}{
        "id": "req-1",
        "input": map[string]interface{}{"spaceId": "default", "name": "mcp_test_base"},
    }
    buf, _ := json.Marshal(bodyCreate)
    req = httptest.NewRequest("POST", "/api/mcp/v1/tools/base.create/invoke", bytes.NewReader(buf))
    req.Header.Set("X-MCP-API-Key", apiKey)
    req.Header.Set("Content-Type", "application/json")
    w = httptest.NewRecorder()
    r.ServeHTTP(w, req)
    if w.Code != http.StatusOK { t.Fatalf("base.create status=%d body=%s", w.Code, w.Body.String()) }

    var createResp struct{ Output map[string]interface{} `json:"output"` }
    _ = json.Unmarshal(w.Body.Bytes(), &createResp)
    baseID, _ := createResp.Output["id"].(string)
    if baseID == "" { t.Fatalf("missing base id in response: %s", w.Body.String()) }

    // 3) base.get
    bodyGet := map[string]interface{}{ "id": "req-2", "input": map[string]interface{}{"baseId": baseID} }
    buf, _ = json.Marshal(bodyGet)
    req = httptest.NewRequest("POST", "/api/mcp/v1/tools/base.get/invoke", bytes.NewReader(buf))
    req.Header.Set("X-MCP-API-Key", apiKey)
    req.Header.Set("Content-Type", "application/json")
    w = httptest.NewRecorder()
    r.ServeHTTP(w, req)
    if w.Code != http.StatusOK { t.Fatalf("base.get status=%d body=%s", w.Code, w.Body.String()) }

    // 4) base.delete（验证幂等键也可工作）
    bodyDel := map[string]interface{}{ "id": "req-3", "input": map[string]interface{}{"baseId": baseID} }
    buf, _ = json.Marshal(bodyDel)
    req = httptest.NewRequest("POST", "/api/mcp/v1/tools/base.delete/invoke", bytes.NewReader(buf))
    req.Header.Set("X-MCP-API-Key", apiKey)
    req.Header.Set("X-Idempotency-Key", "test-idem-key-1")
    req.Header.Set("Content-Type", "application/json")
    w = httptest.NewRecorder()
    r.ServeHTTP(w, req)
    if w.Code != http.StatusOK { t.Fatalf("base.delete status=%d body=%s", w.Code, w.Body.String()) }

    // 再次请求触发幂等缓存
    w = httptest.NewRecorder()
    r.ServeHTTP(w, req)
    if w.Code != http.StatusOK { t.Fatalf("base.delete idem-2 status=%d body=%s", w.Code, w.Body.String()) }
}


