export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "employment_types" }, [
    {
      name: "Full Time",
      code: "FULLTIME",
    },
    {
      name: "Part Time",
      code: "PARTTIME",
    },
    {
      name: "Casual",
      code: "CASUAL",
    },
    // {
    //   name: "Salary",
    //   code: "salary",
    // },
    // {
    //   name: "Contract",
    //   code: "contract",
    // },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "employment_types" });
}
