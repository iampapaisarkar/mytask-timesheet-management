import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@mytask/api";
import { ROUTES } from "@mytask/constants";
import { firebaseLogout } from "@/lib/firebase";
import { unregisterWebPush } from "@/lib/webPush";
import { useToastStore } from "@/store/toastStore";
import { resetAllStores } from "@/store/resetAllStores";

/**
 * Single logout action used by MainLayout and OrgLayout.
 * Clears auth, org, query cache, sockets, FCM, and storage.
 */
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToastStore();

  return useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // still clear local session
    }
    try {
      await unregisterWebPush();
    } catch {
      // ignore
    }
    try {
      await firebaseLogout();
    } catch {
      // ignore
    }
    await resetAllStores(queryClient);
    toast.info("Signed out", "See you next time");
    navigate(ROUTES.login, { replace: true });
  }, [navigate, queryClient, toast]);
}
