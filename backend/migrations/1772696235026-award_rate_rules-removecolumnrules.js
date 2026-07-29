import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.removeColumn({ tableName: "award_rate_rules" }, "rules");
}

export async function down(queryInterface, Sequelize) {
  // Reverting the column name change
  // await queryInterface.renameColumn(
  //   { tableName: "award_rate_rules" },
  //   "old_column_name",
  //   "new_column_name"
  // );
  // Reverting column change datatype
  // await queryInterface.changeColumn(
  //   { tableName: "award_rate_rules" },
  //   "column_name",
  //   {
  //     type: DataTypes.INTEGER, // data_type
  //     allowNull: false, // Revert back to original constraints
  //   }
  // );
  // Dropping the newly added column
  // await queryInterface.removeColumn({ tableName: "award_rate_rules" }, "column_name");
}
