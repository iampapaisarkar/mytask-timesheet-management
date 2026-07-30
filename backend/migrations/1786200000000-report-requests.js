import { DataTypes } from "sequelize";

export async function up(queryInterface) {
  await queryInterface.createTable(
    { tableName: "report_requests" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      organisation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      requested_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "hours_activity",
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "pending",
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      filters: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      progress: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      result_json: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      artifact_path: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
      artifact_mime: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
  );

  await queryInterface.addIndex(
    { tableName: "report_requests" },
    ["organisation_id", "requested_by", "created_at"],
    { name: "report_requests_org_user_created_idx" },
  );
  await queryInterface.addIndex(
    { tableName: "report_requests" },
    ["status"],
    { name: "report_requests_status_idx" },
  );
  await queryInterface.addIndex(
    { tableName: "report_requests" },
    ["organisation_id", "status"],
    { name: "report_requests_org_status_idx" },
  );
}

export async function down(queryInterface) {
  await queryInterface.dropTable({ tableName: "report_requests" });
}
