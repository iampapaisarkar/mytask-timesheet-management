import { employeeQueue } from "../queue/employee.queue.js";
import redis from "../functions/redis-registry.js";
import models from "../models/index.js";
const { Employees } = models;
import { v4 as uuid } from "uuid";

export async function enqueueAllEmployeeToXero({ user, organisation }) {
  const batchId = uuid();
  const limit = 100;
  let offset = 0;
  let total = 0;

  while (true) {
    const systemEmployees = await Employees.scope("defaultScope").findAll({
      where: { organisation_id: organisation.id },
      limit,
      offset,
    });

    if (!systemEmployees.length) break;

    for (const emp of systemEmployees) {
      await employeeQueue.add(
        "push-single-employee",
        {
          user,
          organisation,
          employee: emp,
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

  await redis.hset(`xero:employee:batch:${batchId}`, {
    total,
    success: 0,
    failed: 0,
    userId: user.id,
    orgId: organisation.id,
  });

  return batchId;
}
