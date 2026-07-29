import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn(
    { tableName: "management_groups" },
    "default",
    {
      type: DataTypes.BOOLEAN, // data_type
      default: false,
      after: "name",
    },
  );
}

export async function down(queryInterface, Sequelize) {
  // Reverting the column name change
  // await queryInterface.renameColumn(
  //   { tableName: "management_groups" },
  //   "old_column_name",
  //   "new_column_name"
  // );
  // Reverting column change datatype
  // await queryInterface.changeColumn(
  //   { tableName: "management_groups" },
  //   "column_name",
  //   {
  //     type: DataTypes.INTEGER, // data_type
  //     allowNull: false, // Revert back to original constraints
  //   }
  // );
  // Dropping the newly added column
  // await queryInterface.removeColumn({ tableName: "management_groups" }, "column_name");
}
