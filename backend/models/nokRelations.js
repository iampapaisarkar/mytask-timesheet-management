import { DataTypes } from "sequelize";
import { db } from "../database.js";

const NokRelations = db.define(
  "NokRelations",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
    },
  },
  {
    tableName: "nok_relations", // Table name should be in lowercase and plural
    timestamps: false,
  }
);

export default NokRelations;
