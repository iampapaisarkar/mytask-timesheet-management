import { employeeQueue } from "../queue/employee.queue.js";

export async function enqueueSingleEmployeeToXero({
  user,
  organisation,
  employee,
}) {
  await employeeQueue.add(
    "push-single-employee",
    {
      user,
      organisation,
      employee,
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
