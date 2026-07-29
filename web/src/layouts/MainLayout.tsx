import { Link, Outlet, useNavigate } from "react-router-dom";
import { APP_NAME, ROUTES } from "@mysheet/constants";
import { authApi } from "@mysheet/api";
import { displayName } from "@mysheet/utils";
import { useAuthStore } from "@/store/authStore";
import { useOrganisationStore } from "@/store/organisationStore";
import { firebaseLogout } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { OrganisationSwitcher } from "@/components/OrganisationSwitcher";

export function MainLayout() {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearOrg = useOrganisationStore((s) => s.clear);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // still clear local session
    }
    try {
      await firebaseLogout();
    } catch {
      // ignore
    }
    clearSession();
    clearOrg();
    navigate(ROUTES.login);
  }

  return (
    <div className="min-h-screen bg-page">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-white px-6 py-3">
        <Link to={ROUTES.home} className="shrink-0 text-xl font-bold text-primary">
          {APP_NAME}
        </Link>
        <div className="flex items-center gap-3">
          <OrganisationSwitcher />
          <Link
            to={ROUTES.profile}
            className="hidden text-sm text-dark hover:text-primary sm:inline"
          >
            {user ? displayName(user) : "Profile"}
          </Link>
          <Button variant="ghost" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
