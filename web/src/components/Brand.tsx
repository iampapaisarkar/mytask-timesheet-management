import { clsx } from "clsx";

export function BrandLogo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <div className={clsx("flex items-center gap-2.5", className)}>
      <img
        src="/logo.png"
        alt="myTask"
        className={clsx("h-9 w-9 rounded-xl object-cover shadow-sm", markClassName)}
      />
      <span className="text-lg font-bold tracking-tight text-[var(--mt-text)]">
        myTask
      </span>
    </div>
  );
}
