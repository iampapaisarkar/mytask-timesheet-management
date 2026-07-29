import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { ROUTES } from "@mytask/constants";

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const location = useLocation();

  if (!hydrated) {
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>;
  }

  if (!token) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  if (!hydrated) {
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>;
  }

  if (token) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return <Outlet />;
}
