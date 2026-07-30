import { DataTypes } from "sequelize";

/**
 * International phone metadata columns for worldwide orgs/employees.
 * phone_number is stored in E.164 (e.g. +14155552671).
 */
export async function up(queryInterface) {
  const stringCol = {
    type: DataTypes.STRING(16),
    allowNull: true,
  };
  const isoCol = {
    type: DataTypes.STRING(2),
    allowNull: true,
  };
  const e164Col = {
    type: DataTypes.STRING(32),
    allowNull: true,
  };

  // users
  await queryInterface.addColumn({ tableName: "users" }, "phone_number", e164Col);
  await queryInterface.addColumn(
    { tableName: "users" },
    "phone_country_code",
    stringCol,
  );
  await queryInterface.addColumn(
    { tableName: "users" },
    "phone_country_iso",
    isoCol,
  );

  // organisations
  await queryInterface.addColumn(
    { tableName: "organisations" },
    "phone_country_code",
    stringCol,
  );
  await queryInterface.addColumn(
    { tableName: "organisations" },
    "phone_country_iso",
    isoCol,
  );
  await queryInterface.addColumn(
    { tableName: "organisations" },
    "default_country",
    isoCol,
  );

  // employees (primary + NOK)
  await queryInterface.addColumn(
    { tableName: "employees" },
    "phone_country_code",
    stringCol,
  );
  await queryInterface.addColumn(
    { tableName: "employees" },
    "phone_country_iso",
    isoCol,
  );
  await queryInterface.addColumn(
    { tableName: "employees" },
    "nok_phone_country_code",
    stringCol,
  );
  await queryInterface.addColumn(
    { tableName: "employees" },
    "nok_phone_country_iso",
    isoCol,
  );

  // customers
  await queryInterface.addColumn(
    { tableName: "customers" },
    "contact_phone_country_code",
    stringCol,
  );
  await queryInterface.addColumn(
    { tableName: "customers" },
    "contact_phone_country_iso",
    isoCol,
  );

  // jobs
  await queryInterface.addColumn(
    { tableName: "jobs" },
    "site_contact_phone_country_code",
    stringCol,
  );
  await queryInterface.addColumn(
    { tableName: "jobs" },
    "site_contact_phone_country_iso",
    isoCol,
  );
}

export async function down(queryInterface) {
  const drops = [
    ["users", "phone_number"],
    ["users", "phone_country_code"],
    ["users", "phone_country_iso"],
    ["organisations", "phone_country_code"],
    ["organisations", "phone_country_iso"],
    ["organisations", "default_country"],
    ["employees", "phone_country_code"],
    ["employees", "phone_country_iso"],
    ["employees", "nok_phone_country_code"],
    ["employees", "nok_phone_country_iso"],
    ["customers", "contact_phone_country_code"],
    ["customers", "contact_phone_country_iso"],
    ["jobs", "site_contact_phone_country_code"],
    ["jobs", "site_contact_phone_country_iso"],
  ];
  for (const [tableName, column] of drops) {
    await queryInterface.removeColumn({ tableName }, column);
  }
}
