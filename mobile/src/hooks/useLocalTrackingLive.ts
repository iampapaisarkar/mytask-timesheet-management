import { useCallback, useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  getTrackingOrganisationCode,
  isTracking,
} from "../services/trackingSession";
import { useOrganisationStore } from "../store/organisationStore";

/**
 * Local device signal: true when this phone has an open tracking session
 * for the current organisation (start without stop).
 */
export function useLocalTrackingLive(pollMs = 4000): boolean {
  const orgCode = useOrganisationStore((s) => s.organisation?.code);
  const [active, setActive] = useState(false);

  const refresh = useCallback(async () => {
    if (!orgCode) {
      setActive(false);
      return;
    }
    const [tracking, trackingOrg] = await Promise.all([
      isTracking(),
      getTrackingOrganisationCode(),
    ]);
    setActive(Boolean(tracking && trackingOrg === orgCode));
  }, [orgCode]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      const id = setInterval(() => void refresh(), pollMs);
      return () => clearInterval(id);
    }, [refresh, pollMs]),
  );

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === "active") void refresh();
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [refresh]);

  return active;
}
