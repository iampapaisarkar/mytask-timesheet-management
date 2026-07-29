import moment from "moment-timezone";
import timeUtils from "./time.utils.js";
import taskUtils from "./task.utils.js";

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
    } to ${fieldType === "number" ? toHM(ifx.to) : ifx.to} (${
      ifx.field.name
    }) - (${taskType})`;
  }
  return `Any ${taskType} ${ifx.comparison.name.toLowerCase()} ${
    fieldType === "number" ? toHM(ifx.value) : ifx.value
  } (${ifx.field.name}) - (${taskType})`;
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
  if ((tasks || []).some((t) => !t.start_time || !t.end_time)) {
    return null;
  }

  const fromM = from ? moment.tz(from, "HH:mm", tz) : null;
  const toM = to ? moment.tz(to, "HH:mm", tz) : null;
  const valueM = value ? moment.tz(value, "HH:mm", tz) : null;

  // if field is start-time treat as equal-to for now (keeps compatibility)
  const validTasks = (tasks || []).filter((t) => t.start_time && t.end_time);
  if (!validTasks.length) {
    return {
      comparison_label: null,
      rate_percent: rate?.rate || null,
      condition_matched: false,
    };
  }

  const taskMoments = validTasks.map((task) => ({
    start: moment.tz(task.start_time, "HH:mm:ss", "UTC").tz(tz),
    end: moment.tz(task.end_time, "HH:mm:ss", "UTC").tz(tz),
  }));

  const taskTimes = taskUtils.getTaskTimes(validTasks, tz);

  if (comparison === "equal-to") {
    const matched = valueM
      ? taskMoments.some(({ start }) => start.isSame(valueM))
      : false;

    return {
      task_times: taskTimes,
      comparison_label: `If any task starts ${comparisonName.toLowerCase()} ${valueM?.format(
        "HH:mm"
      )}, then you will get ${rate?.rate}% (${rate?.name}).`,
      rate_percent: rate?.rate || null,
      rate_label: rate?.name || null,
      condition_matched: matched,
      rate_id: rate?.id || null,
    };
  }

  if (comparison === "between") {
    const matched = taskMoments.some(
      ({ start, end }) => start.isSameOrAfter(fromM) && end.isSameOrBefore(toM)
    );

    return {
      task_times: taskTimes,
      comparison_label: `If any task time falls ${comparisonName.toLowerCase()} ${fromM.format(
        "HH:mm"
      )} and ${toM.format("HH:mm")}, then you will get ${rate?.rate}% (${
        rate?.name
      }).`,
      rate_percent: rate?.rate || null,
      rate_label: rate?.name || null,
      condition_matched: matched,
      rate_id: rate?.id || null,
    };
  }

  if (comparison === "not-between") {
    const matched = taskMoments.some(
      ({ start, end }) => start.isBefore(fromM) || end.isAfter(toM)
    );

    return {
      task_times: taskTimes,
      comparison_label: `If any task time falls ${comparisonName.toLowerCase()} ${fromM.format(
        "HH:mm"
      )} and ${toM.format("HH:mm")}, then you will get ${rate?.rate}% (${
        rate?.name
      }).`,
      rate_percent: rate?.rate || null,
      rate_label: rate?.name || null,
      condition_matched: matched,
      rate_id: rate?.id || null,
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
  if ((tasks || []).some((t) => !t.start_time || !t.end_time)) {
    return null;
  }

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
    rate_id: rate?.id || null,
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
