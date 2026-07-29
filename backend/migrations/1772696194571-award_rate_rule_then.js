import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "award_rate_rule_then" },
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
      award_rate_if_id: {
        type: DataTypes.INTEGER,
      },
      earning_rate_id: {
        type: DataTypes.INTEGER,
      },
    },
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "award_rate_rule_then" });
}
