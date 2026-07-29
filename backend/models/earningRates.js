import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";

const EarningRates = mysheet.define(
  "EarningRates",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    organisation_id: {
      type: DataTypes.INTEGER,
    },
    name: {
      type: DataTypes.STRING,
    },
    earning_rate_type_id: {
      type: DataTypes.INTEGER,
    },
    rate: {
      type: DataTypes.DECIMAL(10, 2),
    },
    xero_earning_rate_id: {
      type: DataTypes.UUID,
      defaultValue: null,
    },
    account_code: {
      type: DataTypes.STRING,
    },
    type_of_units: {
      type: DataTypes.STRING,
    },
    multiplier: {
      type: DataTypes.DECIMAL(10, 2),
    },
    is_exempt_from_tax: {
      type: DataTypes.BOOLEAN,
    },
    is_exempt_from_super: {
      type: DataTypes.BOOLEAN,
    },
    accrue_leave: {
      type: DataTypes.BOOLEAN,
    },
    is_reportable_asw1: {
      type: DataTypes.BOOLEAN,
    },
    current_record: {
      type: DataTypes.BOOLEAN,
    },
    created_at: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    created_by: {
      type: DataTypes.INTEGER,
    },
    updated_at: {
      type: DataTypes.DATE,
      field: "updated_at",
    },
    updated_by: {
      type: DataTypes.INTEGER,
    },
    push_to_xero: {
      type: DataTypes.VIRTUAL,
      get() {
        return true;
      },
    },
    label: {
      type: DataTypes.VIRTUAL,
      get() {
        const name = this.getDataValue("name");
        const rate = this.getDataValue("rate");

        if (!name || !rate) {
          return null;
        }

        return `${name} - ${rate}`;
      },
    },
  },
  {
    tableName: "earning_rates", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
EarningRates.associate = (models) => {
  models.EarningRates.belongsTo(models.EarningRateTypes, {
    foreignKey: "earning_rate_type_id",
    as: "earning_rate_type",
  });
};

export default EarningRates;
