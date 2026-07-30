/**
 * Initial area seed (sample). Worldwide state/province values are upserted
 * at runtime from Google Places administrative_area_level_1 (any country).
 * These AU rows remain as historical seed data only — not a country lock.
 */
export async function up(queryInterface, Sequelize) {
  await queryInterface.bulkInsert({ tableName: "states" }, [
    {
      name: "Australian Capital Territory",
      code: "ACT",
    },
    {
      name: "New South Wales",
      code: "NSW",
    },
    {
      name: "Northern Territory",
      code: "NT",
    },
    {
      name: "Queensland",
      code: "QLD",
    },
    {
      name: "South Australia",
      code: "SA",
    },
    {
      name: "Tasmania",
      code: "TAS",
    },
    {
      name: "Victoria",
      code: "VIC",
    },
    {
      name: "Western Australia",
      code: "WA",
    },
  ]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete({ tableName: "states" });
}
