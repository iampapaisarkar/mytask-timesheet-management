import { DataTypes, Op } from "sequelize";
import { db } from "../database.js";
import Users from "./users.js";
import UserOrganisationRoles from "./userOrganisationRoles.js";
import OrganisationRoles from "./organisationRoles.js";
import EmployeeInvitations from "./employeeInvitations.js";
import InvitationStatus from "./invitationStatus.js";
import EmployeeWages from "./employeeWages.js";
import EmploymentTypes from "./employmentTypes.js";
import PayrollCalendars from "./payrollCalendars.js";
import PayCycles from "./payCycles.js";
import EmployeePayrolls from "./employeePayrolls.js";
import UserTimezones from "./userTimezones.js";
import States from "./states.js";
import EmployeeAddress from "./employeeAddress.js";

/**
 * Attach the org-scoped role without joining UOR in the main query.
 * A JOIN on user_id alone multiplies rows (multi-org / historical dupes), and
 * correlating on `Employees.organisation_id` breaks when this model is nested
 * under alias `employee` (e.g. Organisations.withUser / orgBootstrap).
 */
async function attachOrganisationRoles(findResult) {
  if (!findResult) return;
  const rows = Array.isArray(findResult) ? findResult : [findResult];
  const targets = rows.filter((r) => r?.user_id && r?.organisation_id);
  if (!targets.length) return;

  const roleRows = await UserOrganisationRoles.findAll({
    where: {
      [Op.or]: targets.map((t) => ({
        user_id: t.user_id,
        organisation_id: t.organisation_id,
      })),
    },
    attributes: ["id", "user_id", "organisation_id", "role_id"],
    include: [
      {
        model: OrganisationRoles,
        as: "role",
        attributes: ["id", "name", "code"],
      },
    ],
  });

  const byKey = new Map(
    roleRows.map((r) => [`${r.user_id}:${r.organisation_id}`, r]),
  );

  for (const emp of targets) {
    const uor = byKey.get(`${emp.user_id}:${emp.organisation_id}`);
    if (!uor || !emp.user) continue;
    if (typeof emp.user.setDataValue === "function") {
      emp.user.setDataValue("user_organisations_role", uor);
    } else {
      emp.user.user_organisations_role = uor;
    }
  }
}

const Employees = db.define(
  "Employees",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
    },
    organisation_id: {
      type: DataTypes.INTEGER,
    },
    preferred_name: {
      type: DataTypes.STRING,
    },
    phone_number: {
      type: DataTypes.STRING,
    },
    phone_country_code: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    phone_country_iso: {
      type: DataTypes.STRING(2),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    created_by: {
      type: DataTypes.INTEGER,
    },
    updated_at: {
      type: DataTypes.DATE,
      field: "updated_at",
    },
    updated_by: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "employees",
    timestamps: false,
  },
);

Employees.prototype.toJSON = function () {
  const full = this.get({ plain: true });
  const { wage, payroll, ...rest } = full;

  return {
    details: {
      ...rest,
      role: rest?.user?.user_organisations_role?.role || rest?.invitation?.role,
      full_name: rest?.user?.full_name || null,
      first_name: rest?.user?.first_name || null,
      middle_name: rest?.user?.middle_name || null,
      last_name: rest?.user?.last_name || null,
      email: rest?.user?.email || rest?.invitation?.email,
      dob: rest?.user?.dob || null,
    },
    wage: wage || null,
    payroll: payroll || null,
  };
};

Employees.associate = function (models) {
  models.Employees.belongsTo(models.Users, {
    as: "user",
    foreignKey: "user_id",
  });

  models.Employees.hasOne(models.EmployeeInvitations, {
    as: "invitation",
    foreignKey: "employee_id",
    sourceKey: "id",
  });

  models.Employees.belongsTo(models.Users, {
    as: "creator",
    foreignKey: "created_by",
  });

  if (models.EmployeeWages) {
    models.Employees.hasOne(models.EmployeeWages, {
      foreignKey: "employee_id",
      as: "wage",
    });
  }
  if (models.EmployeePayrolls) {
    models.Employees.hasOne(models.EmployeePayrolls, {
      foreignKey: "employee_id",
      as: "payroll",
    });
  }
  if (models.EmployeeAddress) {
    models.Employees.hasOne(models.EmployeeAddress, {
      foreignKey: "employee_id",
      as: "address",
    });
  }
};

Employees.addScope(
  "defaultScope",
  {
    attributes: [
      "id",
      "user_id",
      "organisation_id",
      "preferred_name",
      "phone_number",
      "phone_country_code",
      "phone_country_iso",
      "created_at",
      "created_by",
    ],
    include: [
      {
        model: EmployeeAddress,
        as: "address",
        include: [
          {
            model: States,
            as: "state",
          },
        ],
      },
      {
        model: Users,
        as: "user",
        required: false,
        include: [
          {
            model: UserTimezones,
            as: "timezone",
          },
        ],
      },
      {
        model: EmployeeInvitations,
        as: "invitation",
        include: [
          {
            model: InvitationStatus,
            as: "status",
            attributes: ["id", "name", "code"],
          },
          {
            model: OrganisationRoles,
            as: "role",
            attributes: ["id", "name", "code"],
          },
        ],
      },
      {
        model: EmployeeWages,
        as: "wage",
        include: [
          {
            model: PayrollCalendars,
            as: "payroll_calendar",
            include: [
              {
                model: PayCycles,
                as: "pay_cycle",
              },
            ],
          },
          {
            model: EmploymentTypes,
            as: "employment_type",
          },
        ],
      },
      {
        model: EmployeePayrolls,
        as: "payroll",
      },
    ],
  },
  { override: true },
);

Employees.addHook("afterFind", async (result) => {
  await attachOrganisationRoles(result);
});

export default Employees;
