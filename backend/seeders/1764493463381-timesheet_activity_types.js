export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "timesheet_activity_types" }, [
    {
      name: "Working",
      code: "working",
    },
    {
      name: "Travel",
      code: "travel",
    },
    {
      name: "Break",
      code: "break",
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "timesheet_activity_types" });
}
