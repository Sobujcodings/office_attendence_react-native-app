import { useCallback, useEffect, useState } from 'react';
import { subscribe } from '../services/bus';
import { DEFAULT_SETTINGS, getSettings, updateSettings } from '../services/store';
import type { AppSettings } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const load = () => getSettings().then(setSettings).catch((err) => console.warn('[useSettings]', err));
    load();
    return subscribe(load);
  }, []);

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    await updateSettings(patch);
  }, []);

  return { settings, updateSettings: update };
}
