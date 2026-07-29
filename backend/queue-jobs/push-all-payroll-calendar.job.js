import { payrollCalendarQueue } from "../queue/payroll-calendar.queue.js";
import redis from "../functions/redis-registry.js";
import models from "../models/index.js";
const { PayrollCalendars, PayCycles } = models;
import { v4 as uuid } from "uuid";

export async function enqueueAllPayrollCalendarToXero({ user, organisation }) {
  const batchId = uuid();
  const limit = 100;
  let offset = 0;
  let total = 0;

  while (true) {
    const systemPayrollCalendars = await PayrollCalendars.findAll({
      where: { organisation_id: organisation.id },
      include: [
        {
          model: PayCycles,
          as: "pay_cycle",
          attributes: ["id", "name", "code"],
        },
      ],
      limit,
      offset,
    });

    if (!systemPayrollCalendars.length) break;

    for (const pc of systemPayrollCalendars) {
      if (!pc.xero_payroll_calendar_id) {
        await payrollCalendarQueue.add(
          "push-single-payroll-calendar",
          {
            user,
            organisation,
            payrollCalendar: pc,
            payCycle: pc?.pay_cycle,
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
      }
      total++;
    }

    offset += limit;
  }

  await redis.hset(`xero:payrollcalendar:batch:${batchId}`, {
    total,
    success: 0,
    failed: 0,
    userId: user.id,
    orgId: organisation.id,
  });

  return batchId;
}
