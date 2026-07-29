import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const EmployeePayrolls = mysheet.define(
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
    tax_file_number: {
      type: DataTypes.STRING,
    },
    superannuation_fund: {
      type: DataTypes.STRING,
    },
    superannuation_member_number: {
      type: DataTypes.STRING,
    },
    bank_bsb: {
      type: DataTypes.STRING,
    },
    bank_account_number: {
      type: DataTypes.STRING,
    },
    bank_account_name: {
      type: DataTypes.STRING,
    },
    bank_statement_text: {
      type: DataTypes.TEXT,
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
    tableName: "employee_payrolls", // Table name should be in lowercase and plural
    timestamps: false,
  },
);

export default EmployeePayrolls;
