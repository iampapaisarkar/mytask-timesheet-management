import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn({ tableName: "users" }, "dob", {
    type: DataTypes.DATEONLY, // data_type
    after: "email",
  });
}

export async function down(queryInterface, Sequelize) {
  // Reverting the column name change
  // await queryInterface.renameColumn(
  //   { tableName: "users" },
  //   "old_column_name",
  //   "new_column_name"
  // );
  // Reverting column change datatype
  // await queryInterface.changeColumn(
  //   { tableName: "users" },
  //   "column_name",
  //   {
  //     type: DataTypes.INTEGER, // data_type
  //     allowNull: false, // Revert back to original constraints
  //   }
  // );
  // Dropping the newly added column
  // await queryInterface.removeColumn({ tableName: "users" }, "column_name");
}
