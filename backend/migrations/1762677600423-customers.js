import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "customers" },
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
      address: {
        type: DataTypes.TEXT,
      },
      abn: {
        type: DataTypes.STRING,
      },
      contact_name: {
        type: DataTypes.STRING,
      },
      contact_email: {
        type: DataTypes.STRING,
      },
      contact_phone_number: {
        type: DataTypes.STRING,
      },
      hourly_rate: {
        type: DataTypes.DECIMAL(10, 2),
      },
      is_active: {
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
  await queryInterface.dropTable({ tableName: "customers" });
}
