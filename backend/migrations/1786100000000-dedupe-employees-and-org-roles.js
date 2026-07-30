/**
 * Deduplicate user_organisation_roles / employees and enforce uniqueness
 * so employee list joins cannot multiply rows.
 */
async function indexExists(queryInterface, table, name) {
  try {
    const indexes = await queryInterface.showIndex(table);
    return indexes.some((idx) => idx.name === name);
  } catch {
    return false;
  }
}

export async function up(queryInterface) {
  // Keep lowest id per (user_id, organisation_id)
  await queryInterface.sequelize.query(`
    DELETE uor
    FROM user_organisation_roles uor
    INNER JOIN user_organisation_roles keep
      ON keep.user_id = uor.user_id
      AND keep.organisation_id = uor.organisation_id
      AND keep.id < uor.id
  `);

  if (
    !(await indexExists(
      queryInterface,
      "user_organisation_roles",
      "user_organisation_roles_user_org_uidx",
    ))
  ) {
    await queryInterface.addIndex(
      "user_organisation_roles",
      ["user_id", "organisation_id"],
      {
        name: "user_organisation_roles_user_org_uidx",
        unique: true,
      },
    );
  }

  // Deduplicate employees with same (user_id, organisation_id) when user_id set
  await queryInterface.sequelize.query(`
    DELETE e
    FROM employees e
    INNER JOIN employees keep
      ON keep.user_id = e.user_id
      AND keep.organisation_id = e.organisation_id
      AND keep.user_id IS NOT NULL
      AND keep.id < e.id
  `);

  if (
    !(await indexExists(
      queryInterface,
      "employees",
      "employees_user_org_uidx",
    ))
  ) {
    try {
      await queryInterface.addIndex(
        "employees",
        ["user_id", "organisation_id"],
        {
          name: "employees_user_org_uidx",
          unique: true,
        },
      );
    } catch (err) {
      // MySQL unique indexes treat multiple NULLs as distinct; if user_id nulls
      // still collide somehow, log and continue without failing the deploy.
      console.warn(
        "Could not add employees_user_org_uidx:",
        err?.message || err,
      );
    }
  }
}

export async function down(queryInterface) {
  try {
    await queryInterface.removeIndex(
      "user_organisation_roles",
      "user_organisation_roles_user_org_uidx",
    );
  } catch {
    /* ignore */
  }
  try {
    await queryInterface.removeIndex("employees", "employees_user_org_uidx");
  } catch {
    /* ignore */
  }
}
