import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "geofence_events" },
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
      user_id: {
        type: DataTypes.INTEGER,
      },
      timesheet_activity_log_id: {
        type: DataTypes.INTEGER,
      },
      job_id: {
        type: DataTypes.INTEGER,
      },
      action: {
        type: DataTypes.STRING,
      },
      track_at: {
        type: DataTypes.DATE,
      },
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "geofence_events" });
}
