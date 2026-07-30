import test from "node:test";
import assert from "node:assert/strict";
import {
  allowedReportTargetRoles,
  REPORT_ROLE_LADDER,
} from "../service/report-access.service.js";

function filterEmployeesByReportLadder(
  employeesWithRoles,
  requesterRole,
  selfEmployeeId,
) {
  const allowed = allowedReportTargetRoles(requesterRole);
  if (allowed === null) return employeesWithRoles;
  const selfId = selfEmployeeId != null ? Number(selfEmployeeId) : null;
  return employeesWithRoles.filter((emp) => {
    if (selfId != null && Number(emp.id) === selfId) return true;
    if (!emp.roleCode) return false;
    return allowed.includes(emp.roleCode);
  });
}

test("report role ladder matrix", () => {
  assert.equal(allowedReportTargetRoles("owner"), null);
  assert.deepEqual(allowedReportTargetRoles("moderator"), [
    "manager",
    "staff",
  ]);
  assert.deepEqual(allowedReportTargetRoles("manager"), ["staff"]);
  assert.deepEqual(allowedReportTargetRoles("staff"), []);
  assert.deepEqual(allowedReportTargetRoles("unknown"), []);
  assert.ok("owner" in REPORT_ROLE_LADDER);
});

test("filterEmployeesByReportLadder includes self and subordinates only", () => {
  const roster = [
    { id: 1, roleCode: "owner" },
    { id: 2, roleCode: "moderator" },
    { id: 3, roleCode: "manager" },
    { id: 4, roleCode: "staff" },
    { id: 5, roleCode: "staff" },
  ];

  assert.equal(filterEmployeesByReportLadder(roster, "owner", 1).length, 5);

  assert.deepEqual(
    filterEmployeesByReportLadder(roster, "moderator", 2)
      .map((e) => e.id)
      .sort(),
    [2, 3, 4, 5],
  );

  assert.deepEqual(
    filterEmployeesByReportLadder(roster, "manager", 3)
      .map((e) => e.id)
      .sort(),
    [3, 4, 5],
  );

  assert.deepEqual(
    filterEmployeesByReportLadder(roster, "staff", 4).map((e) => e.id),
    [4],
  );
});
