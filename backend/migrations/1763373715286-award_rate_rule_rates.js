import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "award_rate_rule_rates" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      name: {
        type: DataTypes.STRING,
      },
      type: {
        type: DataTypes.STRING,
      },
      value: {
        type: DataTypes.DECIMAL(6, 2),
      },
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "award_rate_rule_rates" });
}
