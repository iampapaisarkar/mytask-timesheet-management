import { DataTypes } from "sequelize";
import { db } from "../database.js";

const EmployeeAddress = db.define(
  "EmployeeAddress",
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
    address_1: {
      type: DataTypes.TEXT,
    },
    address_2: {
      type: DataTypes.TEXT,
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
    city: {
      type: DataTypes.STRING,
    },
    state_id: {
      type: DataTypes.INTEGER,
    },
    postcode: {
      type: DataTypes.STRING(32),
    },
    postal_code: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    state_region_province: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    formatted_address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    administrative_area: {
      type: DataTypes.STRING(255),
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
    },
    longitude: {
      type: DataTypes.DECIMAL(17, 14),
    },
  },
  {
    tableName: "employee_address", // Table name should be in lowercase and plural
    timestamps: false,
  },
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
EmployeeAddress.associate = (models) => {
  EmployeeAddress.belongsTo(models.States, {
    foreignKey: "state_id",
    as: "state",
  });
};

export default EmployeeAddress;
