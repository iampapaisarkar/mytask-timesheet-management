import { DataTypes } from "sequelize";

const ADDRESS_TABLES = [
  "organisation_address",
  "employee_address",
  "job_address",
];

async function describe(queryInterface, table) {
  try {
    return await queryInterface.describeTable(table);
  } catch {
    return null;
  }
}

async function addIfMissing(queryInterface, table, column, spec) {
  const def = await describe(queryInterface, table);
  if (def && !Object.prototype.hasOwnProperty.call(def, column)) {
    await queryInterface.addColumn(table, column, spec);
  }
}

/**
 * Normalize global address columns across address child tables + customers.
 * Keeps legacy columns (address_1, administrative_area, postcode) populated via backfill.
 */
export async function up(queryInterface) {
  for (const table of ADDRESS_TABLES) {
    await addIfMissing(queryInterface, table, "address_line_1", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await addIfMissing(queryInterface, table, "address_line_2", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await addIfMissing(queryInterface, table, "street", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await addIfMissing(queryInterface, table, "state_region_province", {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
    await addIfMissing(queryInterface, table, "postal_code", {
      type: DataTypes.STRING(32),
      allowNull: true,
    });

    // Backfill from legacy columns
    await queryInterface.sequelize
      .query(
        `UPDATE \`${table}\` SET
          address_line_1 = COALESCE(NULLIF(address_line_1, ''), address_1),
          address_line_2 = COALESCE(NULLIF(address_line_2, ''), address_2),
          street = COALESCE(NULLIF(street, ''), address_1),
          state_region_province = COALESCE(NULLIF(state_region_province, ''), administrative_area),
          postal_code = COALESCE(NULLIF(postal_code, ''), postcode)
        `,
      )
      .catch(() => undefined);
  }

  // customers table (embedded address)
  await addIfMissing(queryInterface, "customers", "address_line_1", {
    type: DataTypes.TEXT,
    allowNull: true,
  });
  await addIfMissing(queryInterface, "customers", "address_line_2", {
    type: DataTypes.TEXT,
    allowNull: true,
  });
  await addIfMissing(queryInterface, "customers", "street", {
    type: DataTypes.TEXT,
    allowNull: true,
  });
  await addIfMissing(queryInterface, "customers", "state_region_province", {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  await queryInterface.sequelize
    .query(
      `UPDATE customers SET
        address_line_1 = COALESCE(NULLIF(address_line_1, ''), formatted_address, address),
        street = COALESCE(NULLIF(street, ''), address_line_1, formatted_address, address),
        state_region_province = COALESCE(NULLIF(state_region_province, ''), administrative_area)
      `,
    )
    .catch(() => undefined);
}

export async function down(queryInterface) {
  for (const table of ADDRESS_TABLES) {
    for (const col of [
      "address_line_1",
      "street",
      "state_region_province",
      "postal_code",
    ]) {
      const def = await describe(queryInterface, table);
      if (def && Object.prototype.hasOwnProperty.call(def, col)) {
        await queryInterface.removeColumn(table, col);
      }
    }
  }
  for (const col of [
    "address_line_1",
    "address_line_2",
    "street",
    "state_region_province",
  ]) {
    const def = await describe(queryInterface, "customers");
    if (def && Object.prototype.hasOwnProperty.call(def, col)) {
      await queryInterface.removeColumn("customers", col);
    }
  }
}
