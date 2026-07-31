/**
 * Drop unused per-day status lookup.
 * Day editing permissions use timesheet-level status (timesheet_status), not this table.
 * timesheet_days never had a status_id column in production schema.
 */
export async function up(queryInterface) {
  await queryInterface.dropTable({ tableName: "timesheet_day_status" });
}

export async function down(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.createTable(
    { tableName: "timesheet_day_status" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: { type: DataTypes.STRING },
      code: { type: DataTypes.STRING },
    },
  );
}
