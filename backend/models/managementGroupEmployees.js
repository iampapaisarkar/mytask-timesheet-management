import { DataTypes } from "sequelize";
import { db } from "../database.js";

const ManagementGroupEmployees = db.define(
  "ManagementGroupEmployees",
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

    employee_id: {
      type: DataTypes.INTEGER,
    },

    is_manager: {
      type: DataTypes.BOOLEAN,
    },
  },
  {
    tableName: "management_group_employees",
    timestamps: false,
  }
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
ManagementGroupEmployees.associate = (models) => {
  models.ManagementGroupEmployees.belongsTo(models.ManagementGroups, {
    foreignKey: "group_id",
    as: "group",
  });
  models.ManagementGroupEmployees.belongsTo(models.Employees, {
    foreignKey: "employee_id",
    as: "employee",
  });
};

export default ManagementGroupEmployees;
