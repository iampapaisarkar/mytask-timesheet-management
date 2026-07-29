import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn(
    { tableName: "employee_payrolls" },
    "superannuation_fund",
    {
      type: DataTypes.STRING, // data_type
      allowNull: true, // Allow null values now
    },
  );
}

export async function down(queryInterface, Sequelize) {
  // Reverting the column name change
  // await queryInterface.renameColumn(
  //   { tableName: "employee_payrolls" },
  //   "old_column_name",
  //   "new_column_name"
  // );
  // Reverting column change datatype
  // await queryInterface.changeColumn(
  //   { tableName: "employee_payrolls" },
  //   "column_name",
  //   {
  //     type: DataTypes.INTEGER, // data_type
  //     allowNull: false, // Revert back to original constraints
  //   }
  // );
  // Dropping the newly added column
  // await queryInterface.removeColumn({ tableName: "employee_payrolls" }, "column_name");
}
