export type ProviderId = 'builtin' | 'ollama' | 'siliconflow';

export type ProviderField = {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'password';
  required?: boolean;
};

export type ProviderSpec = {
  id: ProviderId;
  name: string;
  fields: ProviderField[]; // configuration fields stored in settings.params
  // Optional tester to validate connection
  test?: (params: Record<string, string>) => Promise<void>;
  // Optional chat call; if absent, caller can fallback to local/mock
  chat?: (prompt: string, params: Record<string, string>) => Promise<string>;
};

const builtinProviders: ProviderSpec[] = [
  {
    id: 'builtin',
    name: '内置',
    fields: [
      { key: 'model', label: 'Model', placeholder: 'deepseek-v3.1:671b-cloud' },
    ],
    // built-in: no remote test/chat
  },
  {
    id: 'ollama',
    name: 'Ollama',
    fields: [
      { key: 'baseUrl', label: 'Base URL', placeholder: 'http://localhost:11434', required: true },
      { key: 'model', label: 'Model', placeholder: 'deepseek-v3.1:671b-cloud', required: true },
      { key: 'apiToken', label: 'Token（可选）', type: 'password' },
    ],
    test: async (params) => {
      const baseUrl = (params.baseUrl || '').replace(/\/$/, '');
      if (!baseUrl) throw new Error('缺少 Base URL');
      const res = await fetch(`${baseUrl}/api/tags`, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    chat: async (prompt, params) => {
      const baseUrl = (params.baseUrl || '').replace(/\/$/, '');
      const model = params.model || '';
      if (!baseUrl || !model) throw new Error('Ollama 配置不完整');
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a helpful writing assistant.' },
            { role: 'user', content: prompt }
          ],
          stream: false
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data?.message?.content || data?.response || '';
    },
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    fields: [
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://api.siliconflow.cn', required: true },
      { key: 'apiToken', label: 'API Key', type: 'password', required: true },
      { key: 'model', label: 'Model', placeholder: 'Qwen/Qwen3-8B', required: true },
    ],
    test: async (params) => {
      const baseUrl = (params.baseUrl || '').replace(/\/$/, '');
      const token = params.apiToken || '';
      if (!baseUrl || !token) throw new Error('请填写 Base URL 与 API Key');
      const r = await fetch(`${baseUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    },
    chat: async (prompt, params) => {
      const baseUrl = (params.baseUrl || '').replace(/\/$/, '');
      const token = params.apiToken || '';
      const model = params.model || '';
      if (!baseUrl || !token || !model) throw new Error('SiliconFlow 配置不完整');
      const r = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a helpful writing assistant.' },
            { role: 'user', content: prompt },
          ],
          stream: false,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      return data?.choices?.[0]?.message?.content || '';
    },
  },
];

// ----- Custom providers (OpenAI-compatible) -----
type CustomProviderStored = { id: string; name: string; baseUrlPlaceholder?: string };
const CUSTOM_KEY = 'custom-providers:v1';

function loadCustomStored(): CustomProviderStored[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomStored(list: CustomProviderStored[]) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  } catch {}
}

export function listCustomProviders(): ProviderSpec[] {
  const stored = loadCustomStored();
  return stored.map((c) => ({
    id: c.id as ProviderId,
    name: c.name,
    fields: [
      { key: 'baseUrl', label: 'Base URL', placeholder: c.baseUrlPlaceholder || 'https://api.openai.com/v1', required: true },
      { key: 'apiToken', label: 'API Key', type: 'password', required: true },
      { key: 'model', label: 'Model', placeholder: 'deepseek-v3.1:671b-cloud', required: true },
    ],
    test: async (params) => {
      const baseUrl = (params.baseUrl || '').replace(/\/$/, '');
      const token = params.apiToken || '';
      if (!baseUrl || !token) throw new Error('请填写 Base URL 与 API Key');
      const r = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    },
    chat: async (prompt, params) => {
      const baseUrl = (params.baseUrl || '').replace(/\/$/, '');
      const token = params.apiToken || '';
      const model = params.model || '';
      if (!baseUrl || !token || !model) throw new Error('自定义供应商配置不完整');
      const r = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      return data?.choices?.[0]?.message?.content || '';
    },
  }));
}

export function addCustomOpenAIProvider(name: string, id: string, baseUrlPlaceholder?: string) {
  const list = loadCustomStored();
  if (list.some(x => x.id === id)) return; // do not duplicate
  list.push({ id, name, baseUrlPlaceholder });
  saveCustomStored(list);
}

export function removeCustomProvider(id: string) {
  const list = loadCustomStored().filter(x => x.id !== id);
  saveCustomStored(list);
}

export function getAllProviders(): ProviderSpec[] {
  return [...builtinProviders, ...listCustomProviders()];
}

export function getProviderSpec(id: ProviderId): ProviderSpec | undefined {
  return getAllProviders().find(p => p.id === id);
}

// -------- Profiles (configured connections) --------
export type ProviderProfile = {
  id: string; // uuid or timestamp id
  name: string; // display name
  provider: ProviderId | string; // allow custom ids
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  isDefault?: boolean;
};

const PROFILE_KEY = 'model-profiles:v1';

export function listProfiles(): ProviderProfile[] {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveProfiles(profiles: ProviderProfile[]) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
  } catch {}
}

export function upsertProfile(profile: ProviderProfile) {
  const list = listProfiles();
  const idx = list.findIndex(p => p.id === profile.id);
  // ensure only one default
  if (profile.isDefault) {
    for (const p of list) p.isDefault = false;
  }
  if (idx >= 0) list[idx] = profile; else list.unshift(profile);
  saveProfiles(list);
}

export function removeProfile(id: string) {
  const list = listProfiles().filter(p => p.id !== id);
  saveProfiles(list);
}

export function getDefaultProfile(): ProviderProfile | undefined {
  return listProfiles().find(p => p.isDefault);
}


