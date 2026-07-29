export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "pay_cycles" }, [
    {
      name: "Weekly",
      code: "WEEKLY",
    },
    {
      name: "Fortnightly",
      code: "FORTNIGHTLY",
    },
    {
      name: "Four Weekly",
      code: "FOURWEEKLY",
    },
    {
      name: "Monthly",
      code: "MONTHLY",
    },
    {
      name: "Twice Monthly",
      code: "TWICEMONTHLY",
    },
    {
      name: "Quarterly",
      code: "QUARTERLY",
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "pay_cycles" });
}
