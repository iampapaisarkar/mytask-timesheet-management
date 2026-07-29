import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "timesheets" },
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
      code: {
        type: DataTypes.STRING,
        unique: true,
      },
      payroll_calendar_id: {
        type: DataTypes.INTEGER,
      },
      period_start_date: {
        type: DataTypes.DATEONLY,
      },
      period_end_date: {
        type: DataTypes.DATEONLY,
      },
      created_at: {
        type: DataTypes.DATE,
        field: "created_at",
      },
      created_by: {
        type: DataTypes.INTEGER,
      },
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "timesheets" });
}
