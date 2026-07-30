import { DataTypes } from "sequelize";
import { db } from "../database.js";
import Regions from "./regions.js";
import Users from "./users.js";
import NokRelations from "./nokRelations.js";
import UserOrganisationRoles from "./userOrganisationRoles.js";
import OrganisationRoles from "./organisationRoles.js";
import EmployeeInvitations from "./employeeInvitations.js";
import InvitationStatus from "./invitationStatus.js";
import EmployeeWages from "./employeeWages.js";
import EmploymentStatus from "./employmentStatus.js";
import EmploymentTypes from "./employmentTypes.js";
import PayrollCalendars from "./payrollCalendars.js";
import PayCycles from "./payCycles.js";
import AwardRates from "./awardRates.js";
import EmployeePayrolls from "./employeePayrolls.js";
import ManagementGroupEmployees from "./managementGroupEmployees.js";
import ManagementGroups from "./managementGroups.js";
import UserTimezones from "./userTimezones.js";
import HolidayCalendars from "./holidayCalendars.js";
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
    nok: {
      type: DataTypes.STRING,
    },
    nok_relation_id: {
      type: DataTypes.INTEGER,
    },
    nok_phone_number: {
      type: DataTypes.STRING,
    },
    nok_phone_country_code: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    nok_phone_country_iso: {
      type: DataTypes.STRING(2),
      allowNull: true,
    },
    award_id: {
      type: DataTypes.INTEGER,
    },
    region_id: {
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
    xero_employee_id: {
      type: DataTypes.UUID,
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

// Override toJSON
Employees.prototype.toJSON = function () {
  const full = this.get({ plain: true });

  // Extract management_group, wage, payroll and details
  const { management_group_employees, wage, payroll, ...rest } = full;

  let management_group = {
    manager_of_groups: [],
    staff_of_group: null,
  };

  const mgEmployees = management_group_employees || [];

  for (const employeeGroup of mgEmployees) {
    if (employeeGroup.is_manager) {
      management_group.manager_of_groups.push(employeeGroup.group);
    } else {
      management_group.staff_of_group = employeeGroup.group;
    }
  }

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
    management_group: management_group || null,
    push_to_xero: true,
  };
};

// ----------------------------------------------------------------------
// Associations
// ----------------------------------------------------------------------
Employees.associate = function (models) {
  models.Employees.belongsTo(models.Regions, {
    as: "region",
    foreignKey: "region_id",
  });

  models.Employees.belongsTo(models.NokRelations, {
    as: "nok_relationship",
    foreignKey: "nok_relation_id",
  });

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

  models.Employees.hasMany(models.ManagementGroupEmployees, {
    as: "management_group_employees",
    foreignKey: "employee_id",
  });

  models.Employees.belongsTo(models.Regions, {
    as: "regions",
    foreignKey: "region_id",
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

// ----------------------------------------------------------------------
// Default Scope: only includes associations, root-level attributes go inside details
// ----------------------------------------------------------------------
Employees.addScope(
  "defaultScope",
  {
    attributes: [
      "id",
      "user_id",
      "organisation_id",
      "nok",
      "nok_relation_id",
      "nok_phone_number",
      "nok_phone_country_code",
      "nok_phone_country_iso",
      "award_id",
      "region_id",
      "preferred_name",
      "phone_number",
      "phone_country_code",
      "phone_country_iso",
      "xero_employee_id",
      "created_at",
      "created_by",
      // [mysheet.col("user.name"), "name"],
      // [
      //   mysheet.literal("COALESCE(`user`.`email`, `invitation`.`email`)"),
      //   "email",
      // ],
    ],
    include: [
      {
        model: Regions,
        as: "region",
        attributes: ["id", "name", "code"],
        include: [
          {
            model: HolidayCalendars,
            as: "holidays",
          },
        ],
      },
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
        model: NokRelations,
        as: "nok_relationship",
        attributes: ["id", "name"],
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
        model: ManagementGroupEmployees,
        as: "management_group_employees",
        include: [
          {
            model: ManagementGroups,
            as: "group",
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
            model: EmploymentStatus,
            as: "employment_status",
          },
          {
            model: EmploymentTypes,
            as: "employment_type",
          },
          {
            model: AwardRates,
            as: "award_rate",
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
