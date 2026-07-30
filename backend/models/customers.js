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
    formatted_address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    address_line_1: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    address_line_2: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    street: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    administrative_area: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    state_region_province: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    postal_code: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    country_code: {
      type: DataTypes.STRING(2),
      allowNull: true,
    },
    place_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DECIMAL(17, 14),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(17, 14),
      allowNull: true,
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
    contact_phone_country_code: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    contact_phone_country_iso: {
      type: DataTypes.STRING(2),
      allowNull: true,
    },
    hourly_rate: {
      type: DataTypes.DECIMAL(10, 2),
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "AUD",
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
