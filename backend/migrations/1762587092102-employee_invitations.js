import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable(
    { tableName: "employee_invitations" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      user_id: {
        type: DataTypes.STRING,
      },
      employee_id: {
        type: DataTypes.STRING,
      },
      organisation_id: {
        type: DataTypes.INTEGER,
      },
      email: {
        type: DataTypes.STRING,
      },
      invitation_token: {
        type: DataTypes.TEXT,
      },
      organisation_role_id: {
        type: DataTypes.INTEGER,
      },
      status_id: {
        type: DataTypes.INTEGER,
      },
      invited_at: {
        type: DataTypes.DATE,
      },
      expire_at: {
        type: DataTypes.DATE,
      },
    }
  );
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable({ tableName: "employee_invitations" });
}
