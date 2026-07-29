import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.removeColumn({ tableName: "employees" }, "address");
  await queryInterface.removeColumn({ tableName: "employees" }, "address_2");
  await queryInterface.removeColumn({ tableName: "employees" }, "city");
  await queryInterface.removeColumn({ tableName: "employees" }, "state_id");
  await queryInterface.removeColumn({ tableName: "employees" }, "postcode");
}

export async function down(queryInterface, Sequelize) {
  // Reverting the column name change
  // await queryInterface.renameColumn(
  //   { tableName: "employees" },
  //   "old_column_name",
  //   "new_column_name"
  // );
  // Reverting column change datatype
  // await queryInterface.changeColumn(
  //   { tableName: "employees" },
  //   "column_name",
  //   {
  //     type: DataTypes.INTEGER, // data_type
  //     allowNull: false, // Revert back to original constraints
  //   }
  // );
  // Dropping the newly added column
  // await queryInterface.removeColumn({ tableName: "employees" }, "column_name");
}
