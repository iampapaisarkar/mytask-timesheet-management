import { timesheetQueue } from "../queue/timesheet.queue.js";

export async function enqueueSingleTimesheetToXero({
  user,
  organisation,
  timesheetId,
  status,
}) {
  await timesheetQueue.add(
    "push-single-timesheet",
    {
      user,
      organisation,
      systemTimesheetId: timesheetId,
      status,
      isBulk: false,
    },
    {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
}
