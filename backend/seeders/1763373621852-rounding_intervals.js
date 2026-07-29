export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "rounding_intervals" }, [
    {
      name: "None",
      value: 0,
    },
    {
      name: "5 Minutes",
      value: 5,
    },
    {
      name: "10 Minutes",
      value: 10,
    },
    {
      name: "15 Minutes",
      value: 15,
    },
    {
      name: "30 Minutes",
      value: 30,
    },
    {
      name: "1 Hour",
      value: 60,
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "rounding_intervals" });
}
