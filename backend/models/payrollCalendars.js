import { DataTypes } from "sequelize";
import { mysheet } from "../database.js";
import moment from "moment";

function getNextPayPeriods(startDate, endDate, payCycleType) {
  if (!startDate) return null;
  if (!payCycleType) return null;

  const dates = [];

  const formatDisplay = (d) => moment(d, "YYYY-MM-DD").format("DD MMM YYYY");
  const parse = (d) => moment(d, "YYYY-MM-DD");

  dates[0] = {
    start_date: startDate,
    end_date: endDate,
    label: `${formatDisplay(startDate)} - ${formatDisplay(endDate)}`,
  };

  let lastEnd = parse(endDate);

  for (let i = 1; i <= 3; i++) {
    const start = lastEnd.clone().add(1, "day");
    let periodEnd;
    switch (payCycleType) {
      case "WEEKLY":
        periodEnd = start.clone().add(7, "days").subtract(1, "day");
        break;

      case "FORTNIGHTLY":
        periodEnd = start.clone().add(14, "days").subtract(1, "day");
        break;

      case "FOURWEEKLY":
        periodEnd = start.clone().add(28, "days").subtract(1, "day");
        break;

      case "MONTHLY":
        periodEnd = start.clone().add(1, "month").subtract(1, "day");
        break;

      case "TWICEMONTHLY":
        // Usually 1–15 and 16–end of month
        const day = start.date();

        if (day <= 15) {
          periodEnd = start.clone().date(15);
        } else {
          periodEnd = start.clone().endOf("month");
        }
        break;

      case "QUARTERLY":
        periodEnd = start.clone().add(3, "months").subtract(1, "day");
        break;

      default:
        throw new Error("Unsupported pay cycle frequency");
    }

    lastEnd = periodEnd;

    dates[i] = {
      start_date: start.format("YYYY-MM-DD"),
      end_date: periodEnd.format("YYYY-MM-DD"),
      label: `${formatDisplay(start)} - ${periodEnd.format("DD MMM YYYY")}`,
    };
  }

  return dates;
}

function getNextPayPeriod(startDate, endDate) {
  if (!startDate) return null;

  return `${moment(startDate, "YYYY-MM-DD").format("DD MMM YYYY")} - ${moment(
    endDate,
    "YYYY-MM-DD"
  ).format("DD MMM YYYY")}`;
}

const PayrollCalendars = mysheet.define(
  "PayrollCalendars",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    organisation_id: DataTypes.INTEGER,
    name: DataTypes.STRING,
    pay_cycle_id: DataTypes.INTEGER,
    start_date: DataTypes.DATEONLY,
    end_date: DataTypes.DATEONLY,
    first_payment_date: DataTypes.DATEONLY,
    default: DataTypes.BOOLEAN,
    xero_payroll_calendar_id: DataTypes.UUID,

    created_at: DataTypes.DATE,
    created_by: DataTypes.INTEGER,
    updated_at: DataTypes.DATE,
    updated_by: DataTypes.INTEGER,
    push_to_xero: {
      type: DataTypes.VIRTUAL,
      get() {
        return true;
      },
    },

    next_pay_period: {
      type: DataTypes.VIRTUAL,
      get() {
        return getNextPayPeriod(this.start_date, this.end_date);
      },
    },

    next_pay_periods: {
      type: DataTypes.VIRTUAL,
      get() {
        return getNextPayPeriods(
          this.start_date,
          this.end_date,
          this.pay_cycle?.code
        );
      },
    },
  },
  {
    tableName: "payroll_calendars",
    timestamps: false,
  }
);

// -----------------------------
//   ASSOCIATIONS
// -----------------------------
PayrollCalendars.associate = (models) => {
  models.PayrollCalendars.belongsTo(models.PayCycles, {
    foreignKey: "pay_cycle_id",
    as: "pay_cycle",
  });
};

export default PayrollCalendars;
