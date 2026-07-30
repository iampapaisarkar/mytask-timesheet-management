/**
 * Drop Management Group tables — org scoping is now organisation-role only.
 * Order: junction tables first, then parent.
 */
export async function up(queryInterface) {
  await queryInterface.dropTable({ tableName: "management_group_jobs" });
  await queryInterface.dropTable({ tableName: "management_group_employees" });
  await queryInterface.dropTable({ tableName: "management_groups" });
}

export async function down(queryInterface) {
  // Historical recreate migrations exist under 1763387315252 / 1763387341918 / 1763470749815.
  // Re-running those (or a full migrate from scratch) restores the tables if needed.
  void queryInterface;
}
