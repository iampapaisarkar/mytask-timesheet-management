import moment from "moment-timezone";

function calcHours(start, end, tz = "UTC") {
  if (!start || !end) return 0;
  const s = moment.tz(start, "HH:mm:ss", "UTC").tz(tz);
  const e = moment.tz(end, "HH:mm:ss", "UTC").tz(tz);
  return Math.max(0, e.diff(s, "minutes") / 60);
}

function sumTaskHours(tasks, tz = "UTC") {
  return (tasks || []).reduce((sum, t) => {
    if (t.start_time && t.end_time)
      return sum + calcHours(t.start_time, t.end_time, tz);
    return sum;
  }, 0);
}

function formatTaskTimes(tasks, tz = "UTC") {
  return (tasks || [])
    .map((t) => {
      const { start_time, end_time } = t;
      if (!start_time || !end_time) return null;
      const start = moment.tz(start_time, "HH:mm:ss", "UTC").tz(tz);
      const end = moment.tz(end_time, "HH:mm:ss", "UTC").tz(tz);
      const sum = calcHours(start_time, end_time, tz);
      return `${start.format("h:mm A")} – ${end.format("h:mm A")} (${toHM(sum)})`;
    })
    .filter(Boolean);
}

function toHM(decimalVal) {
  if (decimalVal === 0) return null;
  const minutes = Math.round(decimalVal * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0 && m === 0) return null;
  return `${h}h ${m}m`;
}

function convertUserLocalDateTime(
  input,
  tz,
  outputFormat = "YYYY-MM-DD HH:mm:ss"
) {
  if (!input || !tz) return input || null;
  return moment.tz(input, "UTC").tz(tz).format(outputFormat);
}

export function convertUserLocalTime(input, tz, outputFormat = "HH:mm:ss") {
  if (!input || !tz) return input || null;
  return moment.tz(input, "HH:mm:ss", "UTC").tz(tz).format(outputFormat);
}

function decimalHours(start, end) {
  let s = moment(start, "HH:mm");
  let e = moment(end, "HH:mm");

  if (e.isBefore(s)) e.add(1, "day");

  const minutes = e.diff(s, "minutes");
  return (minutes / 60).toFixed(2);
}

function isWeekend(dayOfWeek) {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export default {
  calcHours,
  sumTaskHours,
  formatTaskTimes,
  toHM,
  convertUserLocalDateTime,
  convertUserLocalTime,
  decimalHours,
  isWeekend,
};
