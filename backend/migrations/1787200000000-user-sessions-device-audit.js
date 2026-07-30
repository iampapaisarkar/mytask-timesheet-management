import { DataTypes } from "sequelize";

/**
 * Evolve user_sessions into device/audit sessions keyed by token_hash.
 * Auth still uses Firebase Admin verifyIdToken — sessions do not replace crypto.
 */
export async function up(queryInterface) {
  const sequelize = queryInterface.sequelize;
  const desc = await queryInterface.describeTable("user_sessions");

  const add = async (column, definition) => {
    if (!desc[column]) {
      await queryInterface.addColumn("user_sessions", column, definition);
    }
  };

  await add("token_hash", {
    type: DataTypes.STRING(64),
    allowNull: true,
  });
  await add("revoked_at", {
    type: DataTypes.DATE,
    allowNull: true,
  });
  await add("last_activity_at", {
    type: DataTypes.DATE,
    allowNull: true,
  });
  await add("platform", {
    type: DataTypes.STRING(32),
    allowNull: true,
  });
  await add("user_agent", {
    type: DataTypes.STRING(512),
    allowNull: true,
  });

  // Backfill hash from legacy raw token rows
  await sequelize.query(`
    UPDATE user_sessions
    SET token_hash = SHA2(token, 256)
    WHERE token IS NOT NULL
      AND token != ''
      AND (token_hash IS NULL OR token_hash = '')
  `);

  await sequelize.query(`
    UPDATE user_sessions
    SET last_activity_at = COALESCE(last_activity_at, created_at)
    WHERE last_activity_at IS NULL
  `);

  // Clear raw JWTs after hashing (keep column for legacy destroySession fallback briefly)
  await sequelize.query(`
    UPDATE user_sessions SET token = NULL WHERE token_hash IS NOT NULL
  `);

  try {
    await sequelize.query(`
      CREATE INDEX user_sessions_token_hash_idx ON user_sessions (token_hash)
    `);
  } catch {
    /* exists */
  }
  try {
    await sequelize.query(`
      CREATE INDEX user_sessions_user_hash_idx ON user_sessions (user_id, token_hash)
    `);
  } catch {
    /* exists */
  }
}

export async function down(queryInterface) {
  const desc = await queryInterface.describeTable("user_sessions");
  for (const col of [
    "user_agent",
    "platform",
    "last_activity_at",
    "revoked_at",
    "token_hash",
  ]) {
    if (desc[col]) {
      await queryInterface.removeColumn("user_sessions", col);
    }
  }
}
