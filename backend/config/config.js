import dotenv from "dotenv";

dotenv.config();

const environment = process.env.NODE_ENV || "development";

export function getDatabaseConfig() {
  const defaultDbName = environment === "production" ? "mysheet" : "mysheet";
  // Support both Laravel-style env vars and generic ones
  const username = process.env.DB_USER || process.env.DB_USERNAME;
  const database =
    process.env.DB_NAME || process.env.DB_DATABASE || defaultDbName;
  const password = process.env.DB_PASSWORD || process.env.DB_PASS;
  const port = process.env.DB_PORT;
  const host = process.env.DB_HOST;
  const dialect = process.env.DB_DIALECT || process.env.DB_CONNECTION; // e.g., 'mysql', 'mssql', 'postgres'

  return {
    username,
    password,
    database,
    port,
    host,
    dialect,
    dialectOptions: {
      socketPath:
        process.env.DB_HOST && process.env.DB_HOST.startsWith("/cloudsql")
          ? process.env.DB_HOST
          : undefined,
    },
  };
}

export default getDatabaseConfig();
