import { useEffect, useState, useSyncExternalStore } from 'react';
import { pvpApi } from '../network/pvpApi';
import { PvpController } from './pvpController';
export function usePvp() {
  const [controller] = useState(() => {
    let storage: Storage | null = null;
    try {
      storage = window.sessionStorage;
    } catch {
      /* Play remains possible in memory. */
    }
    return new PvpController(pvpApi, storage);
  });
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useEffect(() => {
    controller.start();
    return controller.stop;
  }, [controller]);
  return { controller, state };
}
