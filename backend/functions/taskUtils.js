import moment from "moment-timezone";

function filterByType(tasks = [], type) {
  if (type === "work")
    return tasks.filter(
      (t) => t.job_id !== null && !t.is_break && !t.is_travel
    );
  if (type === "travel") return tasks.filter((t) => t.is_travel);
  if (type === "break") return tasks.filter((t) => t.is_break && !t.is_travel);
  if (type === "all") return tasks;
  return tasks;
}

function getTaskTimes(tasks = [], tz = "UTC") {
  // returns array of { task_time }
  return (tasks || []).reduce((acc, task) => {
    if (!task.start_time && !task.end_time) return acc;
    const start = moment.tz(task.start_time, "HH:mm:ss", "UTC").tz(tz);
    const end = moment.tz(task.end_time, "HH:mm:ss", "UTC").tz(tz);
    const s = task.start_time; // keep raw strings; formatting is usually in timeUtils
    const e = task.end_time;
    acc.push({
      task_time: `${start.format("h:mm A")} - ${end.format("h:mm A")}`,
    });
    return acc;
  }, []);
}

export default { filterByType, getTaskTimes };
