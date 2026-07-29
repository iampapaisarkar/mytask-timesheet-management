export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert(
    { tableName: "award_rate_rule_comparators" },
    [
      {
        name: "Between",
        code: "between",
      },
      {
        name: "Not Between",
        code: "not-between",
      },
      {
        name: "Equal To",
        code: "equal-to",
      },
      {
        name: "Not Equal To",
        code: "not-equal-to",
      },
      {
        name: "Greater Than",
        code: "greater-than",
      },
      {
        name: "Less Than",
        code: "less-than",
      },
      {
        name: "Greater Than or Equal To",
        code: "greater-than-or-equal-to",
      },
      {
        name: "Less Than or Equal To",
        code: "less-than-or-equal-to",
      },
    ]
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "award_rate_rule_comparators" });
}
