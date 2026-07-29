export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "award_rate_rule_fields" }, [
    {
      name: "Daily Hours",
      code: "daily-hours",
      type_id: 1,
      category: "working",
      is_active: true,
    },
    {
      name: "Weekly - Ordinary Hours",
      code: "weekly-ordinary-hours",
      type_id: 1,
      category: "working",
      is_active: false,
    },
    {
      name: "Weekly - All Hours",
      code: "weekly-all-hours",
      type_id: 1,
      category: "all",
      is_active: false,
    },
    {
      name: "Hour Time",
      code: "hour-time",
      type_id: 2,
      category: "working",
      is_active: true,
    },
    {
      name: "Daily Break",
      code: "daily-break",
      type_id: 1,
      category: "break",
      is_active: true,
    },
    {
      name: "First Travel Trip Time",
      code: "first-travel-trip-time",
      type_id: 1,
      category: "travel",
      is_active: true,
    },
    {
      name: "Last Travel Trip Time",
      code: "last-travel-trip-time",
      type_id: 1,
      category: "travel",
      is_active: true,
    },
    {
      name: "Start Time",
      code: "start-time",
      type_id: 2,
      category: "working",
      is_active: true,
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "award_rate_rule_fields" });
}
