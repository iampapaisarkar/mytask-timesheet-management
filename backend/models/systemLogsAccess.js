import { DataTypes } from "sequelize";
import { db } from "../database.js";

const SystemLogsAccess = db.define(
  "SystemLogsAccess",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    plan_code: { type: DataTypes.STRING(32), allowNull: true },
    granted_at: { type: DataTypes.DATE, allowNull: true },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "system_logs_access", timestamps: false },
);

export default SystemLogsAccess;
