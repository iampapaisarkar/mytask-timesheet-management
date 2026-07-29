import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "award_rate_rule_day_relations" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      organisation_id: {
        type: DataTypes.INTEGER,
      },
      award_rate_rule_id: {
        type: DataTypes.INTEGER,
      },
      award_rate_day_id: {
        type: DataTypes.INTEGER,
      },
    },
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({
    tableName: "award_rate_rule_day_relations",
  });
}
