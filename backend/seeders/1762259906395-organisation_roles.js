export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "organisation_roles" }, [
    {
      name: "Owner",
      code: "owner",
    },
    {
      name: "Moderator",
      code: "moderator",
    },
    {
      name: "Manager",
      code: "manager",
    },
    {
      name: "Staff",
      code: "staff",
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "organisation_roles" });
}
