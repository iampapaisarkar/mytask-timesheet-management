import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "employee_payrolls" },
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
      employee_id: {
        type: DataTypes.INTEGER,
      },
      tax_file_number: {
        type: DataTypes.STRING,
      },
      superannuation_fund: {
        type: DataTypes.DECIMAL(10, 2),
      },
      superannuation_member_number: {
        type: DataTypes.STRING,
      },
      bank_bsb: {
        type: DataTypes.STRING,
      },
      bank_account_number: {
        type: DataTypes.STRING,
      },
      bank_account_name: {
        type: DataTypes.STRING,
      },
      created_at: {
        type: DataTypes.DATE,
        field: "created_at",
      },
      created_by: {
        type: DataTypes.INTEGER,
      },
      updated_at: {
        type: DataTypes.DATE,
        field: "updated_at",
      },
      updated_by: {
        type: DataTypes.INTEGER,
      },
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "employee_payrolls" });
}
