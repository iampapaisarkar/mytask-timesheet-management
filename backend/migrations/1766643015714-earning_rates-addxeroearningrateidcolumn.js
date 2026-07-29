import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  // Adding a new column 'status' to the 'test' table
  await queryInterface.addColumn(
    { tableName: "earning_rates" },
    "xero_earning_rate_id",
    {
      type: DataTypes.UUID, // data_type
      allowNull: true, // Adjust as needed
      defaultValue: null,
      after: "rate",
    }
  );

  // Renaming an existing column (example: 'name' → 'full_name')
  // await queryInterface.renameColumn(
  //   { tableName: "earning_rates" },
  //   "old_column_name",
  //   "new_column_name"
  // );

  // Changing an existing column type (example: change created_by to allow NULL)
  // await queryInterface.changeColumn(
  //   { tableName: "earning_rates" },
  //   "column_name",
  //   {
  //     type: DataTypes.INTEGER, // data_type
  //     allowNull: true, // Allow null values now
  //   }
  // );
}

export async function down(queryInterface, Sequelize) {
  // Reverting the column name change
  // await queryInterface.renameColumn(
  //   { tableName: "earning_rates" },
  //   "old_column_name",
  //   "new_column_name"
  // );
  // Reverting column change datatype
  // await queryInterface.changeColumn(
  //   { tableName: "earning_rates" },
  //   "column_name",
  //   {
  //     type: DataTypes.INTEGER, // data_type
  //     allowNull: false, // Revert back to original constraints
  //   }
  // );
  // Dropping the newly added column
  // await queryInterface.removeColumn({ tableName: "earning_rates" }, "column_name");
}
