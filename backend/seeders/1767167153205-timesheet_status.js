export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "timesheet_status" }, [
    {
      name: "Draft",
      code: "draft",
    },
    {
      name: "Submitted",
      code: "submitted",
    },
    {
      name: "Approved",
      code: "approved",
    },
    {
      name: "Rejected",
      code: "rejected",
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "timesheet_status" });
}
