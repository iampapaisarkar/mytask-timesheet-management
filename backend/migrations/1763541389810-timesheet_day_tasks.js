import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "timesheet_day_tasks" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      organisation_id: {
        type: DataTypes.INTEGER,
      },
      employee_id: {
        type: DataTypes.INTEGER,
      },
      timesheet_id: {
        type: DataTypes.INTEGER,
      },
      timesheet_day_id: {
        type: DataTypes.INTEGER,
      },
      job_id: {
        type: DataTypes.INTEGER,
      },
      start_time: {
        type: DataTypes.TIME,
      },
      end_time: {
        type: DataTypes.TIME,
      },
      total_hours: {
        type: DataTypes.DECIMAL(10, 2),
      },
      is_break: {
        type: DataTypes.BOOLEAN,
      },
      is_travel: {
        type: DataTypes.BOOLEAN,
      },
      original_log: {
        type: DataTypes.JSON,
      },
      source: {
        type: DataTypes.STRING,
      },
      remarks: {
        type: DataTypes.TEXT,
      },
      approval_reason: {
        type: DataTypes.TEXT,
      },
      reject_reason: {
        type: DataTypes.TEXT,
      },
      created_at: {
        type: DataTypes.DATE,
        field: "created_at",
      },
      created_by: {
        type: DataTypes.INTEGER,
      },
      updated_at: {
        type: DataTypes.DATE,
        field: "updated_at",
      },
      updated_by: {
        type: DataTypes.INTEGER,
      },
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "timesheet_day_tasks" });
}
