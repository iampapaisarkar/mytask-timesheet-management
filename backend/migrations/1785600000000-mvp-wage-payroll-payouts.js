import { DataTypes } from "sequelize";

async function hasTable(queryInterface, tableName) {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch {
    return false;
  }
}

async function dropTableIfPresent(queryInterface, tableName) {
  if (await hasTable(queryInterface, tableName)) {
    await queryInterface.dropTable(tableName);
  }
}

async function dropColumnIfPresent(queryInterface, tableName, columnName) {
  const def = await queryInterface.describeTable(tableName).catch(() => null);
  if (def && Object.prototype.hasOwnProperty.call(def, columnName)) {
    await queryInterface.removeColumn(tableName, columnName);
  }
}

async function addColumnIfMissing(queryInterface, tableName, columnName, spec) {
  const def = await queryInterface.describeTable(tableName).catch(() => null);
  if (def && !Object.prototype.hasOwnProperty.call(def, columnName)) {
    await queryInterface.addColumn(tableName, columnName, spec);
  }
}

/**
 * MVP schema: reshape wages/payroll, drop award/earning/NOK, enforce job customer,
 * add payouts.
 */
export async function up(queryInterface) {
  // --- Drop award / earning rule engine (child tables first) ---
  await dropTableIfPresent(queryInterface, "award_rate_rule_then");
  await dropTableIfPresent(queryInterface, "award_rate_rule_ifs");
  await dropTableIfPresent(queryInterface, "award_rate_rule_day_relations");
  await dropTableIfPresent(queryInterface, "award_rate_rules");
  await dropTableIfPresent(queryInterface, "award_rate_settings");
  await dropTableIfPresent(queryInterface, "award_rates");
  await dropTableIfPresent(queryInterface, "award_rate_rule_rates");
  await dropTableIfPresent(queryInterface, "award_rate_rule_fields");
  await dropTableIfPresent(queryInterface, "award_rate_rule_comparators");
  await dropTableIfPresent(queryInterface, "award_rate_rule_days");
  await dropTableIfPresent(queryInterface, "award_rate_rule_field_types");
  await dropTableIfPresent(queryInterface, "earning_rates");
  await dropTableIfPresent(queryInterface, "earning_rate_types");

  // --- Employees: remove NOK + dead award_id ---
  await dropColumnIfPresent(queryInterface, "employees", "nok");
  await dropColumnIfPresent(queryInterface, "employees", "nok_relation_id");
  await dropColumnIfPresent(queryInterface, "employees", "nok_phone_number");
  await dropColumnIfPresent(queryInterface, "employees", "nok_phone_country_code");
  await dropColumnIfPresent(queryInterface, "employees", "nok_phone_country_iso");
  await dropColumnIfPresent(queryInterface, "employees", "award_id");
  await dropTableIfPresent(queryInterface, "nok_relations");

  // --- employee_wages reshape ---
  await dropColumnIfPresent(queryInterface, "employee_wages", "employment_status_id");
  await dropColumnIfPresent(
    queryInterface,
    "employee_wages",
    "timesheet_submission_frequency",
  );
  await dropColumnIfPresent(queryInterface, "employee_wages", "award_rate_id");
  await addColumnIfMissing(queryInterface, "employee_wages", "pay_type", {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "HOURLY",
  });
  await addColumnIfMissing(
    queryInterface,
    "employee_wages",
    "fixed_rate_exc_super",
    {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  );
  // hourly becomes nullable for FIXED employees
  try {
    await queryInterface.changeColumn("employee_wages", "hourly_rate_exc_super", {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    });
  } catch {
    /* ignore if already nullable */
  }

  // --- employee_payrolls reshape ---
  await dropColumnIfPresent(queryInterface, "employee_payrolls", "tax_file_number");
  await dropColumnIfPresent(queryInterface, "employee_payrolls", "superannuation_fund");
  await dropColumnIfPresent(
    queryInterface,
    "employee_payrolls",
    "superannuation_member_number",
  );
  await dropColumnIfPresent(queryInterface, "employee_payrolls", "bank_bsb");
  await dropColumnIfPresent(queryInterface, "employee_payrolls", "bank_account_name");
  await dropColumnIfPresent(queryInterface, "employee_payrolls", "bank_statement_text");

  await addColumnIfMissing(queryInterface, "employee_payrolls", "payment_method", {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "CASH",
  });
  await addColumnIfMissing(
    queryInterface,
    "employee_payrolls",
    "account_holder_name",
    { type: DataTypes.STRING, allowNull: true },
  );
  await addColumnIfMissing(queryInterface, "employee_payrolls", "bank_name", {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "employee_payrolls", "ifsc_code", {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "employee_payrolls", "swift_code", {
    type: DataTypes.STRING,
    allowNull: true,
  });
  // bank_account_number already exists — keep it

  // --- jobs.customer_id required ---
  if (await hasTable(queryInterface, "jobs")) {
    await queryInterface.sequelize.query(
      "UPDATE jobs SET customer_id = (SELECT id FROM customers WHERE customers.organisation_id = jobs.organisation_id LIMIT 1) WHERE customer_id IS NULL",
    ).catch(() => undefined);
    try {
      await queryInterface.changeColumn("jobs", "customer_id", {
        type: DataTypes.INTEGER,
        allowNull: false,
      });
    } catch {
      /* may fail if orphans remain */
    }
  }

  // --- payouts ---
  if (!(await hasTable(queryInterface, "payouts"))) {
    await queryInterface.createTable("payouts", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      organisation_id: { type: DataTypes.INTEGER, allowNull: false },
      employee_id: { type: DataTypes.INTEGER, allowNull: false },
      timesheet_id: { type: DataTypes.INTEGER, allowNull: false },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "ELIGIBLE",
      },
      payment_method: { type: DataTypes.STRING, allowNull: true },
      paid_at: { type: DataTypes.DATE, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE },
      created_by: { type: DataTypes.INTEGER },
      updated_at: { type: DataTypes.DATE },
      updated_by: { type: DataTypes.INTEGER },
    });
  }
}

export async function down() {
  // Irreversible MVP cleanup — restore from backup if needed.
}
