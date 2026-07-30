import { DataTypes } from "sequelize";
import { db } from "../database.js";
import Customers from "./customers.js";
import JobAddress from "./jobAddress.js";
import States from "./states.js";

const Jobs = db.define(
  "Jobs",
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
    tableName: "jobs",
    timestamps: false,
  },
);

Jobs.prototype.toJSON = function () {
  return this.get({ plain: true });
};

Jobs.associate = (models) => {
  Jobs.belongsTo(models.Customers, {
    foreignKey: "customer_id",
    as: "customer",
  });

  Jobs.hasOne(models.JobAddress, {
    foreignKey: "job_id",
    as: "address",
  });
};

/**
 * Org-scoped job list with address + customer.
 * Previously filtered via management groups; now organisation-wide.
 * `employeeCondition` is ignored (kept for call-site compatibility).
 */
Jobs.addScope("withEmployee", (_employeeCondition) => ({
  subQuery: false,
  include: [
    {
      model: JobAddress,
      as: "address",
      include: [
        {
          model: States,
          as: "state",
        },
      ],
    },
    {
      model: Customers,
      as: "customer",
      attributes: ["id", "name"],
    },
  ],
}));

export default Jobs;
