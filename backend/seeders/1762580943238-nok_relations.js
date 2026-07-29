export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "nok_relations" }, [
    {
      name: "Spouse",
    },
    {
      name: "Partner",
    },
    {
      name: "Mother",
    },
    {
      name: "Father",
    },
    {
      name: "Sibiling",
    },
    {
      name: "Child",
    },
    {
      name: "Grandparent",
    },
    {
      name: "Aunt / Uncle",
    },
    {
      name: "Niece / Nephew",
    },
    {
      name: "Cousin",
    },
    {
      name: "Friend",
    },
    {
      name: "Other",
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "nok_relations" });
}
