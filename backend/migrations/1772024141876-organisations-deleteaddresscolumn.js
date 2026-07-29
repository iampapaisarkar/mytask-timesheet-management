import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.removeColumn({ tableName: "organisations" }, "address");
  await queryInterface.removeColumn({ tableName: "organisations" }, "city");
  await queryInterface.removeColumn({ tableName: "organisations" }, "state");
  await queryInterface.removeColumn({ tableName: "organisations" }, "country");
  await queryInterface.removeColumn({ tableName: "organisations" }, "postcode");
}

export async function down(queryInterface, Sequelize) {
  // Reverting the column name change
  // await queryInterface.renameColumn(
  //   { tableName: "organisations" },
  //   "old_column_name",
  //   "new_column_name"
  // );
  // Reverting column change datatype
  // await queryInterface.changeColumn(
  //   { tableName: "organisations" },
  //   "column_name",
  //   {
  //     type: DataTypes.INTEGER, // data_type
  //     allowNull: false, // Revert back to original constraints
  //   }
  // );
  // Dropping the newly added column
  // await queryInterface.removeColumn({ tableName: "organisations" }, "column_name");
}
