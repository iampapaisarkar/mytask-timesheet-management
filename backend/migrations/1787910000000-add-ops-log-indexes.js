/**
 * Finish log-table indexes missed when email_send_logs / external_api_call_logs
 * column names differed from created_at (idempotent).
 */

async function tableExists(queryInterface, table) {
  try {
    await queryInterface.describeTable(table);
    return true;
  } catch {
    return false;
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

async function ensureIndex(queryInterface, table, columns, name) {
  if (!(await tableExists(queryInterface, table))) return;
  if (await indexExists(queryInterface, table, name)) return;
  try {
    await queryInterface.addIndex(table, columns, { name });
  } catch (err) {
    console.warn(`[indexes] skip ${name} on ${table}:`, err.message);
  }
}

export async function up(queryInterface) {
  await ensureIndex(queryInterface, "email_send_logs", ["sent_at"], "email_send_logs_sent_at_idx");
  await ensureIndex(
    queryInterface,
    "external_api_call_logs",
    ["executed_at"],
    "external_api_call_logs_executed_at_idx",
  );
  await ensureIndex(
    queryInterface,
    "external_api_call_logs",
    ["user_id"],
    "external_api_call_logs_user_id_idx",
  );
}

export async function down(queryInterface) {
  for (const [table, name] of [
    ["email_send_logs", "email_send_logs_sent_at_idx"],
    ["external_api_call_logs", "external_api_call_logs_executed_at_idx"],
    ["external_api_call_logs", "external_api_call_logs_user_id_idx"],
  ]) {
    if (!(await tableExists(queryInterface, table))) continue;
    try {
      await queryInterface.removeIndex(table, name);
    } catch {
      /* ignore */
    }
  }
}
