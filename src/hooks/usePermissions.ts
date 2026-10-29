import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getPermissionState, type PermissionState } from '../services/permissions';

/** Re-reads permissions whenever the app returns from Settings. */
export function usePermissions() {
  const [state, setState] = useState<PermissionState | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await getPermissionState());
    } catch (err) {
      console.warn('[usePermissions]', err);
    }
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  return { permissions: state, refreshPermissions: refresh };
}
