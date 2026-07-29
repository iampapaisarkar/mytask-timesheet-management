import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "timesheet_activity_logs" },
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
      timesheet_day_id: {
        type: DataTypes.INTEGER,
      },
      latitude: {
        type: DataTypes.DECIMAL(17, 14),
      },
      longitude: {
        type: DataTypes.DECIMAL(17, 14),
      },
      start_at: {
        type: DataTypes.DATE,
      },
      end_at: {
        type: DataTypes.DATE,
      },
      type_id: {
        type: DataTypes.INTEGER,
      },
      track_at: {
        type: DataTypes.DATE,
        field: "track_at",
      },
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "timesheet_activity_logs" });
}
