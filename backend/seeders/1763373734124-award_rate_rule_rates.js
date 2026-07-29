export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "award_rate_rule_rates" }, [
    {
      name: "Overtime Rate - 10.00%",
      type: "overtime",
      value: "10.00",
    },
    {
      name: "Bonus Rate - 20.00%",
      type: "bonus",
      value: "20.00",
    },
    {
      name: "Sunday - 200.00%",
      type: "sunday",
      value: "200.00",
    },
    {
      name: "First Travelling Time - 100.00%",
      type: "first-travelling-time",
      value: "100.00",
    },
    {
      name: "Last Travelling Time - 100.00%",
      type: "last-travelling-time",
      value: "100.00",
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "award_rate_rule_rates" });
}
