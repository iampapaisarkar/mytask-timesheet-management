import { DataTypes } from "sequelize";

async function describe(queryInterface, table) {
  try {
    return await queryInterface.describeTable(table);
  } catch {
    return null;
  }
}

async function indexExists(queryInterface, table, name) {
  try {
    const indexes = await queryInterface.showIndex(table);
    return indexes.some((idx) => idx.name === name);
  } catch {
    return false;
  }
}

/**
 * Long-lived opaque tokens for Background Geolocation HTTP auth.
 * Plaintext is returned once at issue; only SHA-256 hash is stored.
 */
export async function up(queryInterface) {
  const existing = await describe(queryInterface, "tracking_auth_tokens");
  if (!existing) {
    await queryInterface.createTable("tracking_auth_tokens", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      token_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      token_prefix: {
        type: DataTypes.STRING(16),
        allowNull: true,
      },
      platform: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_used_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });
  }

  if (
    !(await indexExists(
      queryInterface,
      "tracking_auth_tokens",
      "tracking_auth_tokens_hash_uidx",
    ))
  ) {
    await queryInterface.addIndex("tracking_auth_tokens", ["token_hash"], {
      name: "tracking_auth_tokens_hash_uidx",
      unique: true,
    });
  }

  if (
    !(await indexExists(
      queryInterface,
      "tracking_auth_tokens",
      "tracking_auth_tokens_user_platform_idx",
    ))
  ) {
    await queryInterface.addIndex(
      "tracking_auth_tokens",
      ["user_id", "platform"],
      { name: "tracking_auth_tokens_user_platform_idx" },
    );
  }
}

export async function down(queryInterface) {
  await queryInterface.dropTable("tracking_auth_tokens").catch(() => undefined);
}
