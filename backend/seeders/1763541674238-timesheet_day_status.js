export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "timesheet_day_status" }, [
    {
      name: "Draft",
      code: "draft",
    },
    {
      name: "Active",
      code: "active",
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
    {
      name: "Saved",
      code: "saved",
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "timesheet_day_status" });
}
