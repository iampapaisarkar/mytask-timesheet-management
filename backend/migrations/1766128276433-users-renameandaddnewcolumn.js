import { DataTypes } from "sequelize";

export async function up(queryInterface, Sequelize) {
  await queryInterface.renameColumn(
    { tableName: "users" },
    "name",
    "first_name"
  );

  await queryInterface.addColumn({ tableName: "users" }, "middle_name", {
    type: DataTypes.STRING,
    allowNull: true,
    after: "first_name",
  });

  await queryInterface.addColumn({ tableName: "users" }, "last_name", {
    type: DataTypes.STRING,
    allowNull: true,
    after: "middle_name",
  });

  // Changing an existing column type (example: change created_by to allow NULL)
  // await queryInterface.changeColumn(
  //   { tableName: "users" },
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
