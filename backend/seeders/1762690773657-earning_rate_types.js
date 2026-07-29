export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "earning_rate_types" }, [
    {
      name: "Ordinary Time Earnings",
      code: "ORDINARYTIMEEARNINGS",
      rate_type: "RATEPERUNIT",
    },
    {
      name: "Overtime Earnings",
      code: "OVERTIMEEARNINGS",
      rate_type: "MULTIPLE",
    },
    {
      name: "Allowance",
      code: "ALLOWANCE",
      rate_type: "RATEPERUNIT",
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "earning_rate_types" });
}
