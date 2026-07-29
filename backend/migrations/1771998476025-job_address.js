import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "job_address" },
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
      job_id: {
        type: DataTypes.INTEGER,
      },
      address_1: {
        type: DataTypes.TEXT,
      },
      address_2: {
        type: DataTypes.TEXT,
      },
      city: {
        type: DataTypes.STRING,
      },
      state_id: {
        type: DataTypes.INTEGER,
      },
      postcode: {
        type: DataTypes.INTEGER,
      },
      latitude: {
        type: DataTypes.DECIMAL(17, 14),
      },
      longitude: {
        type: DataTypes.DECIMAL(17, 14),
      },
    },
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "job_address" });
}
