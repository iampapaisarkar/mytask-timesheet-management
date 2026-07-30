import { DataTypes } from "sequelize";

const TABLES = {
  employees: "employees",
  earningRates: "earning_rates",
  payrollCalendars: "payroll_calendars",
  timesheets: "timesheets",
  xeroConnections: "xero_connections",
};

async function hasColumn(queryInterface, tableName, columnName) {
  try {
    const table = await queryInterface.describeTable(tableName);
    return Boolean(table[columnName]);
  } catch {
    return false;
  }
}

async function hasTable(queryInterface, tableName) {
  try {
    await queryInterface.describeTable(tableName);
    return true;
  } catch {
    return false;
  }
}

export async function up(queryInterface) {
  if (await hasColumn(queryInterface, TABLES.employees, "xero_employee_id")) {
    await queryInterface.removeColumn(TABLES.employees, "xero_employee_id");
  }

  if (
    await hasColumn(queryInterface, TABLES.earningRates, "xero_earning_rate_id")
  ) {
    await queryInterface.removeColumn(
      TABLES.earningRates,
      "xero_earning_rate_id",
    );
  }

  if (
    await hasColumn(
      queryInterface,
      TABLES.payrollCalendars,
      "xero_payroll_calendar_id",
    )
  ) {
    await queryInterface.removeColumn(
      TABLES.payrollCalendars,
      "xero_payroll_calendar_id",
    );
  }

  if (await hasColumn(queryInterface, TABLES.timesheets, "xero_timesheet_id")) {
    await queryInterface.removeColumn(TABLES.timesheets, "xero_timesheet_id");
  }

  if (await hasTable(queryInterface, TABLES.xeroConnections)) {
    await queryInterface.dropTable(TABLES.xeroConnections);
  }
}

export async function down(queryInterface) {
  if (!(await hasTable(queryInterface, TABLES.xeroConnections))) {
    await queryInterface.createTable(TABLES.xeroConnections, {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      organisation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      connection_id: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      tenant_id: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    });
  }

  if (!(await hasColumn(queryInterface, TABLES.employees, "xero_employee_id"))) {
    await queryInterface.addColumn(TABLES.employees, "xero_employee_id", {
      type: DataTypes.UUID,
      allowNull: true,
    });
  }

  if (
    !(await hasColumn(queryInterface, TABLES.earningRates, "xero_earning_rate_id"))
  ) {
    await queryInterface.addColumn(
      TABLES.earningRates,
      "xero_earning_rate_id",
      {
        type: DataTypes.UUID,
        allowNull: true,
      },
    );
  }

  if (
    !(await hasColumn(
      queryInterface,
      TABLES.payrollCalendars,
      "xero_payroll_calendar_id",
    ))
  ) {
    await queryInterface.addColumn(
      TABLES.payrollCalendars,
      "xero_payroll_calendar_id",
      {
        type: DataTypes.UUID,
        allowNull: true,
      },
    );
  }

  if (!(await hasColumn(queryInterface, TABLES.timesheets, "xero_timesheet_id"))) {
    await queryInterface.addColumn(TABLES.timesheets, "xero_timesheet_id", {
      type: DataTypes.UUID,
      allowNull: true,
    });
  }
}
