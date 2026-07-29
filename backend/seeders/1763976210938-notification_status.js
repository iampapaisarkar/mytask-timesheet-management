export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "notification_status" }, [
    // :Example
    {
      name: "Archived",
      code: "archived",
    },
    {
      name: "Read",
      code: "read",
    },
    {
      name: "Unread",
      code: "unread",
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "notification_status" });
}
