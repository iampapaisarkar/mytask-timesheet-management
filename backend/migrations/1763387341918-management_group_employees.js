import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "management_group_employees" },
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
      group_id: {
        type: DataTypes.INTEGER,
      },
      employee_id: {
        type: DataTypes.INTEGER,
      },
      is_manager: {
        type: DataTypes.BOOLEAN,
      },
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "management_group_employees" });
}
