export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "employment_status" }, [
    {
      name: "Active",
      code: "ACTIVE",
    },
    {
      name: "Terminated",
      code: "TERMINATED",
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "employment_status" });
}
