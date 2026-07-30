import { DataTypes } from "sequelize";

async function describe(queryInterface, table) {
  try {
    return await queryInterface.describeTable(table);
  } catch {
    return null;
  }
}

async function indexExists(queryInterface, table, name) {
  try {
    const indexes = await queryInterface.showIndex(table);
    return indexes.some((idx) => idx.name === name);
  } catch {
    return false;
  }
}

/**
 * Timesheet ↔ Jobs many-to-many.
 * One timesheet (employee + period) can include multiple jobs.
 * The same job can appear on many employees' timesheets.
 * Migrates legacy timesheets.job_id into timesheet_jobs.
 */
export async function up(queryInterface) {
  const existing = await describe(queryInterface, "timesheet_jobs");
  if (!existing) {
    await queryInterface.createTable("timesheet_jobs", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      organisation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      timesheet_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      job_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    });
  }

  if (
    !(await indexExists(
      queryInterface,
      "timesheet_jobs",
      "timesheet_jobs_timesheet_job_uidx",
    ))
  ) {
    await queryInterface.addIndex(
      "timesheet_jobs",
      ["timesheet_id", "job_id"],
      {
        name: "timesheet_jobs_timesheet_job_uidx",
        unique: true,
      },
    );
  }

  if (
    !(await indexExists(
      queryInterface,
      "timesheet_jobs",
      "timesheet_jobs_job_idx",
    ))
  ) {
    await queryInterface.addIndex("timesheet_jobs", ["job_id"], {
      name: "timesheet_jobs_job_idx",
    });
  }

  if (
    !(await indexExists(
      queryInterface,
      "timesheet_jobs",
      "timesheet_jobs_org_idx",
    ))
  ) {
    await queryInterface.addIndex("timesheet_jobs", ["organisation_id"], {
      name: "timesheet_jobs_org_idx",
    });
  }

  try {
    await queryInterface.addConstraint("timesheet_jobs", {
      fields: ["timesheet_id"],
      type: "foreign key",
      name: "timesheet_jobs_timesheet_id_fk",
      references: { table: "timesheets", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  } catch {
    /* ignore */
  }

  try {
    await queryInterface.addConstraint("timesheet_jobs", {
      fields: ["job_id"],
      type: "foreign key",
      name: "timesheet_jobs_job_id_fk",
      references: { table: "jobs", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
  } catch {
    /* ignore */
  }

  // Backfill from legacy single job_id
  const tsDef = await describe(queryInterface, "timesheets");
  if (tsDef && Object.prototype.hasOwnProperty.call(tsDef, "job_id")) {
    await queryInterface.sequelize.query(`
      INSERT INTO timesheet_jobs (organisation_id, timesheet_id, job_id)
      SELECT t.organisation_id, t.id, t.job_id
      FROM timesheets t
      WHERE t.job_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM timesheet_jobs tj
          WHERE tj.timesheet_id = t.id AND tj.job_id = t.job_id
        )
    `);
  }

  // Also backfill from day tasks if timesheet still has no jobs
  await queryInterface.sequelize.query(`
    INSERT INTO timesheet_jobs (organisation_id, timesheet_id, job_id)
    SELECT DISTINCT t.organisation_id, t.id, tdt.job_id
    FROM timesheets t
    INNER JOIN timesheet_day_tasks tdt
      ON tdt.timesheet_id = t.id AND tdt.job_id IS NOT NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM timesheet_jobs tj WHERE tj.timesheet_id = t.id
    )
  `);

  // Drop unique (employee, period, job) — uniqueness is employee+period again
  try {
    await queryInterface.removeIndex(
      "timesheets",
      "timesheets_org_employee_period_job_idx",
    );
  } catch {
    /* ignore */
  }

  if (
    !(await indexExists(
      queryInterface,
      "timesheets",
      "timesheets_org_employee_period_uidx",
    ))
  ) {
    try {
      await queryInterface.addIndex(
        "timesheets",
        [
          "organisation_id",
          "employee_id",
          "period_start_date",
          "period_end_date",
        ],
        {
          name: "timesheets_org_employee_period_uidx",
          unique: true,
        },
      );
    } catch (err) {
      console.warn(
        "Could not add unique timesheets_org_employee_period_uidx:",
        err?.message || err,
      );
    }
  }
}

export async function down(queryInterface) {
  await queryInterface.dropTable("timesheet_jobs").catch(() => undefined);
  try {
    await queryInterface.removeIndex(
      "timesheets",
      "timesheets_org_employee_period_uidx",
    );
  } catch {
    /* ignore */
  }
}
