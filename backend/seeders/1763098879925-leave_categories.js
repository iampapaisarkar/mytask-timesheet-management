export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "leave_categories" }, [
    {
      name: "Annual Leave",
      code: "annual_leave",
    },
    {
      name: "Parental Leave",
      code: "parental_leave",
    },
    {
      name: "Persona/Carer's Leave",
      code: "persona_carers_leave",
    },
    {
      name: "Compassionate Leave",
      code: "compassionate_leave",
    },
    {
      name: "Other Unpaid Leave",
      code: "other_unpaid_leave",
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "leave_categories" });
}
