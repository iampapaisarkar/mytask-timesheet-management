import { DataTypes } from "sequelize";

const TABLES = [
  "organisation_address",
  "employee_address",
  "job_address",
];

export async function up(queryInterface) {
  for (const tableName of TABLES) {
    await queryInterface.changeColumn(
      { tableName },
      "postcode",
      {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
    );
  }
}

export async function down(queryInterface) {
  for (const tableName of TABLES) {
    await queryInterface.changeColumn(
      { tableName },
      "postcode",
      {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    );
  }
}
