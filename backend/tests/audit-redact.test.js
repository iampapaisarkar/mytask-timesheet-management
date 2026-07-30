import test from "node:test";
import assert from "node:assert/strict";
import { redactSensitive, summarizeError } from "../utils/audit-redact.js";
import {
  featureFromPath,
  friendlyInternalMessage,
  errorCategoryFromStatus,
} from "../utils/audit-messages.js";

test("redactSensitive masks tokens and passwords", () => {
  const out = redactSensitive({
    email: "a@b.com",
    password: "secret",
    Authorization: "Bearer abc.def",
    nested: { api_key: "xyz", ok: true },
  });
  assert.equal(out.password, "[REDACTED]");
  assert.equal(out.Authorization, "[REDACTED]");
  assert.equal(out.nested.api_key, "[REDACTED]");
  assert.equal(out.nested.ok, true);
  assert.equal(out.email, "a@b.com");
});

test("featureFromPath maps known routes", () => {
  assert.equal(featureFromPath("/api/employees/list"), "Employees");
  assert.equal(featureFromPath("/api/auth/login"), "Login");
  assert.equal(featureFromPath("/api/payouts/create"), "Payroll");
});

test("friendlyInternalMessage covers auth and success", () => {
  assert.match(
    friendlyInternalMessage({ success: false, statusCode: 401 }),
    /session expired/i,
  );
  assert.match(
    friendlyInternalMessage({
      success: true,
      statusCode: 200,
      feature: "Employees",
    }),
    /successfully/i,
  );
});

test("errorCategoryFromStatus maps codes", () => {
  assert.equal(errorCategoryFromStatus(401), "authentication");
  assert.equal(errorCategoryFromStatus(403), "authorization");
  assert.equal(errorCategoryFromStatus(500), "server");
});

test("summarizeError formats Error objects", () => {
  const msg = summarizeError(new Error("boom"));
  assert.match(msg, /boom/);
});
