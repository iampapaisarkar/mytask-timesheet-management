import pkg from "umzug";
const { Umzug, SequelizeStorage } = pkg;
import { getDatabaseConfig } from "../config/config.js"; // Import the function that gets the database config
import { Sequelize } from "sequelize";
import { unlink } from "fs/promises";
import readlineSync from "readline-sync";

// Check if there are enough arguments to determine which command to execute
const args = process.argv.slice(2);

if (args.includes("--single")) {
  const seedName = args[1]; // Seed name is passed as the second argument

  if (!seedName) {
    console.log("Please provide a seed name.");
    process.exit(1);
  }

  // Get the database config based on the provided dbName
  const dbConfig = getDatabaseConfig();

  // Initialize Sequelize with the selected database configuration
  const sequelize = new Sequelize(dbConfig);

  // Set up Umzug to handle seeds
  const umzug = new Umzug({
    migrations: {
      glob: "./seeders/*.js", // Path to your seed files
      resolve: ({ name, path, context: sequelize }) => ({
        name,
        up: async () => {
          const seed = await import(path);
          return seed.up(sequelize);
        },
        down: async () => {
          const seed = await import(path);
          return seed.down(sequelize);
        },
      }),
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }), // Tracks seeds in the DB
  });

  // Function to convert seed name to snake_case (e.g., UserSeeder => user_seeder)
  const toSnakeCase = (str) => {
    return str
      .replace(/([a-z])([A-Z])/g, "$1_$2") // Add underscore between lowercase and uppercase letters
      .toLowerCase(); // Convert everything to lowercase
  };

  const name = seedName ? toSnakeCase(seedName) : null;

  // Run specific seed
  async function runSeed() {
    try {
      const namestring = name.slice(0, -3);

      const executedSeeds = await umzug.executed();
      const pendingSeeds = await umzug.pending();
      const seed = pendingSeeds.find(
        (seed) => seed.name === namestring // Match the seed name directly
      );

      const executedSeed = executedSeeds.find(
        (seed) => seed.name === namestring // Match the seed name directly
      );

      let seedArray = seed ? [seed.name] : [];

      if (executedSeed && namestring === executedSeed.name) {
        // If the seed has already been executed, ask if the user wants to force the seeding again
        const force = readlineSync.keyInYNStrict(
          `${name} has already been executed. Do you want to force seed again?`
        );

        if (!force) {
          console.log("Seed operation canceled.");
          process.exit(0);
        }
        seedArray = executedSeed ? [executedSeed.name] : [];
        await umzug.down({ migrations: seedArray }); // Apply only the specific seed
      }

      if (seedArray.length > 0) {
        // Run a specific seed by calling `umzug.up()` for that seed only
        await umzug.up({ migrations: seedArray }); // Apply only the specific seed
        console.log(`Seed successfully applied: ${seedArray[0]}`);
        process.exit(0);
      } else {
        console.error(`Seed ${name} not found in pending seeds.`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error running seed ${name}:`, error);
      process.exit(1);
    }
  }

  // Execute the single seed
  runSeed();
} else if (args.includes("--all")) {

  // Get the database config based on the provided dbName
  const dbConfig = getDatabaseConfig();

  // Initialize Sequelize with the selected database configuration
  const sequelize = new Sequelize(dbConfig);

  // Set up Umzug to handle seeds
  const umzug = new Umzug({
    migrations: {
      glob: "./seeders/*.js", // Path to your seed files
      resolve: ({ name, path, context: sequelize }) => ({
        name,
        up: async () => {
          const seed = await import(path);
          return seed.up(sequelize);
        },
        down: async () => {
          const seed = await import(path);
          return seed.down(sequelize);
        },
      }),
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }), // Tracks seeds in the DB
  });

  // If no specific name is provided, run all seeds
  async function runAllSeeds() {
    try {
      const executedSeeds = await umzug.executed();

      if (executedSeeds && executedSeeds.length > 0) {
        console.log(
          `Mentioned seeds are already been executed: ${executedSeeds
            .map((seed) => seed.name)
            .join(", ")}`
        );
        // If the seed has already been executed, ask if the user wants to force the seeding again
        const force = readlineSync.keyInYNStrict(
          `Do you want to force seed again?`
        );

        if (!force) {
          console.log("Seed operation canceled.");
          process.exit(0);
        }
        await umzug.down();
      }

      const seeds = await umzug.up(); // Apply all pending seeds
      if (seeds && seeds.length > 0) {
        console.log(
          `Seeds applied: ${seeds.map((seed) => seed.name).join(", ")}`
        );
        process.exit(0);
      } else {
        console.log(`Seeding successfully done`);
        process.exit(0);
      }
    } catch (error) {
      console.error("Error running seeds:", error);
      process.exit(1);
    }
  }

  // Execute all seeds
  runAllSeeds();
} else if (args.includes("--drop")) {
  const seedName = args[1]; // Name of the seed to rollback

  if (!seedName) {
    console.error("Please provide a seed name to rollback.");
    process.exit(1);
  }

  // Get database config
  const dbConfig = getDatabaseConfig();
  const sequelize = new Sequelize(dbConfig);

  // Set up Umzug
  const umzug = new Umzug({
    migrations: {
      glob: "./seeders/*.js", // Path to your seed files
      resolve: ({ name, path, context: sequelize }) => ({
        name,
        up: async () => {
          const seed = await import(path);
          return seed.up(sequelize);
        },
        down: async () => {
          const seed = await import(path);
          return seed.down(sequelize);
        },
      }),
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }), // Tracks seeds in the DB
  });

  // Rollback a specific seed
  async function rollbackSeed() {
    try {
      const executedSeeds = await umzug.executed();
      const namestring = seedName.slice(0, -3);
      const seed = executedSeeds.find((seed) => seed.name === namestring);

      if (!seed) {
        console.error(`Seed ${seedName} not found in executed seeds.`);
        process.exit(1);
      }

      await umzug.down({ migrations: [seed.name] });
      await unlink(seed.path);
      console.log(`Rolled back seed: ${seed.name}`);
      process.exit(0);
    } catch (error) {
      console.error(`Error rolling back seed ${seedName}:`, error);
      process.exit(1);
    }
  }

  rollbackSeed();
} else {
  console.error("Invalid command. Use --single, --all, or --drop.");
  process.exit(1);
}
