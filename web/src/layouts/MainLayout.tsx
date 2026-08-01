import { Link, Outlet } from "react-router-dom";
import { ROUTES } from "@mytask/constants";
import { displayName } from "@mytask/utils";
import { LogOut, User } from "lucide-react";
import { HomePage, ProfilePage } from "@/app/routeModules";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { OrganisationSwitcher } from "@/components/OrganisationSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLogout } from "@/hooks/useLogout";

export function MainLayout() {
  const user = useAuthStore((s) => s.user);
  const handleLogout = useLogout();

  return (
    <div className="min-h-screen overflow-x-clip bg-page">
      <header className="sticky top-0 z-40 border-b border-border bg-[var(--mt-surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
          <Link
            to={ROUTES.home}
            className="mt-focus inline-flex min-w-0 items-center gap-2.5"
            onMouseEnter={() => void HomePage.preload()}
            onFocus={() => void HomePage.preload()}
          >
            <img
              src="/logo.png"
              alt="myTask"
              className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm"
            />
            <span className="truncate text-lg font-bold tracking-tight text-[var(--mt-text)]">
              myTask
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <OrganisationSwitcher />
            <ThemeToggle />
            <Link
              to={ROUTES.profile}
              onMouseEnter={() => void ProfilePage.preload()}
              onFocus={() => void ProfilePage.preload()}
              className="mt-focus hidden items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-[var(--mt-text)] hover:bg-primary-muted sm:inline-flex"
            >
              <User size={16} className="text-primary" />
              {user ? displayName(user) : "Profile"}
            </Link>
            <Link
              to={ROUTES.profile}
              onMouseEnter={() => void ProfilePage.preload()}
              onFocus={() => void ProfilePage.preload()}
              className="mt-focus inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-[var(--mt-surface)] text-[var(--mt-text)] hover:border-primary sm:hidden"
              aria-label="Profile"
            >
              <User size={16} className="text-primary" />
            </Link>
            <Button
              variant="ghost"
              onClick={() => void handleLogout()}
              aria-label="Logout"
              className="min-h-11 px-2.5 sm:px-4"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-[var(--mt-surface)]/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-3 py-4 text-xs text-muted sm:px-6">
          <Link to={ROUTES.help} className="hover:text-primary">
            Help & FAQ
          </Link>
          <Link to={ROUTES.terms} className="hover:text-primary">
            Terms & Conditions
          </Link>
          <Link to={ROUTES.privacy} className="hover:text-primary">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}
