import { timesheetQueue } from "../queue/timesheet.queue.js";
import redis from "../functions/redis-registry.js";
import models from "../models/index.js";
const { Timesheets, TimesheetStatus } = models;
import { v4 as uuid } from "uuid";

export async function enqueueAllTimesheetToXero({ user, organisation }) {
  const batchId = uuid();
  const limit = 100;
  let offset = 0;
  let total = 0;

  while (true) {
    const systemTimesheets = await Timesheets.findAll({
      where: {
        organisation_id: organisation.id,
      },
      include: [
        {
          model: TimesheetStatus,
          as: "status",
        },
      ],
      limit,
      offset,
    });

    if (!systemTimesheets.length) break;

    for (const ts of systemTimesheets) {
      const statusCode = ts.status?.code;

      let xeroStatus = "DRAFT";
      if (statusCode === "submitted") xeroStatus = "PROCESSED";
      else if (statusCode === "approved") xeroStatus = "APPROVED";

      await timesheetQueue.add(
        "push-single-timesheet",
        {
          user,
          organisation,
          systemTimesheetId: ts.id,
          status: xeroStatus,
          isBulk: true,
          batchId,
        },
        {
          attempts: 5,
          backoff: {
            type: "exponential",
            delay: 3000,
          },
          removeOnComplete: true,
        }
      );
      total++;
    }

    offset += limit;
  }

  await redis.hset(`xero:timesheet:batch:${batchId}`, {
    total,
    success: 0,
    failed: 0,
    userId: user.id,
    orgId: organisation.id,
  });

  return batchId;
}
