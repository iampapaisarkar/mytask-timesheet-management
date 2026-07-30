import test from "node:test";
import assert from "node:assert/strict";
import { Acl } from "../class/acl.js";

const EXPECTED = {
  owner: {
    employee: { list: true, create: true, edit: true, delete: false },
    customer: { list: true, create: true, delete: true },
    timesheetManagement: { list: true, create: true, edit: true },
    report: { list: true, view: true, create: true },
    payout: { list: true, create: true, edit: true },
  },
  moderator: {
    employee: { list: true, create: true, edit: true },
    customer: { list: true, create: true, delete: false },
    organisationSetting: { edit: false },
    timesheetManagement: { list: true, edit: true },
    report: { list: true, view: true, create: true },
  },
  manager: {
    employee: { list: true, create: true },
    customer: { list: false, create: false },
    timesheetManagement: { list: true, create: true, edit: true },
    job: { list: false },
    report: { list: true, view: true, create: true },
  },
  staff: {
    employee: { list: false, create: false },
    timesheet: { list: true, edit: true },
    timesheetManagement: { list: false, create: false },
    customer: { list: false },
    payout: { list: true, view: true },
    report: { list: true, view: true, create: true },
    systemLog: { list: true, view: false },
  },
};

for (const [role, domains] of Object.entries(EXPECTED)) {
  test(`ACL permissions for ${role}`, async () => {
    const acl = await Acl.organisationAcl(role);
    assert.ok(acl, `ACL missing for ${role}`);
    for (const [domain, perms] of Object.entries(domains)) {
      for (const [action, value] of Object.entries(perms)) {
        assert.equal(
          acl[domain][action],
          value,
          `${role}.${domain}.${action} expected ${value}`,
        );
      }
    }
  });
}
