export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "invitation_status" }, [
    {
      name: "Invited",
      code: "invited",
    },
    {
      name: "Accept",
      code: "accept",
    },
    {
      name: "Reject",
      code: "reject",
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "invitation_status" });
}
