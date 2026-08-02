import { DataTypes } from "sequelize";
import { db } from "../database.js";

const TrackingAuthTokens = db.define(
  "TrackingAuthTokens",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    token_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    token_prefix: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    platform: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
  },
  {
    tableName: "tracking_auth_tokens",
    timestamps: false,
  },
);

TrackingAuthTokens.associate = (models) => {
  TrackingAuthTokens.belongsTo(models.Users, {
    foreignKey: "user_id",
    as: "user",
  });
};

export default TrackingAuthTokens;
