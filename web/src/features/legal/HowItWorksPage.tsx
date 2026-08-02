import { Link } from "react-router-dom";
import {
  HOW_IT_WORKS_INTRO,
  HOW_IT_WORKS_PHASES,
  ROUTES,
  howItWorksPlatformLabel,
  type HowItWorksPhase,
  type HowItWorksStep,
} from "@mytask/constants";
import { Button } from "@/components/ui/Button";

function PlatformBadge({ platform }: { platform: HowItWorksStep["platform"] }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
      {howItWorksPlatformLabel(platform)}
    </span>
  );
}

function StepCard({
  step,
  index,
  isLast,
}: {
  step: HowItWorksStep;
  index: number;
  isLast: boolean;
}) {
  return (
    <li className="relative flex gap-4 pb-8 last:pb-0 sm:gap-5">
      {!isLast ? (
        <span
          className="absolute top-10 bottom-0 left-[15px] w-px bg-border sm:left-[17px]"
          aria-hidden
        />
      ) : null}
      <div className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-sm shadow-primary/30 sm:h-9 sm:w-9 sm:text-sm">
        {index}
      </div>
      <div className="min-w-0 flex-1 rounded-2xl border border-border bg-[var(--mt-surface)] p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-[var(--mt-text)]">
            {step.title}
          </h3>
          <PlatformBadge platform={step.platform} />
        </div>
        <p className="text-sm leading-relaxed text-muted">{step.summary}</p>
        <ul className="mt-3 space-y-2">
          {step.details.map((line) => (
            <li
              key={line}
              className="flex gap-2 text-sm leading-relaxed text-[var(--mt-text)]/90"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

function PhaseBlock({
  phase,
  stepOffset,
}: {
  phase: HowItWorksPhase;
  stepOffset: number;
}) {
  return (
    <section className="mt-fade-in">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Setup phase
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--mt-text)] sm:text-2xl">
          {phase.title}
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
          {phase.subtitle}
        </p>
      </div>
      <ol className="list-none">
        {phase.steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            index={stepOffset + i + 1}
            isLast={i === phase.steps.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}

export function HowItWorksContent() {
  const phasesWithOffset = HOW_IT_WORKS_PHASES.reduce<
    Array<{ phase: HowItWorksPhase; stepOffset: number }>
  >((acc, phase) => {
    const stepOffset = acc.reduce(
      (sum, row) => sum + row.phase.steps.length,
      0,
    );
    acc.push({ phase, stepOffset });
    return acc;
  }, []);

  return (
    <div className="flex flex-col gap-10">
      <header className="relative overflow-hidden rounded-3xl border border-primary/20 bg-[linear-gradient(145deg,rgba(4,182,177,0.14)_0%,transparent_45%),linear-gradient(160deg,var(--mt-surface),var(--mt-bg))] px-5 py-8 sm:px-8 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Product guide
        </p>
        <h1 className="mt-2 max-w-xl text-3xl font-bold tracking-tight text-[var(--mt-text)] sm:text-4xl">
          {HOW_IT_WORKS_INTRO.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          {HOW_IT_WORKS_INTRO.subtitle}
        </p>
        <p className="mt-4 max-w-2xl rounded-2xl border border-border/80 bg-[var(--mt-surface)]/70 px-4 py-3 text-sm text-[var(--mt-text)]">
          {HOW_IT_WORKS_INTRO.tip}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={ROUTES.login}>
            <Button type="button">Back to login</Button>
          </Link>
          <Link to={ROUTES.signup}>
            <Button type="button" variant="secondary">
              Create account
            </Button>
          </Link>
          <Link to={ROUTES.help}>
            <Button type="button" variant="ghost">
              Help & FAQ
            </Button>
          </Link>
        </div>
      </header>

      {phasesWithOffset.map(({ phase, stepOffset }) => (
        <PhaseBlock key={phase.id} phase={phase} stepOffset={stepOffset} />
      ))}

      <footer className="rounded-2xl border border-border bg-[var(--mt-surface)] px-5 py-6 text-center sm:px-8">
        <p className="text-sm font-medium text-[var(--mt-text)]">
          Ready to try it?
        </p>
        <p className="mt-1 text-sm text-muted">
          Log in to create an organisation, or read Help if you are stuck on a
          step.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link to={ROUTES.login}>
            <Button type="button">Log in</Button>
          </Link>
          <Link to={ROUTES.pricing}>
            <Button type="button" variant="soft">
              See pricing
            </Button>
          </Link>
        </div>
      </footer>
    </div>
  );
}

export function HowItWorksPage() {
  return <HowItWorksContent />;
}
