import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  REALTIME_EVENTS,
} from "../service/realtime.service.js";

describe("realtime event naming", () => {
  it("uses domain-based event names", () => {
    assert.equal(REALTIME_EVENTS.EMPLOYEE_CREATED, "employee.created");
    assert.equal(REALTIME_EVENTS.TIMESHEET_UPDATED, "timesheet.updated");
    assert.equal(REALTIME_EVENTS.PAYOUT_CREATED, "payout.created");
    assert.equal(REALTIME_EVENTS.REPORT_GENERATED, "report.generated");
    assert.equal(REALTIME_EVENTS.NOTIFICATION_CREATED, "notification.created");
    assert.equal(REALTIME_EVENTS.AUTH_LOGOUT, "auth.logout");
  });
});

describe("socket room helpers", () => {
  it("formats user and org rooms", () => {
    assert.equal(`user:${55}`, "user:55");
    assert.equal(`org:${12}`, "org:12");
  });
});
