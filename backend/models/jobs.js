import { DataTypes } from "sequelize";
import { db } from "../database.js";
import Customers from "./customers.js";
import ManagementGroups from "./managementGroups.js";
import ManagementGroupJobs from "./managementGroupJobs.js";
import ManagementGroupEmployees from "./managementGroupEmployees.js";
import Employees from "./employees.js";
import Users from "./users.js";
import JobAddress from "./jobAddress.js";
import States from "./states.js";

const Jobs = db.define(
  "withEmployee",
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
    customer_id: {
      type: DataTypes.INTEGER,
    },
    radius: {
      type: DataTypes.INTEGER,
    },
    site_contact_name: {
      type: DataTypes.STRING,
    },
    site_contact_email: {
      type: DataTypes.STRING,
    },
    site_contact_phone_number: {
      type: DataTypes.STRING,
    },
    site_contact_phone_country_code: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    site_contact_phone_country_iso: {
      type: DataTypes.STRING(2),
      allowNull: true,
    },
    is_active: {
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
  },
  {
    tableName: "jobs", // Table name should be in lowercase and plural
    timestamps: false,
  },
);

// Override toJSON
Jobs.prototype.toJSON = function () {
  const full = this.get({ plain: true });

  const { management_group_jobs, ...rest } = full;

  let management_groups = [];

  let mgroups = management_group_jobs || [];

  for (const mgroup of mgroups) {
    if (mgroup?.management_group) {
      management_groups.push(mgroup?.management_group);
    }
  }

  return {
    ...rest,
    management_groups: management_groups,
  };
};

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
Jobs.associate = (models) => {
  Jobs.belongsTo(models.Customers, {
    foreignKey: "customer_id",
    as: "customer",
  });

  Jobs.hasMany(models.ManagementGroupJobs, {
    foreignKey: "job_id",
    as: "management_group_jobs",
  });

  Jobs.hasOne(models.JobAddress, {
    foreignKey: "job_id",
    as: "address",
  });
};

// ----------------------------------------------------------------------
// Default Scope: only includes associations, root-level attributes go inside details
// ----------------------------------------------------------------------
Jobs.addScope("withEmployee", (employeeCondition) => ({
  subQuery: false,
  include: [
    {
      model: JobAddress,
      as: "address",
      // attributes: ["id", "name"],
      include: [
        {
          model: States,
          as: "state",
          // attributes: ["id", "name"],
        },
      ],
    },
    {
      model: Customers,
      as: "customer",
      attributes: ["id", "name"],
    },
    {
      model: ManagementGroupJobs,
      as: "management_group_jobs",
      // attributes: ["job_id", "group_id"],
      required: true,
      include: [
        {
          model: ManagementGroups,
          as: "management_group",
          required: true,
          include: [
            {
              model: ManagementGroupEmployees,
              as: "employees",
              where: employeeCondition,
              required: true,
              include: [
                {
                  model: Employees.unscoped(),
                  as: "employee",
                  include: [
                    {
                      model: Users,
                      as: "user",
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

export default Jobs;
