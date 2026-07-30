import { DataTypes } from "sequelize";

export async function up(queryInterface) {
  const sequelize = queryInterface.sequelize;
  const desc = await queryInterface.describeTable("payouts");

  const addIfMissing = async (column, definition) => {
    if (!desc[column]) {
      await queryInterface.addColumn("payouts", column, definition);
    }
  };

  await addIfMissing("payout_number", {
    type: DataTypes.STRING(64),
    allowNull: true,
  });
  await addIfMissing("pay_date", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });
  await addIfMissing("period_start_date", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });
  await addIfMissing("period_end_date", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });
  await addIfMissing("currency", {
    type: DataTypes.STRING(8),
    allowNull: true,
  });
  await addIfMissing("worked_hours", {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  });
  await addIfMissing("regular_hours", {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  });
  await addIfMissing("overtime_hours", {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  });
  await addIfMissing("hourly_rate", {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: true,
  });
  await addIfMissing("gross_amount", {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  });
  await addIfMissing("deductions", {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  });
  await addIfMissing("bonuses", {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  });
  await addIfMissing("adjustments", {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  });
  await addIfMissing("tax_amount", {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  });
  await addIfMissing("net_amount", {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  });
  await addIfMissing("approved_by", {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
  await addIfMissing("approved_at", {
    type: DataTypes.DATE,
    allowNull: true,
  });

  // Legacy status map
  await sequelize.query(`
    UPDATE payouts SET status = 'READY_FOR_PAYOUT' WHERE status = 'ELIGIBLE'
  `);
  await sequelize.query(`
    UPDATE payouts SET status = 'CANCELLED' WHERE status = 'VOID'
  `);
  await sequelize.query(`
    UPDATE payouts
    SET
      gross_amount = COALESCE(gross_amount, amount),
      net_amount = COALESCE(net_amount, amount),
      payout_number = COALESCE(payout_number, CONCAT('PO-', LPAD(id, 6, '0')))
    WHERE gross_amount IS NULL OR net_amount IS NULL OR payout_number IS NULL
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS payout_events (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      organisation_id INT NOT NULL,
      payout_id INT NOT NULL,
      action VARCHAR(64) NOT NULL,
      previous_status VARCHAR(64) NULL,
      new_status VARCHAR(64) NULL,
      previous_value TEXT NULL,
      new_value TEXT NULL,
      notes TEXT NULL,
      created_at DATETIME NOT NULL,
      created_by INT NULL,
      INDEX idx_payout_events_payout (payout_id),
      INDEX idx_payout_events_org (organisation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // One active (non-cancelled) payout per timesheet — NULLs allowed for cancelled
  try {
    const descAfter = await queryInterface.describeTable("payouts");
    if (!descAfter.active_timesheet_key) {
      await sequelize.query(`
        ALTER TABLE payouts
        ADD COLUMN active_timesheet_key INT
        GENERATED ALWAYS AS (
          CASE WHEN UPPER(status) = 'CANCELLED' THEN NULL ELSE timesheet_id END
        ) STORED
      `);
    }
  } catch {
    // column may already exist
  }
  try {
    await sequelize.query(`
      CREATE UNIQUE INDEX payouts_org_active_timesheet_uidx
      ON payouts (organisation_id, active_timesheet_key)
    `);
  } catch {
    // index may already exist or duplicates prevent creation
  }
  try {
    await sequelize.query(`
      CREATE INDEX payouts_org_status_idx ON payouts (organisation_id, status)
    `);
  } catch {
    // index may already exist
  }
  try {
    await sequelize.query(`
      CREATE INDEX payouts_org_employee_idx ON payouts (organisation_id, employee_id)
    `);
  } catch {
    // index may already exist
  }
}

export async function down(queryInterface) {
  const sequelize = queryInterface.sequelize;

  await sequelize.query(`DROP TABLE IF EXISTS payout_events`);

  try {
    await sequelize.query(
      `DROP INDEX payouts_org_active_timesheet_uidx ON payouts`,
    );
  } catch {
    // ignore
  }

  const cols = [
    "active_timesheet_key",
    "payout_number",
    "pay_date",
    "period_start_date",
    "period_end_date",
    "currency",
    "worked_hours",
    "regular_hours",
    "overtime_hours",
    "hourly_rate",
    "gross_amount",
    "deductions",
    "bonuses",
    "adjustments",
    "tax_amount",
    "net_amount",
    "approved_by",
    "approved_at",
  ];
  const desc = await queryInterface.describeTable("payouts");
  for (const col of cols) {
    if (desc[col]) {
      try {
        await queryInterface.removeColumn("payouts", col);
      } catch {
        // generated columns may need raw DROP
        await sequelize
          .query(`ALTER TABLE payouts DROP COLUMN ${col}`)
          .catch(() => {});
      }
    }
  }
}
