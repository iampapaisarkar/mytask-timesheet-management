import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "rounding_intervals" },
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
      value: {
        type: DataTypes.INTEGER,
      },
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "rounding_intervals" });
}
