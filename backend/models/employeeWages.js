import { DataTypes } from "sequelize";
import { db } from "../database.js";

const EmployeeWages = db.define(
  "EmployeeWages",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    organisation_id: {
      type: DataTypes.INTEGER,
    },
    employee_id: {
      type: DataTypes.INTEGER,
    },
    start_date: {
      type: DataTypes.DATEONLY,
    },
    employment_status_id: {
      type: DataTypes.INTEGER,
    },
    payroll_calendar_id: {
      type: DataTypes.INTEGER,
    },
    employment_type_id: {
      type: DataTypes.INTEGER,
    },
    hourly_rate_exc_super: {
      type: DataTypes.DECIMAL(10, 2),
    },
    award_rate_id: {
      type: DataTypes.INTEGER,
    },
    timesheet_submission_frequency: {
      type: DataTypes.STRING,
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
    tableName: "employee_wages", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

// ----------------------------------------------------------------------
// Associations
// ----------------------------------------------------------------------
EmployeeWages.associate = function (models) {
  models.EmployeeWages.belongsTo(models.PayrollCalendars, {
    foreignKey: "payroll_calendar_id",
    as: "payroll_calendar",
  });

  models.EmployeeWages.belongsTo(models.EmploymentStatus, {
    foreignKey: "employment_status_id",
    as: "employment_status",
  });

  models.EmployeeWages.belongsTo(models.EmploymentTypes, {
    foreignKey: "employment_type_id",
    as: "employment_type",
  });

  models.EmployeeWages.belongsTo(models.AwardRates, {
    foreignKey: "award_rate_id",
    as: "award_rate",
  });
};

export default EmployeeWages;
