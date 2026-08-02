import { useEffect, useState } from "react";
import { formatNowHhMm } from "@mytask/utils";

/**
 * Ticking local `HH:mm` clock while `enabled`. Used so open work/travel/break
 * rows advance without waiting for a GPS location change.
 */
export function useLiveClock(enabled: boolean, intervalMs = 1000): string {
  const [now, setNow] = useState(() => formatNowHhMm());

  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(formatNowHhMm());
    tick();
    const id = globalThis.setInterval(tick, intervalMs);
    return () => globalThis.clearInterval(id);
  }, [enabled, intervalMs]);

  return now;
}
