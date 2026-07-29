import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const ManagementGroupJobs = mysheet.define(
  "ManagementGroupJobs",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    organisation_id: {
      type: DataTypes.INTEGER,
    },
    group_id: {
      type: DataTypes.INTEGER,
    },
    job_id: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "management_group_jobs", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
ManagementGroupJobs.associate = (models) => {
  models.ManagementGroupJobs.belongsTo(models.ManagementGroups, {
    foreignKey: "group_id",
    as: "management_group",
  });
};

export default ManagementGroupJobs;
