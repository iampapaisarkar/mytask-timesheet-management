import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SOCKET_EVENTS, DOMAIN_SYNC_EVENTS } from "./events.ts";
import { userRoom, orgRoom } from "./rooms.ts";

describe("realtime contracts", () => {
  it("uses domain-based event names", () => {
    assert.equal(SOCKET_EVENTS.EMPLOYEE_CREATED, "employee.created");
    assert.equal(SOCKET_EVENTS.TIMESHEET_UPDATED, "timesheet.updated");
    assert.equal(SOCKET_EVENTS.NOTIFICATION_CREATED, "notification.created");
    assert.equal(SOCKET_EVENTS.AUDIT_LOG_CREATED, "audit.log.created");
    assert.equal(SOCKET_EVENTS.AUTH_LOGOUT, "auth.logout");
  });

  it("lists domain sync events", () => {
    assert.ok(DOMAIN_SYNC_EVENTS.includes(SOCKET_EVENTS.EMPLOYEE_CREATED));
    assert.ok(DOMAIN_SYNC_EVENTS.includes(SOCKET_EVENTS.TIMESHEET_UPDATED));
    assert.ok(DOMAIN_SYNC_EVENTS.includes(SOCKET_EVENTS.NOTIFICATION_CREATED));
    assert.ok(DOMAIN_SYNC_EVENTS.includes(SOCKET_EVENTS.AUDIT_LOG_CREATED));
  });

  it("builds organisation and user rooms", () => {
    assert.equal(orgRoom(12), "org:12");
    assert.equal(userRoom(55), "user:55");
  });
});
