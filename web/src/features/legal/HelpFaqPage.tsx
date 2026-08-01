import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { FAQ_SECTIONS, type FaqSection } from "@mytask/constants";
import { Card, PageHeader } from "@/components/ui/Card";

function FaqAccordion({ section }: { section: FaqSection }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Card className="flex flex-col gap-0 p-0 overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--mt-text)]">
          {section.title}
        </h2>
      </div>
      {section.items.map((item) => {
        const open = openId === item.q;
        return (
          <div key={item.q} className="border-b border-border last:border-0 px-4">
            <button
              type="button"
              className="mt-focus flex w-full items-center justify-between gap-3 py-3 text-left"
              onClick={() => setOpenId(open ? null : item.q)}
              aria-expanded={open}
            >
              <span className="text-sm font-medium text-[var(--mt-text)]">
                {item.q}
              </span>
              <ChevronDown
                size={16}
                className={clsx(
                  "shrink-0 text-muted transition",
                  open && "rotate-180",
                )}
              />
            </button>
            {open ? (
              <p className="pb-3 text-sm leading-relaxed text-muted">{item.a}</p>
            ) : null}
          </div>
        );
      })}
    </Card>
  );
}

export function HelpFaqContent() {
  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title="Help & FAQ"
        description="Account, organisations, plans & billing, timesheets, payroll, and notifications."
      />
      {FAQ_SECTIONS.map((section) => (
        <FaqAccordion key={section.title} section={section} />
      ))}
    </div>
  );
}

export function HelpFaqPage() {
  return <HelpFaqContent />;
}
