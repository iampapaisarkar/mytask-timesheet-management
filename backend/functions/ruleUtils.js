import moment from "moment-timezone";
import timeUtils from "./timeUtils.js";
import taskUtils from "./taskUtils.js";

const DAY_MAP = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
function getDayNameFromNumber(n) {
  return DAY_MAP[n] || null;
}

function getRuleLabel(ifx, taskType) {
  const fieldType = ifx.field.field_type.code;
  const cmp = ifx.comparison.code;
  if (cmp === "between" || cmp === "not-between") {
    return `Applies ${ifx.comparison.name.toLowerCase()} ${
      fieldType === "number" ? toHM(ifx.from) : ifx.from
    } to ${fieldType === "number" ? toHM(ifx.to) : ifx.to} (${ifx.field.name})`;
  }
  return `Any ${taskType} ${ifx.comparison.name.toLowerCase()} ${
    fieldType === "number" ? toHM(ifx.value) : ifx.value
  } (${ifx.field.name})`;
}

function toHM(val) {
  // small helper for labels
  const num = parseFloat(val);
  if (Number.isNaN(num)) return val;
  const minutes = Math.round(num * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function evaluateIf(ifx, tasks, tz = "UTC") {
  // normalize
  const field = ifx.field.code;
  const fieldType = ifx.field.field_type.code;
  const comparison = ifx.comparison.code;
  const value = ifx.value;
  const from = ifx.from;
  const to = ifx.to;

  if (fieldType === "time") {
    return evaluateTimeComparison({
      field,
      comparison,
      value,
      from,
      to,
      tasks,
      tz,
      rate: ifx.then?.rate,
      comparisonName: ifx.comparison.name,
    });
  }
  return evaluateNumericComparison({
    field,
    comparison,
    value,
    from,
    to,
    tasks,
    tz,
    rate: ifx.then?.rate,
    comparisonName: ifx.comparison.name,
  });
}

function evaluateTimeComparison({
  field,
  comparison,
  value,
  from,
  to,
  tasks,
  tz,
  rate,
  comparisonName,
}) {
  const fromM = from ? moment.tz(from, "HH:mm", tz) : null;
  const toM = to ? moment.tz(to, "HH:mm", tz) : null;
  const valueM = value ? moment.tz(value, "HH:mm", tz) : null;

  // if field is start-time treat as equal-to for now (keeps compatibility)
  const task = (tasks || []).find((t) => t.start_time && t.end_time);
  if (!task)
    return {
      comparison_label: null,
      rate_percent: rate?.rate || null,
      condition_matched: false,
    };

  const taskStart = moment.tz(task.start_time, "HH:mm:ss", "UTC").tz(tz);
  const taskEnd = moment.tz(task.end_time, "HH:mm:ss", "UTC").tz(tz);

  if (comparison === "equal-to") {
    const matched = valueM ? taskStart.isSame(valueM) : false;
    return {
      task_time: `${taskStart.format("HH:mm")} - ${taskEnd.format("HH:mm")}`,
      comparison_label: `Your task start from ${
        valueM ? valueM.format("HH:mm") : ""
      }. If it is ${comparisonName.toLowerCase()} ${taskStart.format(
        "HH:mm"
      )}, then you will get ${rate?.rate}% (${rate?.name}) for the task.`,
      rate_percent: rate?.rate || null,
      rate_label: rate?.name || null,
      condition_matched: matched,
    };
  }

  if (comparison === "between") {
    const matched =
      taskStart.isSameOrAfter(fromM) && taskEnd.isSameOrBefore(toM);
    return {
      task_time: `${taskStart.format("HH:mm")} - ${taskEnd.format("HH:mm")}`,
      comparison_label: `Your task time is from ${taskStart.format(
        "HH:mm"
      )} to ${taskEnd.format(
        "HH:mm"
      )}. If this time range falls ${comparisonName.toLowerCase()} ${fromM.format(
        "HH:mm"
      )} and ${toM.format("HH:mm")}, then you will get ${rate?.rate}% (${
        rate?.name
      }) for the task.`,
      rate_percent: rate?.rate || null,
      rate_label: rate?.name || null,
      condition_matched: matched,
    };
  }

  if (comparison === "not-between") {
    const matched = taskStart.isBefore(fromM) || taskEnd.isAfter(toM);
    return {
      task_time: `${taskStart.format("HH:mm")} - ${taskEnd.format("HH:mm")}`,
      comparison_label: `Your task time is from ${taskStart.format(
        "HH:mm"
      )} to ${taskEnd.format(
        "HH:mm"
      )}. If this time range falls ${comparisonName.toLowerCase()} ${fromM.format(
        "HH:mm"
      )} and ${toM.format("HH:mm")}, then you will get ${rate?.rate}% (${
        rate?.name
      }) for the task.`,
      rate_percent: rate?.rate || null,
      rate_label: rate?.name || null,
      condition_matched: matched,
    };
  }

  return {
    comparison_label: null,
    rate_percent: rate?.rate || null,
    condition_matched: false,
  };
}

function evaluateNumericComparison({
  field,
  comparison,
  value,
  from,
  to,
  tasks,
  tz,
  rate,
  comparisonName,
}) {
  const fromM = from ? parseFloat(from) : null;
  const toM = to ? parseFloat(to) : null;
  const valueM = value ? parseFloat(value) : null;

  let total = 0;
  // special handling for first/last travel trip times
  if (field === "first-travel-trip-time") {
    const first = (tasks || [])
      .filter((t) => t.is_travel && t.start_time && t.end_time)
      .sort((a, b) => {
        const as = moment.tz(a.start_time, "HH:mm:ss", "UTC").tz(tz);
        const bs = moment.tz(b.start_time, "HH:mm:ss", "UTC").tz(tz);
        return as.isBefore(bs) ? -1 : 1;
      })[0];
    total = first
      ? timeUtils.calcHours(first.start_time, first.end_time, tz)
      : 0;
  } else if (field === "last-travel-trip-time") {
    const last = (tasks || [])
      .filter((t) => t.is_travel && t.start_time && t.end_time)
      .sort((a, b) => {
        const ae = moment.tz(a.end_time, "HH:mm:ss", "UTC").tz(tz);
        const be = moment.tz(b.end_time, "HH:mm:ss", "UTC").tz(tz);
        return ae.isAfter(be) ? -1 : 1;
      })[0];
    total = last ? timeUtils.calcHours(last.start_time, last.end_time, tz) : 0;
  } else {
    total = (tasks || []).reduce(
      (s, t) =>
        s +
        (t.start_time && t.end_time
          ? timeUtils.calcHours(t.start_time, t.end_time, tz)
          : 0),
      0
    );
  }

  const taskTimes = taskUtils.getTaskTimes(tasks, tz);

  const base = {
    task_times: taskTimes,
    task_total_hours: total,
    rate_percent: rate?.rate || null,
    rate_label: rate?.name || null,
  };

  switch (comparison) {
    case "equal-to":
      return {
        ...base,
        condition_matched: total === valueM,
        comparison_label: `Your total task duration is ${timeUtils.toHM(
          total
        )}. If it is ${comparisonName.toLowerCase()} ${timeUtils.toHM(
          valueM
        )}, then you will get ${rate?.rate}% (${rate?.name}) for the task.`,
      };
    case "not-equal-to":
      return {
        ...base,
        condition_matched: total !== valueM,
        comparison_label: `Your total task duration is ${timeUtils.toHM(
          total
        )}. If it is ${comparisonName.toLowerCase()} ${timeUtils.toHM(
          valueM
        )}, then you will get ${rate?.rate}% (${rate?.name}) for the task.`,
      };
    case "greater-than":
      return {
        ...base,
        condition_matched: total > valueM,
        comparison_label: `Your total task duration is ${timeUtils.toHM(
          total
        )}. If it is ${comparisonName.toLowerCase()} ${timeUtils.toHM(
          valueM
        )}, then you will get ${rate?.rate}% (${rate?.name}) for the task.`,
      };
    case "greater-than-or-equal-to":
      return {
        ...base,
        condition_matched: total >= valueM,
        comparison_label: `Your total task duration is ${timeUtils.toHM(
          total
        )}. If it is ${comparisonName.toLowerCase()} ${timeUtils.toHM(
          valueM
        )}, then you will get ${rate?.rate}% (${rate?.name}) for the task.`,
      };
    case "less-than":
      return {
        ...base,
        condition_matched: total < valueM,
        comparison_label: `Your total task duration is ${timeUtils.toHM(
          total
        )}. If it is ${comparisonName.toLowerCase()} ${timeUtils.toHM(
          valueM
        )}, then you will get ${rate?.rate}% (${rate?.name}) for the task.`,
      };
    case "less-than-or-equal-to":
      return {
        ...base,
        condition_matched: total <= valueM,
        comparison_label: `Your total task duration is ${timeUtils.toHM(
          total
        )}. If it is ${comparisonName.toLowerCase()} ${timeUtils.toHM(
          valueM
        )}, then you will get ${rate?.rate}% (${rate?.name}) for the task.`,
      };
    case "between":
      return {
        ...base,
        condition_matched: total >= fromM && total <= toM,
        comparison_label: `Your total task duration is ${timeUtils.toHM(
          total
        )}. If it is ${comparisonName.toLowerCase()} ${timeUtils.toHM(
          fromM
        )} to ${timeUtils.toHM(toM)}, then you will get ${rate?.rate}% (${
          rate?.name
        }) for the task.`,
      };
    case "not-between":
      return {
        ...base,
        condition_matched: total < fromM || total > toM,
        comparison_label: `Your total task duration is ${timeUtils.toHM(
          total
        )}. If it is ${comparisonName.toLowerCase()} ${timeUtils.toHM(
          fromM
        )} to ${timeUtils.toHM(toM)}, then you will get ${rate?.rate}% (${
          rate?.name
        }) for the task.`,
      };
    default:
      return { ...base, condition_matched: false, comparison_label: null };
  }
}

export default { getDayNameFromNumber, getRuleLabel, evaluateIf };
