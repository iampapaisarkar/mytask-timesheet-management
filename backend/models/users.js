import { DataTypes } from "sequelize";
import { db } from "../database.js";

const Users = db.define(
  "Users",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    middle_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    dob: {
      type: DataTypes.DATEONLY,
    },
    phone_number: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    phone_country_code: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    phone_country_iso: {
      type: DataTypes.STRING(2),
      allowNull: true,
    },
    firebase_user_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    updated_by: {
      type: DataTypes.INTEGER,
    },
    full_name: {
      type: DataTypes.VIRTUAL,
      get() {
        const firstName = this.getDataValue("first_name");
        const middleName = this.getDataValue("middle_name");
        const lastName = this.getDataValue("last_name");
        if (!firstName && !middleName && !lastName) {
          return null;
        }
        return [firstName, middleName, lastName].filter(Boolean).join(" ");
      },
    },
  },
  {
    tableName: "users", // Table name should be in lowercase and plural
    timestamps: false,
  },
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
Users.associate = (models) => {
  models.Users.hasMany(models.FirebaseProviders, {
    foreignKey: "user_id",
    as: "firebase_providers",
  });
  models.Users.belongsToMany(models.Organisations, {
    through: models.UserOrganisationRoles,
    foreignKey: "user_id",
    otherKey: "organisation_id",
    as: "organisations",
  });
  models.Users.hasOne(models.UserOrganisationRoles, {
    foreignKey: "user_id",
    as: "user_organisations_role",
  });
  models.Users.hasOne(models.UserSessions, {
    foreignKey: "user_id",
    as: "user_session",
  });
  models.Users.hasOne(models.UserTimezones, {
    foreignKey: "user_id",
    as: "timezone",
  });
};

export default Users;
