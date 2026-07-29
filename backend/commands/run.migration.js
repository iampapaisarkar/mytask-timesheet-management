import pkg from "umzug";
const { Umzug, SequelizeStorage } = pkg;
import { getDatabaseConfig } from "../config/config.js"; // Import the function that gets the database config
import { Sequelize } from "sequelize";
import { unlink } from "fs/promises";
import { pathToFileURL } from "url";
// Check if there are enough arguments to determine which command to execute
const args = process.argv.slice(2);

if (args.includes("--single")) {
  const migrationName = args[1]; // Migration name is passed as the second argument

  if (!migrationName) {
    console.log("Please provide a migration name.");
    process.exit(1);
  }

  // Get the database config based on the provided dbName
  const dbConfig = getDatabaseConfig();

  // Initialize Sequelize with the selected database configuration
  const sequelize = new Sequelize(dbConfig);

  // Set up Umzug to handle migrations
  const umzug = new Umzug({
    migrations: {
      glob: "./migrations/*.js",
      resolve: ({ name, path, context: sequelize }) => {
        const migrationPath = pathToFileURL(path).href; // Convert to file:// URL
        return {
          name,
          up: async () => {
            const migration = await import(migrationPath);
            return migration.up(sequelize);
          },
          down: async () => {
            const migration = await import(migrationPath);
            return migration.down(sequelize);
          },
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
  });

  // Function to convert model name to snake_case (e.g., SystemSettings => system_settings)
  const toSnakeCase = (str) => {
    return str
      .replace(/([a-z])([A-Z])/g, "$1_$2") // Add underscore between lowercase and uppercase letters
      .toLowerCase(); // Convert everything to lowercase
  };

  const name = migrationName ? toSnakeCase(migrationName) : null;

  // Run migrations
  async function runMigrations() {
    try {
      const namestring = name.slice(0, -3);

      const executedMigrations = await umzug.executed();
      const pendingMigrations = await umzug.pending(); // Get all pending migrations
      const migration = pendingMigrations.find(
        (mig) => mig.name === namestring // Match the migration name directly
      );

      const migrationArray = migration ? [migration.name] : [];
      if (
        executedMigrations.length > 0 &&
        namestring === executedMigrations[0].name
      ) {
        console.error(`${name} already executed`);
        process.exit(1);
      }

      if (migrationArray.length > 0) {
        // Run a specific migration by calling `umzug.up()` for that migration only
        await umzug.up({ migrations: migrationArray }); // Apply only the specific migration
        console.log(`Migration successfully applied: ${migration.name}`);
        process.exit(0);
      } else {
        console.error(`Migration ${name} not found in pending migrations.`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error running migration ${name}:`, error);
      process.exit(1);
    }
  }

  // Execute the single migration
  runMigrations();
} else if (args.includes("--all")) {

  // Get the database config based on the provided dbName
  const dbConfig = getDatabaseConfig();

  // Initialize Sequelize with the selected database configuration
  const sequelize = new Sequelize(dbConfig);

  // Set up Umzug to handle migrations
  const umzug = new Umzug({
    migrations: {
      glob: "./migrations/*.js",
      resolve: ({ name, path, context: sequelize }) => {
        const migrationPath = pathToFileURL(path).href; // Convert to file:// URL
        return {
          name,
          up: async () => {
            const migration = await import(migrationPath);
            return migration.up(sequelize);
          },
          down: async () => {
            const migration = await import(migrationPath);
            return migration.down(sequelize);
          },
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
  });

  // If no specific name is provided, run all migrations
  async function runAllMigrations() {
    try {
      const migrations = await umzug.up(); // Apply all pending migrations
      if (migrations && migrations.length > 0) {
        console.log(
          `Migrations applied: ${migrations.map((mig) => mig.name).join(", ")}`
        );
        process.exit(0);
      } else {
        console.log(`Migrated successfully done`);
        process.exit(0);
      }
    } catch (error) {
      console.error("Error running migrations:", error);
      process.exit(1);
    }
  }

  // Execute all migrations
  runAllMigrations();
} else if (args.includes("--drop")) {
  const migrationName = args[1]; // Name of the migration to rollback
  const dbName = process.env.DB_NAME;

  if (!migrationName) {
    console.error("Please provide a migration name to rollback.");
    process.exit(1);
  }

  // Get database config
  const dbConfig = getDatabaseConfig();
  const sequelize = new Sequelize(dbConfig);

  // Set up Umzug
  const umzug = new Umzug({
    migrations: {
      glob: "./migrations/*.js",
      resolve: ({ name, path, context: sequelize }) => {
        const migrationPath = pathToFileURL(path).href; // Convert to file:// URL
        return {
          name,
          up: async () => {
            const migration = await import(migrationPath);
            return migration.up(sequelize);
          },
          down: async () => {
            const migration = await import(migrationPath);
            return migration.down(sequelize);
          },
        };
      },
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
  });

  async function rollbackMigration() {
    try {
      const executedMigrations = await umzug.executed();
      const namestring = migrationName.slice(0, -3);
      const migration = executedMigrations.find(
        (mig) => mig.name === namestring
      );

      if (!migration) {
        console.error(
          `Migration ${migrationName} not found in executed migrations.`
        );
        process.exit(1);
      }

      await umzug.down({ migrations: [migration.name] });
      await unlink(migration.path);
      console.log(`Rolled back migration: ${migration.name}`);
      process.exit(0);
    } catch (error) {
      console.error(`Error rolling back migration ${migrationName}:`, error);
      process.exit(1);
    }
  }

  rollbackMigration();
} else {
  console.error("Invalid command. Use --single or --all.");
  process.exit(1);
}
