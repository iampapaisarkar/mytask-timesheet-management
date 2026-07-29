import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  // Adding a new column 'status' to the 'test' table
  await queryInterface.addColumn({ tableName: "timesheets" }, "status_id", {
    type: DataTypes.INTEGER, // data_type
    after: "period_end_date",
  });

  await queryInterface.addColumn(
    { tableName: "timesheets" },
    "approval_reason",
    {
      type: DataTypes.TEXT, // data_type
      after: "status_id",
    }
  );

  await queryInterface.addColumn({ tableName: "timesheets" }, "reject_reason", {
    type: DataTypes.TEXT, // data_type
    after: "approval_reason",
  });

  // Renaming an existing column (example: 'name' → 'full_name')
  // await queryInterface.renameColumn(
  //   { tableName: "timesheets" },
  //   "old_column_name",
  //   "new_column_name"
  // );

  // Changing an existing column type (example: change created_by to allow NULL)
  // await queryInterface.changeColumn(
  //   { tableName: "timesheets" },
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
  //   { tableName: "timesheets" },
  //   "old_column_name",
  //   "new_column_name"
  // );
  // Reverting column change datatype
  // await queryInterface.changeColumn(
  //   { tableName: "timesheets" },
  //   "column_name",
  //   {
  //     type: DataTypes.INTEGER, // data_type
  //     allowNull: false, // Revert back to original constraints
  //   }
  // );
  // Dropping the newly added column
  // await queryInterface.removeColumn({ tableName: "timesheets" }, "column_name");
}
