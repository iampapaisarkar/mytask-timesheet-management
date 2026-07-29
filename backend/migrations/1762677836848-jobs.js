import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "jobs" },
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
      customer_id: {
        type: DataTypes.INTEGER,
      },
      address: {
        type: DataTypes.TEXT,
      },
      latitude: {
        type: DataTypes.DECIMAL(17, 14),
      },
      longitude: {
        type: DataTypes.DECIMAL(17, 14),
      },
      radius: {
        type: DataTypes.INTEGER,
      },
      site_contact_name: {
        type: DataTypes.STRING,
      },
      site_contact_email: {
        type: DataTypes.STRING,
      },
      site_contact_phone_number: {
        type: DataTypes.STRING,
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
  await queryInterface.dropTable({ tableName: "jobs" });
}
