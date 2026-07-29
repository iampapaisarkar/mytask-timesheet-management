import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "employee_wages" },
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
      start_date: {
        type: DataTypes.DATEONLY,
      },
      employment_status_id: {
        type: DataTypes.INTEGER,
      },
      payroll_calendar_id: {
        type: DataTypes.INTEGER,
      },
      employment_type_id: {
        type: DataTypes.INTEGER,
      },
      hourly_rate_exc_super: {
        type: DataTypes.DECIMAL(10, 2),
      },
      timesheet_submission_frequency: {
        type: DataTypes.STRING,
      },
      award_rate_id: {
        type: DataTypes.INTEGER,
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
  await queryInterface.dropTable({ tableName: "employee_wages" });
}
