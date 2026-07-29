export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "system_roles" }, [
    {
      name: "Super Admin",
      code: "super-admin",
    },
    {
      name: "Organisation Admin",
      code: "org-admin",
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "system_roles" });
}
