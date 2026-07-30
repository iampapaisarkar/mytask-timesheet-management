import { DataTypes } from "sequelize";

/**
 * Global address metadata from Google Places (all countries).
 * Keeps existing address_1/city/postcode/state_id for compatibility.
 */
async function addGlobalAddressColumns(queryInterface, tableName) {
  const cols = [
    ["formatted_address", { type: DataTypes.TEXT, allowNull: true }],
    ["administrative_area", { type: DataTypes.STRING(255), allowNull: true }],
    ["country", { type: DataTypes.STRING(128), allowNull: true }],
    ["country_code", { type: DataTypes.STRING(2), allowNull: true }],
    ["place_id", { type: DataTypes.STRING(255), allowNull: true }],
  ];
  for (const [name, def] of cols) {
    await queryInterface.addColumn({ tableName }, name, def);
  }
}

async function dropGlobalAddressColumns(queryInterface, tableName) {
  for (const name of [
    "formatted_address",
    "administrative_area",
    "country",
    "country_code",
    "place_id",
  ]) {
    await queryInterface.removeColumn({ tableName }, name);
  }
}

export async function up(queryInterface) {
  await addGlobalAddressColumns(queryInterface, "organisation_address");
  await addGlobalAddressColumns(queryInterface, "employee_address");
  await addGlobalAddressColumns(queryInterface, "job_address");

  // Customers: structured Place fields alongside free-text `address`
  await queryInterface.addColumn(
    { tableName: "customers" },
    "formatted_address",
    { type: DataTypes.TEXT, allowNull: true },
  );
  await queryInterface.addColumn(
    { tableName: "customers" },
    "administrative_area",
    { type: DataTypes.STRING(255), allowNull: true },
  );
  await queryInterface.addColumn(
    { tableName: "customers" },
    "city",
    { type: DataTypes.STRING(255), allowNull: true },
  );
  await queryInterface.addColumn(
    { tableName: "customers" },
    "postal_code",
    { type: DataTypes.STRING(32), allowNull: true },
  );
  await queryInterface.addColumn(
    { tableName: "customers" },
    "country",
    { type: DataTypes.STRING(128), allowNull: true },
  );
  await queryInterface.addColumn(
    { tableName: "customers" },
    "country_code",
    { type: DataTypes.STRING(2), allowNull: true },
  );
  await queryInterface.addColumn(
    { tableName: "customers" },
    "place_id",
    { type: DataTypes.STRING(255), allowNull: true },
  );
  await queryInterface.addColumn(
    { tableName: "customers" },
    "latitude",
    { type: DataTypes.DECIMAL(17, 14), allowNull: true },
  );
  await queryInterface.addColumn(
    { tableName: "customers" },
    "longitude",
    { type: DataTypes.DECIMAL(17, 14), allowNull: true },
  );
}

export async function down(queryInterface) {
  await dropGlobalAddressColumns(queryInterface, "organisation_address");
  await dropGlobalAddressColumns(queryInterface, "employee_address");
  await dropGlobalAddressColumns(queryInterface, "job_address");

  for (const col of [
    "formatted_address",
    "administrative_area",
    "city",
    "postal_code",
    "country",
    "country_code",
    "place_id",
    "latitude",
    "longitude",
  ]) {
    await queryInterface.removeColumn({ tableName: "customers" }, col);
  }
}
