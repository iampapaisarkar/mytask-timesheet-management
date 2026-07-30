import { DataTypes } from "sequelize";
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

  models.Employees.belongsTo(models.EmployeeInvitations, {
    as: "invitation",
    foreignKey: "id",
    targetKey: "employee_id",
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
            model: UserOrganisationRoles,
            as: "user_organisations_role",
            attributes: ["id", "user_id", "role_id"],
            include: [
              {
                model: OrganisationRoles,
                as: "role",
                attributes: ["id", "name", "code"],
              },
            ],
          },
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

export default Employees;
