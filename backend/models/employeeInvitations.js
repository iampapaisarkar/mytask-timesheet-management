import { DataTypes } from "sequelize";
import { db } from "../database.js";

const EmployeeInvitations = db.define(
  "EmployeeInvitations",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
  },
  {
    tableName: "employee_invitations", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

// ----------------------------------------------------------------------
// Associations
// ----------------------------------------------------------------------
EmployeeInvitations.associate = function (models) {
  models.EmployeeInvitations.belongsTo(models.InvitationStatus, {
    foreignKey: "status_id",
    as: "status",
  });

  models.EmployeeInvitations.belongsTo(models.OrganisationRoles, {
    foreignKey: "organisation_role_id",
    as: "role",
  });

  models.EmployeeInvitations.belongsTo(models.Organisations, {
    foreignKey: "organisation_id",
    as: "organisation",
  });

  models.EmployeeInvitations.belongsTo(models.Employees, {
    foreignKey: "employee_id",
    as: "employee",
  });
  models.EmployeeInvitations.belongsTo(models.Users, {
    foreignKey: "user_id",
    as: "user",
  });
};

export default EmployeeInvitations;
