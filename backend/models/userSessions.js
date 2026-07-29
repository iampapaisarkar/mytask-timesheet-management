import { DataTypes } from "sequelize";
import { db } from "../database.js";

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
    token: {
      type: DataTypes.TEXT,
    },
    expire_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      field: "created_at",
    },
  },
  {
    tableName: "user_sessions", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
UserSessions.associate = (models) => {
  models.UserSessions.belongsTo(models.Users, {
    foreignKey: "user_id",
    as: "users",
  });
};

export default UserSessions;
