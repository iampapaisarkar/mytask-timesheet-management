export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert(
    { tableName: "award_rate_rule_field_types" },
    [
      {
        name: "Number",
        code: "number",
      },
      {
        name: "time",
        code: "time",
      },
    ]
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "award_rate_rule_field_types" });
}
