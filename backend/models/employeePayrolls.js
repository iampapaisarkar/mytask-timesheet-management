import { DataTypes } from "sequelize";
import { db } from "../database.js";

const EmployeePayrolls = db.define(
  "EmployeePayrolls",
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
    /** CASH | DIRECT_DEBIT | BANK_TRANSFER */
    payment_method: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "CASH",
    },
    account_holder_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bank_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bank_account_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ifsc_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    swift_code: {
      type: DataTypes.STRING,
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
    tableName: "employee_payrolls",
    timestamps: false,
  },
);

export default EmployeePayrolls;
