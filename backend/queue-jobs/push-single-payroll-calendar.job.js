import { payrollCalendarQueue } from "../queue/payroll-calendar.queue.js";

export async function enqueueSinglePayrollCalendarToXero({
  user,
  organisation,
  payrollCalendar,
  payCycle,
}) {
  await payrollCalendarQueue.add(
    "push-single-payroll-calendar",
    {
      user,
      organisation,
      payrollCalendar,
      payCycle,
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
