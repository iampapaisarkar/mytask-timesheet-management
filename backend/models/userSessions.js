import { DataTypes } from "sequelize";
import { db } from "../database.js";

/**
 * Device / audit sessions. Auth is Firebase Admin verifyIdToken;
 * rows are keyed by token_hash (never trust DB alone to skip crypto).
 */
const UserSessions = db.define(
  "UserSessions",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
    },
    /** @deprecated raw JWT — prefer token_hash */
    token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    token_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    expire_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_activity_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    platform: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      field: "created_at",
    },
  },
  {
    tableName: "user_sessions",
    timestamps: false,
  },
);

UserSessions.associate = (models) => {
  models.UserSessions.belongsTo(models.Users, {
    foreignKey: "user_id",
    as: "users",
  });
};

export default UserSessions;
