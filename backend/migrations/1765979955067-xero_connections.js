import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "xero_connections" },
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
      connection_id: {
        type: DataTypes.STRING,
      },
      tenant_id: {
        type: DataTypes.UUID,
      },
      access_token: {
        type: DataTypes.TEXT,
      },
      refresh_token: {
        type: DataTypes.TEXT,
      },
      expires_at: {
        type: DataTypes.DATE,
      },
      created_at: {
        type: DataTypes.DATE,
        field: "created_at",
      },
      created_by: {
        type: DataTypes.INTEGER,
      },
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "xero_connections" });
}
