import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";
import Users from "./users.js";
import Employees from "./employees.js";
import UserOrganisationRoles from "./userOrganisationRoles.js";
import OrganisationRoles from "./organisationRoles.js";
import XeroConnections from "./xeroConnections.js";
import OrganisationAddress from "./organisationAddress.js";
import States from "./states.js";

const Organisations = mysheet.define(
  "Organisations",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
    },
    code: {
      type: DataTypes.STRING,
      unique: true,
    },
    website: {
      type: DataTypes.STRING,
    },
    phone_number: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
    },
    created_at: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    updated_at: {
      type: DataTypes.DATE,
      field: "updated_at",
    },
  },
  {
    tableName: "organisations", // Table name should be in lowercase and plural
    timestamps: false,
  },
);

Organisations.associate = (models) => {
  models.Organisations.belongsToMany(models.Users, {
    through: models.UserOrganisationRoles,
    foreignKey: "organisation_id",
    otherKey: "user_id",
    as: "users",
  });
  models.Organisations.hasOne(models.Employees, {
    foreignKey: "organisation_id",
    as: "employee",
  });
  models.Organisations.hasOne(models.UserOrganisationRoles, {
    foreignKey: "organisation_id",
    as: "user_organisations_role",
  });
  models.Organisations.hasOne(models.XeroConnections, {
    foreignKey: "organisation_id",
    as: "xero_connection",
  });
  models.Organisations.hasOne(models.OrganisationAddress, {
    foreignKey: "organisation_id",
    as: "address",
  });
};

// ----------------------------------------------------------------------
// Default Scope: only includes associations, root-level attributes go inside details
// ----------------------------------------------------------------------
Organisations.addScope("withUser", (userId) => ({
  include: [
    {
      model: Users,
      as: "users",
      where: { id: userId },
      // attributes: [],
      // through: { attributes: [] },
    },
    {
      model: OrganisationAddress,
      as: "address",
      include: [
        {
          model: States,
          as: "state",
        },
      ],
    },
    {
      model: Employees,
      as: "employee",
      where: { user_id: userId },
      required: false,
    },
    {
      model: XeroConnections,
      as: "xero_connection",
      attributes: ["organisation_id", "connection_id", "tenant_id"],
    },
    {
      model: UserOrganisationRoles,
      as: "user_organisations_role",
      required: true,
      where: { user_id: userId },
      attributes: ["id", "user_id", "organisation_id", "role_id"],
      include: [
        {
          model: OrganisationRoles,
          as: "role",
          required: false,
          attributes: ["id", "name", "code"],
        },
      ],
    },
  ],
}));

// Override toJSON
Organisations.prototype.toJSON = function () {
  const full = this.get({ plain: true });

  // Extract management_group, wage, payroll and details
  const { user_organisations_role, ...rest } = full;

  return {
    ...rest,
    role: full?.user_organisations_role?.role || null,
  };
};

export default Organisations;
