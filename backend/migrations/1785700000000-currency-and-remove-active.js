import { DataTypes } from "sequelize";

async function hasColumn(queryInterface, tableName, columnName) {
  const def = await queryInterface.describeTable(tableName).catch(() => null);
  return Boolean(def && Object.prototype.hasOwnProperty.call(def, columnName));
}

async function addColumnIfMissing(queryInterface, tableName, columnName, spec) {
  if (!(await hasColumn(queryInterface, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, spec);
  }
}

async function dropColumnIfPresent(queryInterface, tableName, columnName) {
  if (await hasColumn(queryInterface, tableName, columnName)) {
    await queryInterface.removeColumn(tableName, columnName);
  }
}

/**
 * Add wage/pricing currency columns; remove obsolete is_active flags.
 */
export async function up(queryInterface) {
  await addColumnIfMissing(queryInterface, "employee_wages", "currency", {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: "AUD",
  });

  await addColumnIfMissing(queryInterface, "customers", "currency", {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: "AUD",
  });

  await dropColumnIfPresent(queryInterface, "customers", "is_active");
  await dropColumnIfPresent(queryInterface, "jobs", "is_active");
}

export async function down(queryInterface) {
  await dropColumnIfPresent(queryInterface, "employee_wages", "currency");
  await dropColumnIfPresent(queryInterface, "customers", "currency");
  await addColumnIfMissing(queryInterface, "customers", "is_active", {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  });
  await addColumnIfMissing(queryInterface, "jobs", "is_active", {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  });
}
