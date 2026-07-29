export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "award_rate_rule_days" }, [
    {
      name: "Public Holiday",
      code: "public-holiday",
      locked: true,
      show_default: true,
    },
    {
      name: "Monday",
      code: "monday",
      locked: false,
      show_default: false,
    },
    {
      name: "Tuesday",
      code: "tuesday",
      locked: false,
      show_default: false,
    },
    {
      name: "Wednesday",
      code: "wednesday",
      locked: false,
      show_default: false,
    },
    {
      name: "Thursday",
      code: "thursday",
      locked: false,
      show_default: false,
    },
    {
      name: "Friday",
      code: "friday",
      locked: false,
      show_default: false,
    },
    {
      name: "Saturday",
      code: "saturday",
      locked: false,
      show_default: true,
    },
    {
      name: "Sunday",
      code: "sunday",
      locked: false,
      show_default: true,
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "award_rate_rule_days" });
}
