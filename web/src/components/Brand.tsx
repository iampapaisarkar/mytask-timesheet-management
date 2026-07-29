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

export function ShowcaseNotice({ className }: { className?: string }) {
  return (
    <p
      className={clsx(
        "mx-auto mt-6 max-w-md text-center text-[11px] leading-relaxed text-white/70",
        className,
      )}
    >
      <strong className="font-semibold text-white/85">
        Project is for showcasing purposes only.
      </strong>{" "}
      This is a real project concept. All original concept ownership and
      authorization belong to Joel Couchman. This version has been rebuilt solely
      for demonstration purposes.
    </p>
  );
}
