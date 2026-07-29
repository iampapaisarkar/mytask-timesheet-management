import dotenv from "dotenv";
dotenv.config();
import { Sequelize } from "sequelize";
import { getDatabaseConfig } from "./config/config.js"; // Make sure to import your function

// Get database configurations for each environment (development or production)
const MYSHEETconfig = getDatabaseConfig();

// Sequelize instance for MYSHEET
export const mysheet = new Sequelize(
  MYSHEETconfig.database,
  MYSHEETconfig.username,
  MYSHEETconfig.password,
  {
    host: MYSHEETconfig.host,
    dialect: MYSHEETconfig.dialect || "mysql",
    dialectOptions: MYSHEETconfig.dialectOptions,
    // logging: console.log,
    logging: false,
  },
);
