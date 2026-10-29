import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { reconcile } from '../services/attendance';

/** While the app is alive, check attendance the moment WiFi connects or drops. */
export function useWifiWatcher() {
  useEffect(() => {
    let lastKey: string | null = null;
    return NetInfo.addEventListener((state) => {
      const d = state.type === NetInfoStateType.wifi ? state.details : null;
      const key = `${state.type}|${state.isConnected}|${d?.ssid ?? ''}|${d?.ipAddress ?? ''}`;
      const first = lastKey === null;
      if (key === lastKey) return;
      lastKey = key;
      // The first callback is the current state, which boot already checked.
      if (!first) reconcile().catch((err) => console.warn('[wifi watcher]', err));
    });
  }, []);
}
