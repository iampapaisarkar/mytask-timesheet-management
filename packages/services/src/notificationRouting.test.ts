import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveNotificationPath } from "./notificationRouting.ts";

describe("resolveNotificationPath", () => {
  it("keeps timesheet detail urls", () => {
    const r = resolveNotificationPath({
      url: "/org/ACME/timesheet/12/details?tab=submitted",
    });
    assert.equal(r.path, "/org/ACME/timesheet/12/details?tab=submitted");
    assert.equal(r.fallback, false);
  });

  it("normalises legacy /timesheets segment", () => {
    const r = resolveNotificationPath({
      url: "/org/ACME/timesheets",
    });
    assert.equal(r.path, "/org/ACME/timesheet");
  });

  it("strips absolute origins to path", () => {
    const r = resolveNotificationPath({
      url: "https://app.example.com/org/ACME/reports?request=9",
    });
    assert.equal(r.path, "/org/ACME/reports?request=9");
  });

  it("infers invitation route from title when url missing", () => {
    const r = resolveNotificationPath({
      title: "Organisation invitation",
      body: "You were invited",
    });
    assert.equal(r.path, "/org-invitation");
  });

  it("falls back to home when nothing matches", () => {
    const r = resolveNotificationPath({ title: "Hello" });
    assert.equal(r.path, "/");
    assert.equal(r.fallback, true);
  });
});
