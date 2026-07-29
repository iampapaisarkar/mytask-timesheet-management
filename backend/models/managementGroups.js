import { DataTypes } from "sequelize";
import { db } from "../database.js";
import ManagementGroupEmployees from "./managementGroupEmployees.js";
import Users from "./users.js";
import Employees from "./employees.js";
import UserOrganisationRoles from "./userOrganisationRoles.js";
import OrganisationRoles from "./organisationRoles.js";

const ManagementGroups = db.define(
  "ManagementGroups",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    organisation_id: {
      type: DataTypes.INTEGER,
    },

    name: {
      type: DataTypes.STRING,
    },
    default: {
      type: DataTypes.BOOLEAN,
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
    group_managers: {
      type: DataTypes.VIRTUAL,
      get() {
        const employees = this.getDataValue("employees");
        let group_managers = null;
        if (employees && employees?.length) {
          group_managers = employees
            .filter((x) => x.is_manager === true)
            .filter((x) => x.employee && x.employee.user_id !== null)
            .map((x) => {
              const emp = x.employee;
              const empJson = emp.toJSON();

              return {
                ...empJson?.details,
              };
            });
        }

        return group_managers;
      },
    },
    group_staffs: {
      type: DataTypes.VIRTUAL,
      get() {
        const employees = this.getDataValue("employees");
        let group_staffs = null;
        if (employees && employees?.length) {
          group_staffs = employees
            .filter((x) => x.is_manager === false)
            .filter((x) => x.employee && x.employee.user_id !== null)
            .map((x) => {
              const emp = x.employee;
              const empJson = emp.toJSON();

              return {
                ...empJson?.details,
              };
            });
        }

        return group_staffs;
      },
    },
  },
  {
    tableName: "management_groups",
    timestamps: false,
  },
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
ManagementGroups.associate = (models) => {
  models.ManagementGroups.hasMany(models.ManagementGroupEmployees, {
    foreignKey: "group_id",
    as: "employees",
  });
  models.ManagementGroups.hasMany(models.ManagementGroupJobs, {
    foreignKey: "group_id",
    as: "management_group_jobs",
  });
  models.ManagementGroupEmployees.hasMany(models.ManagementGroupEmployees, {
    foreignKey: "group_id",
    as: "group_employees",
  });
};

// ----------------------------------------------------------------------
// Default Scope: only includes associations, root-level attributes go inside details
// ----------------------------------------------------------------------
ManagementGroups.addScope("withEmployee", (whereCondition) => ({
  where: whereCondition,
  include: [
    {
      model: ManagementGroupEmployees,
      as: "employees",
      attributes: ["is_manager", "employee_id"],
      required: false,
      include: [
        {
          model: Employees.unscoped(),
          as: "employee",
          include: [
            {
              model: Users,
              as: "user",
              include: [
                {
                  model: UserOrganisationRoles,
                  as: "user_organisations_role",
                  include: [
                    {
                      model: OrganisationRoles,
                      as: "role",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}));

export default ManagementGroups;
