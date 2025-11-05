package auth

import (
    "context"
    "testing"
    "time"
)

// fakeRepo 实现 APIKeyRepository 以便单元测试
type fakeRepo struct {
    byID    map[string]*APIKey
    byKeyID map[string]*APIKey
}

func (f *fakeRepo) Create(ctx context.Context, apiKey *APIKey) error { f.byID[apiKey.ID] = apiKey; f.byKeyID[apiKey.KeyID] = apiKey; return nil }
func (f *fakeRepo) GetByID(ctx context.Context, id string) (*APIKey, error) { return f.byID[id], nil }
func (f *fakeRepo) GetByKeyID(ctx context.Context, keyID string) (*APIKey, error) { return f.byKeyID[keyID], nil }
func (f *fakeRepo) Update(ctx context.Context, apiKey *APIKey) error { f.byID[apiKey.ID] = apiKey; f.byKeyID[apiKey.KeyID] = apiKey; return nil }
func (f *fakeRepo) Delete(ctx context.Context, id string) error { delete(f.byID, id); return nil }
func (f *fakeRepo) ListByUserID(ctx context.Context, userID string) ([]*APIKey, error) { return nil, nil }
func (f *fakeRepo) ListActive(ctx context.Context) ([]*APIKey, error) { return nil, nil }

func TestAPIKeyService_Validate_Success(t *testing.T) {
    repo := &fakeRepo{byID: make(map[string]*APIKey), byKeyID: make(map[string]*APIKey)}
    cfg := &APIKeyConfig{KeyLength: 8, SecretLength: 8, DefaultTTL: time.Hour, MaxTTL: 24 * time.Hour, Header: "X-MCP-API-Key", Format: "key_id:key_secret"}
    svc := NewAPIKeyService(repo, cfg)

    ttl := time.Hour
    key, err := svc.CreateAPIKey(context.Background(), "u1", []string{"mcp.base.read"}, "test", &ttl)
    if err != nil { t.Fatalf("create key: %v", err) }

    // 明文格式 key_id:key_secret
    combined := key.KeyID + ":" + key.Secret
    got, err := svc.ValidateAPIKey(context.Background(), combined)
    if err != nil { t.Fatalf("validate: %v", err) }
    if got.ID != key.ID || got.UserID != "u1" { t.Fatalf("unexpected key: %+v", got) }
}

func TestAPIKeyService_Validate_Expired(t *testing.T) {
    repo := &fakeRepo{byID: make(map[string]*APIKey), byKeyID: make(map[string]*APIKey)}
    cfg := &APIKeyConfig{KeyLength: 8, SecretLength: 8, DefaultTTL: time.Hour, MaxTTL: 24 * time.Hour, Header: "X-MCP-API-Key", Format: "key_id:key_secret"}
    svc := NewAPIKeyService(repo, cfg)

    // 人工构造过期 key
    exp := time.Now().Add(-time.Hour)
    key := &APIKey{ID: "ak_test", KeyID: "kid", Secret: "sec", UserID: "u", Scopes: []string{"mcp.base.read"}, ExpiresAt: &exp, CreatedAt: time.Now(), UpdatedAt: time.Now(), IsActive: true}
    _ = repo.Create(context.Background(), key)

    if _, err := svc.ValidateAPIKey(context.Background(), "kid:sec"); err == nil {
        t.Fatalf("expected expired error, got nil")
    }
}


