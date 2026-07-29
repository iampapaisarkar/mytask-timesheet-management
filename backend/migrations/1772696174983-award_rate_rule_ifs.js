import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "award_rate_rule_ifs" },
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
      award_rate_field_id: {
        type: DataTypes.INTEGER,
      },
      award_rate_comparison_id: {
        type: DataTypes.INTEGER,
      },
      value: {
        type: DataTypes.STRING,
      },
      from: {
        type: DataTypes.STRING,
      },
      to: {
        type: DataTypes.STRING,
      },
    },
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "award_rate_rule_ifs" });
}
