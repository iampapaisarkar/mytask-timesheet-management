import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "email_send_logs" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      subject: {
        type: DataTypes.STRING,
        charset: "utf8mb4",
        collate: "utf8mb4_unicode_ci",
      },
      template: {
        type: DataTypes.STRING,
      },
      body: {
        type: DataTypes.TEXT,
        charset: "utf8mb4",
        collate: "utf8mb4_unicode_ci",
      },
      email_to: {
        type: DataTypes.TEXT,
      },
      sent_by: {
        type: DataTypes.STRING,
      },
      sent_at: {
        type: DataTypes.DATE,
      },
    },
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "email_send_logs" });
}
