import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.removeColumn({ tableName: "jobs" }, "address");
  await queryInterface.removeColumn({ tableName: "jobs" }, "latitude");
  await queryInterface.removeColumn({ tableName: "jobs" }, "longitude");
}

export async function down(queryInterface, Sequelize) {
  // Reverting the column name change
  // await queryInterface.renameColumn(
  //   { tableName: "jobs" },
  //   "old_column_name",
  //   "new_column_name"
  // );
  // Reverting column change datatype
  // await queryInterface.changeColumn(
  //   { tableName: "jobs" },
  //   "column_name",
  //   {
  //     type: DataTypes.INTEGER, // data_type
  //     allowNull: false, // Revert back to original constraints
  //   }
  // );
  // Dropping the newly added column
  // await queryInterface.removeColumn({ tableName: "jobs" }, "column_name");
}
