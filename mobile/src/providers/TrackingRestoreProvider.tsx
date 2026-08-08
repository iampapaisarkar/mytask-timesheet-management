import { useEffect, useRef, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { restoreNativeTrackingIfNeeded } from '../services/restoreTracking';

/**
 * Re-arms Transistorsoft after cold start / AppState active when a local
 * tracking session still exists (e.g. iOS force-quit killed native GPS).
 */
export function TrackingRestoreProvider({ children }: { children: ReactNode }) {
  const userId = useAuthStore((s) => s.user?.id);
  const inFlight = useRef(false);

  useEffect(() => {
    if (userId == null) return;

    const run = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        await restoreNativeTrackingIfNeeded();
      } finally {
        inFlight.current = false;
      }
    };

    void run();

    const onChange = (state: AppStateStatus) => {
      if (state === 'active') void run();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [userId]);

  return <>{children}</>;
}
