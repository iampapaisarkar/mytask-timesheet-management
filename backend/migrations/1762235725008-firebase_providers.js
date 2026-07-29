import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "firebase_providers" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      user_id: {
        type: DataTypes.INTEGER,
      },
      provider_id: {
        type: DataTypes.STRING,
      },
      uid: {
        type: DataTypes.STRING,
      },
      photo_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "firebase_providers" });
}
