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
 * Persist job context on activity start/working rows so same-job dedupe and
 * resume logic can use timesheet_activity_logs.job_id (previously referenced
 * but never stored).
 */
export async function up(queryInterface) {
  const def = await describe(queryInterface, "timesheet_activity_logs");
  if (!def) return;

  if (!Object.prototype.hasOwnProperty.call(def, "job_id")) {
    await queryInterface.addColumn("timesheet_activity_logs", "job_id", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
  }

  if (
    !(await indexExists(
      queryInterface,
      "timesheet_activity_logs",
      "timesheet_activity_logs_job_id_idx",
    ))
  ) {
    await queryInterface.addIndex("timesheet_activity_logs", ["job_id"], {
      name: "timesheet_activity_logs_job_id_idx",
    });
  }

  // Backfill working activity logs from linked day tasks via pairs
  await queryInterface.sequelize.query(`
    UPDATE timesheet_activity_logs tal
    INNER JOIN timesheet_task_activity_pairs pair
      ON pair.timesheet_activity_log_start_id = tal.id
    INNER JOIN timesheet_day_tasks tdt
      ON tdt.id = pair.timesheet_day_task_id
    SET tal.job_id = tdt.job_id
    WHERE tal.job_id IS NULL
      AND tdt.job_id IS NOT NULL
  `);
}

export async function down(queryInterface) {
  try {
    await queryInterface.removeIndex(
      "timesheet_activity_logs",
      "timesheet_activity_logs_job_id_idx",
    );
  } catch {
    /* ignore */
  }
  const def = await describe(queryInterface, "timesheet_activity_logs");
  if (def && Object.prototype.hasOwnProperty.call(def, "job_id")) {
    await queryInterface.removeColumn("timesheet_activity_logs", "job_id");
  }
}
