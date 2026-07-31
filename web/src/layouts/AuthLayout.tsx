import { Outlet, Link } from "react-router-dom";
import { ROUTES } from "@mytask/constants";
import { BrandLogo } from "@/components/Brand";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";

export function AuthLayout() {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[radial-gradient(circle_at_top_left,#04B6B1_0%,transparent_35%),radial-gradient(circle_at_bottom_right,#0F766E_0%,transparent_40%),linear-gradient(160deg,#071316,#0B1F24_45%,#104045)]">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
        <Link to={ROUTES.login} className="inline-flex items-center gap-2.5">
          <img src="/logo.png" alt="myTask" className="h-10 w-10 rounded-xl" />
          <span className="text-xl font-bold text-white">myTask</span>
        </Link>
        <button
          type="button"
          onClick={toggle}
          className="mt-focus inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur"
          aria-label="Toggle theme"
        >
          {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-2">
        <div className="mt-fade-in w-full max-w-md rounded-3xl border border-white/10 bg-[var(--mt-surface)]/95 p-5 shadow-2xl backdrop-blur sm:p-8">
          <div className="mb-6 flex justify-center sm:hidden">
            <BrandLogo />
          </div>
          <Outlet />
        </div>
        <nav className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-white/75">
          <Link to={ROUTES.help} className="inline-flex min-h-10 items-center hover:text-white">
            Help & FAQ
          </Link>
          <Link to={ROUTES.terms} className="inline-flex min-h-10 items-center hover:text-white">
            Terms & Conditions
          </Link>
          <Link to={ROUTES.privacy} className="inline-flex min-h-10 items-center hover:text-white">
            Privacy Policy
          </Link>
        </nav>
      </main>
    </div>
  );
}
