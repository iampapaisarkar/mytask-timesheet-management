export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert(
    { tableName: "timesheet_submission_frequencies" },
    [
      {
        name: "Daily",
        code: "daily",
      },
      {
        name: "By Pay Cycle",
        code: "by-pay-cycle",
      },
    ]
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({
    tableName: "timesheet_submission_frequencies",
  });
}
