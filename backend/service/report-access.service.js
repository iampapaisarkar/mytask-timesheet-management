import models from "../models/index.js";

const { Employees, Users, UserOrganisationRoles, OrganisationRoles } = models;

/**
 * Role-ladder report visibility (no manager→staff hierarchy in DB).
 * owner → all; moderator → manager+staff (+self); manager → staff (+self); staff → self.
 */
export const REPORT_ROLE_LADDER = {
  owner: null,
  moderator: ["manager", "staff"],
  manager: ["staff"],
  staff: [],
};

export function allowedReportTargetRoles(requesterRole) {
  if (!requesterRole || !(requesterRole in REPORT_ROLE_LADDER)) {
    return [];
  }
  return REPORT_ROLE_LADDER[requesterRole];
}

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function loadEmployeesWithRoles(organisationId) {
  const rows = await Employees.unscoped().findAll({
    where: { organisation_id: organisationId },
    attributes: ["id", "user_id", "organisation_id", "preferred_name"],
    include: [
      {
        model: Users,
        as: "user",
        required: false,
        attributes: [
          "id",
          "first_name",
          "middle_name",
          "last_name",
          "email",
        ],
        include: [
          {
            model: UserOrganisationRoles,
            as: "user_organisations_role",
            required: false,
            where: { organisation_id: organisationId },
            attributes: ["id", "role_id", "organisation_id", "user_id"],
            include: [
              {
                model: OrganisationRoles,
                as: "role",
                attributes: ["id", "name", "code"],
              },
            ],
          },
        ],
      },
    ],
  });

  return rows.map((row) => {
    // Avoid Employees.prototype.toJSON() which nests fields under `details`.
    const plain = row.get({ plain: true });
    const roleCode = plain.user?.user_organisations_role?.role?.code || null;
    const fullName =
      [plain.user?.first_name, plain.user?.middle_name, plain.user?.last_name]
        .filter(Boolean)
        .join(" ") ||
      plain.preferred_name ||
      `Employee #${plain.id}`;
    return {
      id: plain.id,
      user_id: plain.user_id,
      organisation_id: plain.organisation_id,
      preferred_name: plain.preferred_name,
      full_name: fullName,
      email: plain.user?.email || null,
      roleCode,
      role: plain.user?.user_organisations_role?.role || null,
      user: plain.user || null,
    };
  });
}

export async function getVisibleEmployeeIds(organisation) {
  const role = organisation?.role?.code;
  const selfEmployeeId = organisation?.employee?.id ?? null;
  const all = await loadEmployeesWithRoles(organisation.id);
  const allowed = allowedReportTargetRoles(role);

  if (allowed === null) {
    return all.map((e) => e.id);
  }

  return all
    .filter((emp) => {
      if (selfEmployeeId != null && Number(emp.id) === Number(selfEmployeeId)) {
        return true;
      }
      if (!emp.roleCode) return false;
      return allowed.includes(emp.roleCode);
    })
    .map((e) => e.id);
}

export async function listVisibleEmployees(organisation) {
  const ids = new Set(await getVisibleEmployeeIds(organisation));
  if (!ids.size) return [];
  const all = await loadEmployeesWithRoles(organisation.id);
  const selfId = organisation?.employee?.id ?? null;
  return all
    .filter((e) => ids.has(e.id))
    .map((e) => {
      const isYou =
        selfId != null && Number(e.id) === Number(selfId);
      return {
        ...e,
        is_you: isYou,
        full_name: isYou ? `${e.full_name} (You)` : e.full_name,
      };
    });
}

export async function assertEmployeesInScope(organisation, employeeIds) {
  const visible = new Set(await getVisibleEmployeeIds(organisation));
  const requested = [
    ...new Set(
      (Array.isArray(employeeIds) ? employeeIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];

  if (!requested.length) {
    return [...visible];
  }

  const denied = requested.filter((id) => !visible.has(id));
  if (denied.length) {
    throw new AppError(
      "You are not authorized to include one or more selected employees in this report.",
      403,
    );
  }
  return requested;
}

export { AppError };

export default {
  REPORT_ROLE_LADDER,
  allowedReportTargetRoles,
  getVisibleEmployeeIds,
  listVisibleEmployees,
  assertEmployeesInScope,
  loadEmployeesWithRoles,
  AppError,
};
