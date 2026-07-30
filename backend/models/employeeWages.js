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
    payroll_calendar_id: {
      type: DataTypes.INTEGER,
    },
    employment_type_id: {
      type: DataTypes.INTEGER,
    },
    /** HOURLY | FIXED — mutually exclusive with rate columns */
    pay_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "HOURLY",
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "AUD",
    },
    hourly_rate_exc_super: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    fixed_rate_exc_super: {
      type: DataTypes.DECIMAL(10, 2),
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
    tableName: "employee_wages",
    timestamps: false,
  },
);

EmployeeWages.associate = function (models) {
  models.EmployeeWages.belongsTo(models.PayrollCalendars, {
    foreignKey: "payroll_calendar_id",
    as: "payroll_calendar",
  });

  models.EmployeeWages.belongsTo(models.EmploymentTypes, {
    foreignKey: "employment_type_id",
    as: "employment_type",
  });
};

export default EmployeeWages;
