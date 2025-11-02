import { useEffect, useMemo, useState } from 'react';
import type { ProviderId } from '@/lib/providers';

export interface ModelSettings {
  provider: ProviderId;
  // generic key-value params to support multiple providers
  baseUrl?: string;
  apiToken?: string;
  model?: string;
}

const STORAGE_KEY = 'model-settings:v1';

export function useModelSettings() {
  const [settings, setSettings] = useState<ModelSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { provider: 'builtin', model: 'deepseek-v3.1:671b-cloud' };
    } catch {
      return { provider: 'builtin', model: 'deepseek-v3.1:671b-cloud' };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const update = (patch: Partial<ModelSettings>) => setSettings(prev => ({ ...prev, ...patch }));

  const isOllamaReady = useMemo(() => {
    return settings.provider === 'ollama' && !!settings.baseUrl && !!settings.model;
  }, [settings]);

  return { settings, setSettings, update, isOllamaReady };
}


