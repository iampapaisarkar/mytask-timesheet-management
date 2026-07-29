import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  // Adding a new column 'status' to the 'test' table
  await queryInterface.addColumn({ tableName: "employees" }, "address_2", {
    type: DataTypes.TEXT,
    allowNull: true,
    after: "address",
  });

  await queryInterface.addColumn({ tableName: "employees" }, "city", {
    type: DataTypes.STRING,
    allowNull: true,
    after: "address_2",
  });

  await queryInterface.addColumn({ tableName: "employees" }, "state_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
    after: "city",
  });

  // Renaming an existing column (example: 'name' → 'full_name')
  // await queryInterface.renameColumn(
  //   { tableName: "employees" },
  //   "old_column_name",
  //   "new_column_name"
  // );

  // Changing an existing column type (example: change created_by to allow NULL)
  // await queryInterface.changeColumn(
  //   { tableName: "employees" },
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
