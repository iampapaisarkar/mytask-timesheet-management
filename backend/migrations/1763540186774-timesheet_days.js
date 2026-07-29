import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "timesheet_days" },
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
      date: {
        type: DataTypes.DATEONLY,
      },
      day_of_week: {
        type: DataTypes.INTEGER,
      },
      is_public_holiday: {
        type: DataTypes.BOOLEAN,
        default: false,
      },
      holiday_calendar_id: {
        type: DataTypes.INTEGER,
      },
      is_weekend: {
        type: DataTypes.BOOLEAN,
        default: false,
      },
      total_hours: {
        type: DataTypes.DECIMAL(10, 2),
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
  await queryInterface.dropTable({ tableName: "timesheet_days" });
}
