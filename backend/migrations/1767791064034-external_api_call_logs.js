import { response } from "express";
import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "external_api_call_logs" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      orgnisaion_id: {
        type: DataTypes.INTEGER,
      },
      user_id: {
        type: DataTypes.INTEGER,
      },
      platform: {
        type: DataTypes.STRING,
      },
      url: {
        type: DataTypes.STRING,
      },
      method: {
        type: DataTypes.STRING,
      },
      body: {
        type: DataTypes.JSON,
      },
      content_type: {
        type: DataTypes.STRING,
      },
      response: {
        type: DataTypes.JSON,
      },
      executed_at: {
        type: DataTypes.DATE,
      },
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "external_api_call_logs" });
}
