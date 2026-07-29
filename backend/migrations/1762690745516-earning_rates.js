import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "earning_rates" },
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
      name: {
        type: DataTypes.STRING,
      },
      earning_rate_type_id: {
        type: DataTypes.INTEGER,
      },
      rate: {
        type: DataTypes.DECIMAL(10, 2),
      },
      account_code: {
        type: DataTypes.STRING,
      },
      type_of_units: {
        type: DataTypes.STRING,
      },
      multiplier: {
        type: DataTypes.DECIMAL(10, 2),
      },
      is_exempt_from_tax: {
        type: DataTypes.BOOLEAN,
      },
      is_exempt_from_super: {
        type: DataTypes.BOOLEAN,
      },
      accrue_leave: {
        type: DataTypes.BOOLEAN,
      },
      is_reportable_asw1: {
        type: DataTypes.BOOLEAN,
      },
      current_record: {
        type: DataTypes.BOOLEAN,
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
  await queryInterface.dropTable({ tableName: "earning_rates" });
}
