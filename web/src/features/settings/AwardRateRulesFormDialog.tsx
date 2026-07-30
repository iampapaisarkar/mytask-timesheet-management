import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { TextInput } from "@/components/ui/TextInput";
import { LoadingState } from "@/components/ui/States";
import { useToastStore } from "@/store/toastStore";
import {
  useAwardRateRuleLookups,
  useCreateAwardRate,
  useUpdateAwardRate,
  type AwardRuleComparator,
  type AwardRuleDay,
  type AwardRuleField,
  type EarningRateOption,
  type RoundingInterval,
} from "./settingsHooks";

const selectClass =
  "mt-focus w-full rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-2.5 text-sm outline-none focus:border-primary";

type IfCondition = {
  key: string;
  field: AwardRuleField | null;
  comparison: AwardRuleComparator | null;
  value: string;
  from: string;
  to: string;
  then: { rate: EarningRateOption | null };
};

type RuleBlock = {
  key: string;
  id?: number;
  days: AwardRuleDay[];
  if: IfCondition[];
  expanded: boolean;
};

type AwardRateRow = {
  id?: number | string;
  name?: string;
  settings?: {
    rounding_interval?: RoundingInterval | null;
    rounding_up_by?: number | string | null;
    rounding_down_by?: number | string | null;
  } | null;
  rules?: Array<{
    id?: number;
    days?: AwardRuleDay[];
    if?: Array<{
      field?: AwardRuleField | null;
      comparison?: AwardRuleComparator | null;
      value?: string | null;
      from?: string | null;
      to?: string | null;
      then?: { rate?: EarningRateOption | null };
    }>;
  }>;
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyIf(): IfCondition {
  return {
    key: uid("if"),
    field: null,
    comparison: null,
    value: "",
    from: "",
    to: "",
    then: { rate: null },
  };
}

function defaultRuleBlocks(days: AwardRuleDay[]): RuleBlock[] {
  const lockedDefaults = days.filter((d) => d.show_default && d.locked);
  const unlockedDefaults = days.filter((d) => d.show_default && !d.locked);
  const blocks: RuleBlock[] = [];
  for (const day of lockedDefaults) {
    blocks.push({
      key: uid("rule"),
      days: [day],
      if: [emptyIf()],
      expanded: true,
    });
  }
  if (unlockedDefaults.length) {
    blocks.push({
      key: uid("rule"),
      days: unlockedDefaults,
      if: [emptyIf()],
      expanded: true,
    });
  }
  if (!blocks.length && days[0]) {
    blocks.push({
      key: uid("rule"),
      days: [days[0]],
      if: [emptyIf()],
      expanded: true,
    });
  }
  return blocks;
}

function splitRounding(total: number) {
  const down = Math.floor(total / 2);
  const up = total - down;
  return { up, down };
}

function findRate(
  rates: EarningRateOption[],
  rate: EarningRateOption | null | undefined,
) {
  if (!rate?.id) return null;
  return rates.find((r) => Number(r.id) === Number(rate.id)) || rate;
}

export function AwardRateRulesFormDialog({
  open,
  onClose,
  awardRate,
}: {
  open: boolean;
  onClose: () => void;
  awardRate?: AwardRateRow | null;
}) {
  const toast = useToastStore();
  const isEdit = awardRate?.id != null;
  const lookups = useAwardRateRuleLookups(open);
  const createMutation = useCreateAwardRate();
  const updateMutation = useUpdateAwardRate();

  const [name, setName] = useState("");
  const [roundingInterval, setRoundingInterval] =
    useState<RoundingInterval | null>(null);
  const [roundingUp, setRoundingUp] = useState("");
  const [roundingDown, setRoundingDown] = useState("");
  const [earningRates, setEarningRates] = useState<EarningRateOption[]>([]);
  const [rules, setRules] = useState<RuleBlock[]>([]);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!open) {
      setSeeded(false);
      return;
    }
    if (lookups.isLoading || seeded) return;

    const rates = (lookups.earningRates || []).map((r) => ({ ...r }));
    setEarningRates(rates);

    if (isEdit && awardRate) {
      setName(String(awardRate.name || ""));
      const interval = awardRate.settings?.rounding_interval || null;
      setRoundingInterval(interval);
      setRoundingUp(
        awardRate.settings?.rounding_up_by != null
          ? String(awardRate.settings.rounding_up_by)
          : "",
      );
      setRoundingDown(
        awardRate.settings?.rounding_down_by != null
          ? String(awardRate.settings.rounding_down_by)
          : "",
      );
      setRules(
        (awardRate.rules || []).map((rule) => ({
          key: uid("rule"),
          id: rule.id,
          days: Array.isArray(rule.days) ? rule.days : [],
          expanded: true,
          if: (rule.if || []).map((row) => ({
            key: uid("if"),
            field: row.field || null,
            comparison: row.comparison || null,
            value: row.value != null ? String(row.value) : "",
            from: row.from != null ? String(row.from) : "",
            to: row.to != null ? String(row.to) : "",
            then: {
              rate: findRate(rates, row.then?.rate || null),
            },
          })),
        })),
      );
    } else {
      setName("");
      setRoundingInterval(null);
      setRoundingUp("");
      setRoundingDown("");
      setRules(defaultRuleBlocks(lookups.days));
    }
    setSeeded(true);
  }, [
    open,
    seeded,
    isEdit,
    awardRate,
    lookups.isLoading,
    lookups.days,
    lookups.earningRates,
  ]);

  const usedDayIds = useMemo(() => {
    const ids = new Set<number>();
    for (const rule of rules) {
      for (const day of rule.days) ids.add(Number(day.id));
    }
    return ids;
  }, [rules]);

  const unusedDays = lookups.days.filter((d) => !usedDayIds.has(Number(d.id)));

  function onIntervalChange(id: string) {
    const next =
      lookups.roundingIntervals.find((r) => String(r.id) === id) || null;
    setRoundingInterval(next);
    const total = Number(next?.value) || 0;
    if (!total) {
      setRoundingUp("");
      setRoundingDown("");
      return;
    }
    const { up, down } = splitRounding(total);
    setRoundingUp(String(up));
    setRoundingDown(String(down));
  }

  function onRoundingUpChange(value: string) {
    const total = Number(roundingInterval?.value) || 0;
    if (!total) {
      setRoundingUp(value);
      return;
    }
    let up = Number(value);
    if (Number.isNaN(up)) up = 0;
    up = Math.max(0, Math.min(total, up));
    setRoundingUp(String(up));
    setRoundingDown(String(total - up));
  }

  function onRoundingDownChange(value: string) {
    const total = Number(roundingInterval?.value) || 0;
    if (!total) {
      setRoundingDown(value);
      return;
    }
    let down = Number(value);
    if (Number.isNaN(down)) down = 0;
    down = Math.max(0, Math.min(total, down));
    setRoundingDown(String(down));
    setRoundingUp(String(total - down));
  }

  function addEarningRate() {
    setEarningRates((prev) => [
      ...prev,
      { id: -Math.floor(Math.random() * 1_000_000_000), name: "", rate: "" },
    ]);
  }

  function updateEarningRate(
    id: number,
    patch: Partial<EarningRateOption>,
  ) {
    setEarningRates((prev) =>
      prev.map((r) => (Number(r.id) === Number(id) ? { ...r, ...patch } : r)),
    );
    if (patch.name != null || patch.rate != null) {
      setRules((prev) =>
        prev.map((rule) => ({
          ...rule,
          if: rule.if.map((row) =>
            Number(row.then.rate?.id) === Number(id)
              ? {
                  ...row,
                  then: {
                    rate: {
                      ...(row.then.rate as EarningRateOption),
                      ...patch,
                      id,
                    },
                  },
                }
              : row,
          ),
        })),
      );
    }
  }

  function removeEarningRate(id: number) {
    if (id >= 0) {
      toast.warning("Existing rates can only be cleared from THEN selections");
      return;
    }
    setEarningRates((prev) => prev.filter((r) => Number(r.id) !== Number(id)));
    setRules((prev) =>
      prev.map((rule) => ({
        ...rule,
        if: rule.if.map((row) =>
          Number(row.then.rate?.id) === Number(id)
            ? { ...row, then: { rate: null } }
            : row,
        ),
      })),
    );
  }

  function addRuleBlock() {
    if (!unusedDays.length) return;
    setRules((prev) => [
      ...prev,
      {
        key: uid("rule"),
        days: [unusedDays[0]],
        if: [emptyIf()],
        expanded: true,
      },
    ]);
  }

  function removeRuleBlock(key: string) {
    setRules((prev) => {
      if (prev.length <= 1) return prev;
      const target = prev.find((r) => r.key === key);
      if (target?.days.some((d) => d.locked)) return prev;
      return prev.filter((r) => r.key !== key);
    });
  }

  function toggleDay(ruleKey: string, day: AwardRuleDay) {
    setRules((prev) =>
      prev.map((rule) => {
        if (rule.key !== ruleKey) return rule;
        if (rule.days.some((d) => d.locked)) return rule;
        const has = rule.days.some((d) => Number(d.id) === Number(day.id));
        if (has) {
          if (rule.days.length <= 1) return rule;
          return {
            ...rule,
            days: rule.days.filter((d) => Number(d.id) !== Number(day.id)),
          };
        }
        if (usedDayIds.has(Number(day.id))) return rule;
        return { ...rule, days: [...rule.days, day] };
      }),
    );
  }

  function patchIf(
    ruleKey: string,
    ifKey: string,
    patch: Partial<IfCondition>,
  ) {
    setRules((prev) =>
      prev.map((rule) =>
        rule.key !== ruleKey
          ? rule
          : {
              ...rule,
              if: rule.if.map((row) =>
                row.key === ifKey ? { ...row, ...patch } : row,
              ),
            },
      ),
    );
  }

  function validate(): string | null {
    if (!name.trim()) return "Name is required";
    if (!roundingInterval) return "Rounding interval is required";
    const total = Number(roundingInterval.value) || 0;
    if (total > 0 && (roundingUp === "" || roundingDown === "")) {
      return "Rounding up/down values are required";
    }
    for (const rate of earningRates) {
      if (!String(rate.name || "").trim() || rate.rate === "" || rate.rate == null) {
        return "Each earning rate needs a name and rate %";
      }
    }
    for (const rule of rules) {
      if (!rule.days.length) return "Each rule block needs at least one day";
      for (const row of rule.if) {
        if (!row.field) return "Each IF needs a field";
        const comps = row.field.comparators || [];
        if (comps.length && !row.comparison) return "Each IF needs a comparison";
        const code = row.comparison?.code;
        if (code === "between" || code === "not-between") {
          if (!row.from || !row.to) return "Between comparisons need From and To";
        } else if (comps.length || row.field.field_type?.code === "time") {
          if (!row.value) return "Each IF needs a value";
        }
        if (!row.then.rate) return "Each THEN needs an earning rate";
      }
    }
    return null;
  }

  async function handleSubmit() {
    const error = validate();
    if (error) {
      toast.warning(error);
      return;
    }
    const payload = {
      name: name.trim(),
      settings: {
        rounding_interval: roundingInterval,
        rounding_up_by:
          Number(roundingInterval?.value) === 0 ? 0 : Number(roundingUp),
        rounding_down_by:
          Number(roundingInterval?.value) === 0 ? 0 : Number(roundingDown),
      },
      rules: rules.map((rule) => ({
        id: rule.id,
        days: rule.days,
        if: rule.if.map((row) => ({
          field: row.field,
          comparison: row.comparison,
          value:
            row.comparison?.code === "between" ||
            row.comparison?.code === "not-between"
              ? null
              : row.value || null,
          from:
            row.comparison?.code === "between" ||
            row.comparison?.code === "not-between"
              ? row.from || null
              : null,
          to:
            row.comparison?.code === "between" ||
            row.comparison?.code === "not-between"
              ? row.to || null
              : null,
          then: { rate: row.then.rate },
        })),
      })),
      earning_rates: earningRates,
    };

    try {
      if (isEdit && awardRate?.id != null) {
        await updateMutation.mutateAsync({ id: awardRate.id, ...payload });
        toast.success("Earning rate rules updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Earning rate rules created");
      }
      onClose();
    } catch (err) {
      toast.error("Save failed", getErrorMessage(err));
    }
  }

  if (!open) return null;

  const busy = createMutation.isPending || updateMutation.isPending;
  const intervalTotal = Number(roundingInterval?.value) || 0;

  return (
    <FullScreenModal
      open={open}
      onClose={onClose}
      variant="form"
      title={isEdit ? "Update Earning Rate Rules" : "Create Earning Rate Rules"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} onClick={() => void handleSubmit()}>
            Submit
          </Button>
        </>
      }
    >
      {lookups.isLoading || !seeded ? (
        <LoadingState label="Loading rule builder…" />
      ) : (
        <div className="flex w-full flex-col gap-6 pb-4">
          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <section className="rounded-2xl border border-border p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--mt-text)]">
              Settings
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-1">
                <span className="font-medium">Rounding interval</span>
                <select
                  className={selectClass}
                  value={roundingInterval?.id != null ? String(roundingInterval.id) : ""}
                  onChange={(e) => onIntervalChange(e.target.value)}
                >
                  <option value="">Select interval</option>
                  {lookups.roundingIntervals.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <TextInput
                label="Rounding up by"
                type="number"
                value={roundingUp}
                disabled={!intervalTotal}
                onChange={(e) => onRoundingUpChange(e.target.value)}
              />
              <TextInput
                label="Rounding down by"
                type="number"
                value={roundingDown}
                disabled={!intervalTotal}
                onChange={(e) => onRoundingDownChange(e.target.value)}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[var(--mt-text)]">
                Rates
              </h3>
              <Button variant="soft" className="text-xs" onClick={addEarningRate}>
                Add earning rate
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {earningRates.length === 0 ? (
                <p className="text-sm text-muted">
                  No earning rates yet. Add rates to use in THEN conditions.
                </p>
              ) : null}
              {earningRates.map((rate) => (
                <div
                  key={String(rate.id)}
                  className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_140px_auto]"
                >
                  <TextInput
                    label="Name"
                    value={String(rate.name || "")}
                    onChange={(e) =>
                      updateEarningRate(Number(rate.id), {
                        name: e.target.value,
                      })
                    }
                  />
                  <TextInput
                    label="Rate %"
                    type="number"
                    value={String(rate.rate ?? "")}
                    onChange={(e) =>
                      updateEarningRate(Number(rate.id), {
                        rate: e.target.value,
                      })
                    }
                  />
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      className="text-xs"
                      disabled={Number(rate.id) >= 0}
                      onClick={() => removeEarningRate(Number(rate.id))}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[var(--mt-text)]">
                Rules
              </h3>
              <Button
                variant="soft"
                className="text-xs"
                disabled={!unusedDays.length}
                onClick={addRuleBlock}
              >
                Add day block
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              {rules.map((rule) => {
                const locked = rule.days.some((d) => d.locked);
                const availableForBlock = lookups.days.filter(
                  (d) =>
                    rule.days.some((x) => Number(x.id) === Number(d.id)) ||
                    !usedDayIds.has(Number(d.id)),
                );
                return (
                  <div
                    key={rule.key}
                    className="rounded-xl border border-border bg-[var(--mt-bg)] p-3"
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <button
                        type="button"
                        className="text-left text-sm font-semibold text-[var(--mt-text)]"
                        onClick={() =>
                          setRules((prev) =>
                            prev.map((r) =>
                              r.key === rule.key
                                ? { ...r, expanded: !r.expanded }
                                : r,
                            ),
                          )
                        }
                      >
                        {rule.expanded ? "▾" : "▸"}{" "}
                        {rule.days.map((d) => d.name).join(", ") || "Days"}
                      </button>
                      <Button
                        variant="ghost"
                        className="text-xs"
                        disabled={locked || rules.length <= 1}
                        onClick={() => removeRuleBlock(rule.key)}
                      >
                        Remove block
                      </Button>
                    </div>

                    {rule.expanded ? (
                      <>
                        <div className="mb-4">
                          <p className="mb-2 text-xs font-medium text-muted">
                            Days
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {availableForBlock.map((day) => {
                              const selected = rule.days.some(
                                (d) => Number(d.id) === Number(day.id),
                              );
                              return (
                                <button
                                  key={day.id}
                                  type="button"
                                  disabled={locked || day.locked}
                                  onClick={() => toggleDay(rule.key, day)}
                                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                                    selected
                                      ? "border-primary bg-primary-muted text-primary"
                                      : "border-border text-muted"
                                  }`}
                                >
                                  {day.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          {rule.if.map((row, index) => {
                            const comps = row.field?.comparators || [];
                            const showComparison = comps.length > 0;
                            const between =
                              row.comparison?.code === "between" ||
                              row.comparison?.code === "not-between";
                            const valueType =
                              row.field?.field_type?.code === "time"
                                ? "time"
                                : "number";
                            const usedFieldIds = new Set(
                              rule.if
                                .filter((x) => x.key !== row.key && x.field)
                                .map((x) => Number(x.field!.id)),
                            );
                            const fieldOptions = lookups.fields.filter(
                              (f) =>
                                Number(f.id) === Number(row.field?.id) ||
                                !usedFieldIds.has(Number(f.id)),
                            );

                            return (
                              <div
                                key={row.key}
                                className="rounded-xl border border-border bg-[var(--mt-surface)] p-3"
                              >
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                                    IF {index + 1}
                                  </span>
                                  {index > 0 ? (
                                    <Button
                                      variant="ghost"
                                      className="text-xs"
                                      onClick={() =>
                                        setRules((prev) =>
                                          prev.map((r) =>
                                            r.key !== rule.key
                                              ? r
                                              : {
                                                  ...r,
                                                  if: r.if.filter(
                                                    (x) => x.key !== row.key,
                                                  ),
                                                },
                                          ),
                                        )
                                      }
                                    >
                                      Remove IF
                                    </Button>
                                  ) : null}
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">Field</span>
                                    <select
                                      className={selectClass}
                                      value={
                                        row.field?.id != null
                                          ? String(row.field.id)
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const field =
                                          fieldOptions.find(
                                            (f) =>
                                              String(f.id) === e.target.value,
                                          ) || null;
                                        patchIf(rule.key, row.key, {
                                          field,
                                          comparison: null,
                                          value: "",
                                          from: "",
                                          to: "",
                                        });
                                      }}
                                    >
                                      <option value="">Select field</option>
                                      {fieldOptions.map((f) => (
                                        <option key={f.id} value={String(f.id)}>
                                          {f.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  {showComparison ? (
                                    <label className="flex flex-col gap-1.5 text-sm">
                                      <span className="font-medium">
                                        Comparison
                                      </span>
                                      <select
                                        className={selectClass}
                                        value={
                                          row.comparison?.id != null
                                            ? String(row.comparison.id)
                                            : ""
                                        }
                                        onChange={(e) => {
                                          const comparison =
                                            comps.find(
                                              (c) =>
                                                String(c.id) === e.target.value,
                                            ) || null;
                                          patchIf(rule.key, row.key, {
                                            comparison,
                                            value: "",
                                            from: "",
                                            to: "",
                                          });
                                        }}
                                      >
                                        <option value="">Select comparison</option>
                                        {comps.map((c) => (
                                          <option
                                            key={c.id}
                                            value={String(c.id)}
                                          >
                                            {c.name}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  ) : null}

                                  {showComparison && between ? (
                                    <>
                                      <TextInput
                                        label="From"
                                        type={valueType}
                                        value={row.from}
                                        onChange={(e) =>
                                          patchIf(rule.key, row.key, {
                                            from: e.target.value,
                                          })
                                        }
                                      />
                                      <TextInput
                                        label="To"
                                        type={valueType}
                                        value={row.to}
                                        onChange={(e) =>
                                          patchIf(rule.key, row.key, {
                                            to: e.target.value,
                                          })
                                        }
                                      />
                                    </>
                                  ) : null}

                                  {showComparison && !between ? (
                                    <TextInput
                                      label="Value"
                                      type={valueType}
                                      value={row.value}
                                      onChange={(e) =>
                                        patchIf(rule.key, row.key, {
                                          value: e.target.value,
                                        })
                                      }
                                    />
                                  ) : null}

                                  {!showComparison && row.field ? (
                                    <TextInput
                                      label="Value"
                                      type={valueType}
                                      value={row.value}
                                      onChange={(e) =>
                                        patchIf(rule.key, row.key, {
                                          value: e.target.value,
                                        })
                                      }
                                    />
                                  ) : null}

                                  <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                                    <span className="font-medium">THEN rate</span>
                                    <select
                                      className={selectClass}
                                      value={
                                        row.then.rate?.id != null
                                          ? String(row.then.rate.id)
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const rate =
                                          earningRates.find(
                                            (r) =>
                                              String(r.id) === e.target.value,
                                          ) || null;
                                        patchIf(rule.key, row.key, {
                                          then: { rate },
                                        });
                                      }}
                                    >
                                      <option value="">Select earning rate</option>
                                      {earningRates.map((r) => (
                                        <option
                                          key={String(r.id)}
                                          value={String(r.id)}
                                        >
                                          {r.name || `Rate #${r.id}`} (
                                          {r.rate ?? "—"}%)
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </div>
                              </div>
                            );
                          })}

                          <Button
                            variant="soft"
                            className="self-start text-xs"
                            onClick={() =>
                              setRules((prev) =>
                                prev.map((r) =>
                                  r.key !== rule.key
                                    ? r
                                    : { ...r, if: [...r.if, emptyIf()] },
                                ),
                              )
                            }
                          >
                            Add IF
                          </Button>
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </FullScreenModal>
  );
}
