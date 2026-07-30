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
 * Add timesheet ↔ job association (one job per timesheet).
 * Backfills from the most-used working-task job_id, then org's oldest job.
 * New creates must supply job_id via the API.
 */
export async function up(queryInterface) {
  const def = await describe(queryInterface, "timesheets");
  if (!def) return;

  if (!Object.prototype.hasOwnProperty.call(def, "job_id")) {
    await queryInterface.addColumn("timesheets", "job_id", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
  }

  // Backfill from any non-null job on timesheet day tasks (min id as stable pick)
  await queryInterface.sequelize.query(`
    UPDATE timesheets t
    INNER JOIN (
      SELECT timesheet_id, MIN(job_id) AS job_id
      FROM timesheet_day_tasks
      WHERE job_id IS NOT NULL
      GROUP BY timesheet_id
    ) src ON src.timesheet_id = t.id
    SET t.job_id = src.job_id
    WHERE t.job_id IS NULL
  `);

  // Fallback: any remaining null → first job in the same organisation
  await queryInterface.sequelize.query(`
    UPDATE timesheets t
    INNER JOIN (
      SELECT organisation_id, MIN(id) AS job_id
      FROM jobs
      GROUP BY organisation_id
    ) j ON j.organisation_id = t.organisation_id
    SET t.job_id = j.job_id
    WHERE t.job_id IS NULL
  `);

  if (!(await indexExists(queryInterface, "timesheets", "timesheets_job_id_idx"))) {
    await queryInterface.addIndex("timesheets", ["job_id"], {
      name: "timesheets_job_id_idx",
    });
  }

  if (
    !(await indexExists(
      queryInterface,
      "timesheets",
      "timesheets_org_employee_period_job_idx",
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
          "job_id",
        ],
        {
          name: "timesheets_org_employee_period_job_idx",
          unique: true,
        },
      );
    } catch (err) {
      console.warn(
        "Could not add unique timesheets_org_employee_period_job_idx (possible legacy duplicates):",
        err?.message || err,
      );
    }
  }

  if (
    !(await indexExists(queryInterface, "timesheets", "timesheets_org_job_idx"))
  ) {
    await queryInterface.addIndex(
      "timesheets",
      ["organisation_id", "job_id"],
      { name: "timesheets_org_job_idx" },
    );
  }

  try {
    await queryInterface.addConstraint("timesheets", {
      fields: ["job_id"],
      type: "foreign key",
      name: "timesheets_job_id_fk",
      references: { table: "jobs", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
  } catch {
    // Constraint may already exist
  }
}

export async function down(queryInterface) {
  try {
    await queryInterface.removeConstraint("timesheets", "timesheets_job_id_fk");
  } catch {
    /* ignore */
  }
  for (const name of [
    "timesheets_org_employee_period_job_idx",
    "timesheets_org_job_idx",
    "timesheets_job_id_idx",
  ]) {
    try {
      await queryInterface.removeIndex("timesheets", name);
    } catch {
      /* ignore */
    }
  }
  const def = await describe(queryInterface, "timesheets");
  if (def && Object.prototype.hasOwnProperty.call(def, "job_id")) {
    await queryInterface.removeColumn("timesheets", "job_id");
  }
}
