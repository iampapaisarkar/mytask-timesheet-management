import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";
import { clsx } from "clsx";

export function ThemeToggle({
  className,
  lightOnDark,
}: {
  className?: string;
  lightOnDark?: boolean;
}) {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={toggle}
      className={clsx(
        "mt-focus inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
        lightOnDark
          ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
          : "border-border bg-[var(--mt-surface)] text-[var(--mt-text)] hover:border-primary",
        className,
      )}
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
