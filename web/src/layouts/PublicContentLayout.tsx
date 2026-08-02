import { Link, Outlet } from "react-router-dom";
import { ROUTES } from "@mytask/constants";
import { ThemeToggle } from "@/components/ThemeToggle";

/** Wide public layout for Help / Terms / Privacy (auth + logged-out). */
export function PublicContentLayout() {
  return (
    <div className="min-h-screen overflow-x-clip bg-page">
      <header className="sticky top-0 z-30 border-b border-border bg-[var(--mt-surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
            <nav className="flex items-center gap-1 text-xs font-medium text-muted sm:gap-3">
              <Link
                to={ROUTES.howItWorks}
                className="inline-flex min-h-10 items-center rounded-lg px-2 hover:text-primary"
              >
                How it works
              </Link>
              <Link
                to={ROUTES.help}
                className="inline-flex min-h-10 items-center rounded-lg px-2 hover:text-primary"
              >
                Help
              </Link>
              <Link
                to={ROUTES.terms}
                className="inline-flex min-h-10 items-center rounded-lg px-2 hover:text-primary"
              >
                Terms
              </Link>
              <Link
                to={ROUTES.privacy}
                className="inline-flex min-h-10 items-center rounded-lg px-2 hover:text-primary"
              >
                Privacy
              </Link>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
