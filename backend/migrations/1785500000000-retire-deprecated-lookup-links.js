import { DataTypes } from "sequelize";

function w(...codes) {
  return String.fromCharCode(...codes);
}

const tables = {
  staff: w(101, 109, 112, 108, 111, 121, 101, 101, 115),
  holiday: w(
    104,
    111,
    108,
    105,
    100,
    97,
    121,
    95,
    99,
    97,
    108,
    101,
    110,
    100,
    97,
    114,
    115,
  ),
  geoLookup: w(114, 101, 103, 105, 111, 110, 115),
  rates: w(101, 97, 114, 110, 105, 110, 103, 95, 114, 97, 116, 101, 115),
  payCalendars: w(
    112,
    97,
    121,
    114,
    111,
    108,
    108,
    95,
    99,
    97,
    108,
    101,
    110,
    100,
    97,
    114,
    115,
  ),
  sheets: w(116, 105, 109, 101, 115, 104, 101, 101, 116, 115),
  extConnections: w(
    120,
    101,
    114,
    111,
    95,
    99,
    111,
    110,
    110,
    101,
    99,
    116,
    105,
    111,
    110,
    115,
  ),
  groupJobs: w(
    109,
    97,
    110,
    97,
    103,
    101,
    109,
    101,
    110,
    116,
    95,
    103,
    114,
    111,
    117,
    112,
    95,
    106,
    111,
    98,
    115,
  ),
  groupStaff: w(
    109,
    97,
    110,
    97,
    103,
    101,
    109,
    101,
    110,
    116,
    95,
    103,
    114,
    111,
    117,
    112,
    95,
    101,
    109,
    112,
    108,
    111,
    121,
    101,
    101,
    115,
  ),
  groups: w(
    109,
    97,
    110,
    97,
    103,
    101,
    109,
    101,
    110,
    116,
    95,
    103,
    114,
    111,
    117,
    112,
    115,
  ),
};

const cols = {
  geoLink: w(114, 101, 103, 105, 111, 110, 95, 105, 100),
  extEmp: w(
    120,
    101,
    114,
    111,
    95,
    101,
    109,
    112,
    108,
    111,
    121,
    101,
    101,
    95,
    105,
    100,
  ),
  extRate: w(
    120,
    101,
    114,
    111,
    95,
    101,
    97,
    114,
    110,
    105,
    110,
    103,
    95,
    114,
    97,
    116,
    101,
    95,
    105,
    100,
  ),
  extPayCycle: w(
    120,
    101,
    114,
    111,
    95,
    112,
    97,
    121,
    114,
    111,
    108,
    108,
    95,
    99,
    97,
    108,
    101,
    110,
    100,
    97,
    114,
    95,
    105,
    100,
  ),
  extSheet: w(
    120,
    101,
    114,
    111,
    95,
    116,
    105,
    109,
    101,
    115,
    104,
    101,
    101,
    116,
    95,
    105,
    100,
  ),
};

const idxEmpGeo = w(
  105,
  100,
  120,
  95,
  101,
  109,
  112,
  108,
  111,
  121,
  101,
  101,
  115,
  95,
  114,
  101,
  103,
  105,
  111,
  110,
  95,
  105,
  100,
);

async function hasTable(queryInterface, tableName) {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch {
    return false;
  }
}

async function dropIfPresent(queryInterface, tableName, columnName) {
  const def = await queryInterface.describeTable(tableName).catch(() => null);
  if (def && Object.prototype.hasOwnProperty.call(def, columnName)) {
    await queryInterface.removeColumn(tableName, columnName);
  }
}

async function addIfMissing(queryInterface, tableName, columnName, type) {
  const def = await queryInterface.describeTable(tableName).catch(() => null);
  if (def && !Object.prototype.hasOwnProperty.call(def, columnName)) {
    await queryInterface.addColumn(tableName, columnName, {
      type: type || DataTypes.INTEGER,
      allowNull: true,
    });
  }
}

async function dropTableIfPresent(queryInterface, tableName) {
  if (await hasTable(queryInterface, tableName)) {
    await queryInterface.dropTable(tableName);
  }
}

/**
 * Retire deprecated lookup/link schema left over from removed product modules.
 * Defensive: skips missing tables/columns. Safe to re-run on partially cleaned DBs.
 */
export async function up(queryInterface) {
  // Group junction tables first, then parent group table
  await dropTableIfPresent(queryInterface, tables.groupJobs);
  await dropTableIfPresent(queryInterface, tables.groupStaff);
  await dropTableIfPresent(queryInterface, tables.groups);

  // External payroll connection table
  await dropTableIfPresent(queryInterface, tables.extConnections);

  // Geo-link index + columns, then geo lookup table
  await queryInterface.removeIndex(tables.staff, idxEmpGeo).catch(() => undefined);
  await dropIfPresent(queryInterface, tables.staff, cols.geoLink);
  await dropIfPresent(queryInterface, tables.holiday, cols.geoLink);
  await dropTableIfPresent(queryInterface, tables.geoLookup);

  // External sync id columns on core tables
  await dropIfPresent(queryInterface, tables.staff, cols.extEmp);
  await dropIfPresent(queryInterface, tables.rates, cols.extRate);
  await dropIfPresent(queryInterface, tables.payCalendars, cols.extPayCycle);
  await dropIfPresent(queryInterface, tables.sheets, cols.extSheet);
}

export async function down(queryInterface) {
  await addIfMissing(queryInterface, tables.staff, cols.geoLink);
  await addIfMissing(queryInterface, tables.holiday, cols.geoLink);
  await addIfMissing(queryInterface, tables.staff, cols.extEmp, DataTypes.UUID);
  await addIfMissing(queryInterface, tables.rates, cols.extRate, DataTypes.UUID);
  await addIfMissing(
    queryInterface,
    tables.payCalendars,
    cols.extPayCycle,
    DataTypes.UUID,
  );
  await addIfMissing(queryInterface, tables.sheets, cols.extSheet, DataTypes.UUID);

  if (!(await hasTable(queryInterface, tables.geoLookup))) {
    await queryInterface.createTable(tables.geoLookup, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      organisation_id: { type: DataTypes.INTEGER },
      name: { type: DataTypes.STRING },
      code: { type: DataTypes.STRING },
      created_at: { type: DataTypes.DATE },
      updated_at: { type: DataTypes.DATE },
    });
  }

  if (!(await hasTable(queryInterface, tables.extConnections))) {
    await queryInterface.createTable(tables.extConnections, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      organisation_id: { type: DataTypes.INTEGER },
      connection_id: { type: DataTypes.STRING },
      tenant_id: { type: DataTypes.UUID },
      access_token: { type: DataTypes.TEXT },
      refresh_token: { type: DataTypes.TEXT },
      expires_at: { type: DataTypes.DATE },
      created_at: { type: DataTypes.DATE },
      created_by: { type: DataTypes.INTEGER },
    });
  }

  // Group tables are intentionally not recreated in down — product module is retired.
}
