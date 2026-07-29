import { Link, Outlet, useNavigate } from "react-router-dom";
import { ROUTES } from "@mytask/constants";
import { authApi } from "@mytask/api";
import { displayName } from "@mytask/utils";
import { LogOut, User } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useOrganisationStore } from "@/store/organisationStore";
import { firebaseLogout } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { OrganisationSwitcher } from "@/components/OrganisationSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToastStore } from "@/store/toastStore";

export function MainLayout() {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearOrg = useOrganisationStore((s) => s.clear);
  const toast = useToastStore();
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
    toast.info("Signed out", "See you next time");
    navigate(ROUTES.login);
  }

  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-40 border-b border-border bg-[var(--mt-surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to={ROUTES.home} className="mt-focus inline-flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="myTask"
              className="h-9 w-9 rounded-xl object-cover shadow-sm"
            />
            <span className="text-lg font-bold tracking-tight text-[var(--mt-text)]">
              myTask
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <OrganisationSwitcher />
            <ThemeToggle />
            <Link
              to={ROUTES.profile}
              className="mt-focus hidden items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-[var(--mt-text)] hover:bg-primary-muted sm:inline-flex"
            >
              <User size={16} className="text-primary" />
              {user ? displayName(user) : "Profile"}
            </Link>
            <Button variant="ghost" onClick={handleLogout} aria-label="Logout">
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
