import { Outlet, Link } from "react-router-dom";
import { ROUTES } from "@mytask/constants";
import { BrandLogo, ShowcaseNotice } from "@/components/Brand";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";

export function AuthLayout() {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,#04B6B1_0%,transparent_35%),radial-gradient(circle_at_bottom_right,#0F766E_0%,transparent_40%),linear-gradient(160deg,#071316,#0B1F24_45%,#104045)]">
      <header className="flex items-center justify-between px-6 py-5">
        <Link to={ROUTES.login} className="inline-flex items-center gap-2.5">
          <img src="/logo.png" alt="myTask" className="h-10 w-10 rounded-xl" />
          <span className="text-xl font-bold text-white">myTask</span>
        </Link>
        <button
          type="button"
          onClick={toggle}
          className="mt-focus rounded-xl border border-white/15 bg-white/10 p-2 text-white backdrop-blur"
          aria-label="Toggle theme"
        >
          {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-10">
        <div className="mt-fade-in w-full max-w-md rounded-3xl border border-white/10 bg-[var(--mt-surface)]/95 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 flex justify-center sm:hidden">
            <BrandLogo />
          </div>
          <Outlet />
        </div>
        <ShowcaseNotice />
      </main>
    </div>
  );
}
