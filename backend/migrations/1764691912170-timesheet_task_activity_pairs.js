import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "timesheet_task_activity_pairs" },
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
      timesheet_day_task_id: {
        type: DataTypes.INTEGER,
      },
      timesheet_activity_log_start_id: {
        type: DataTypes.INTEGER,
      },
      timesheet_activity_log_end_id: {
        type: DataTypes.INTEGER,
      },
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({
    tableName: "timesheet_task_activity_pairs",
  });
}
