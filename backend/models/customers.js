import { DataTypes } from "sequelize";
import { db } from "../database.js";

const Customers = db.define(
  "Customers",
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
    address: {
      type: DataTypes.TEXT,
    },
    abn: {
      type: DataTypes.STRING,
    },
    contact_name: {
      type: DataTypes.STRING,
    },
    contact_email: {
      type: DataTypes.STRING,
    },
    contact_phone_number: {
      type: DataTypes.STRING,
    },
    hourly_rate: {
      type: DataTypes.DECIMAL(10, 2),
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
    tableName: "customers", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default Customers;
