import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "award_rate_settings" },
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
      award_rate_id: {
        type: DataTypes.INTEGER,
      },
      rounding_interval_id: {
        type: DataTypes.INTEGER,
      },
      rounding_up_by: {
        type: DataTypes.INTEGER,
      },
      rounding_down_by: {
        type: DataTypes.INTEGER,
      },
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "award_rate_settings" });
}
