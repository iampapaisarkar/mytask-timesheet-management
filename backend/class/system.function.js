import moment from "moment";

export const SystemFunction = {
  getPayrollEndDateByPayCycleType: async (type, date) => {
    const mDate = moment(date);

    switch (type) {
      case "WEEKLY":
        return mDate
          .clone()
          .add(1, "week")
          .subtract(1, "day")
          .format("YYYY-MM-DD");

      case "FORTNIGHTLY":
        return mDate
          .clone()
          .add(2, "weeks")
          .subtract(1, "day")
          .format("YYYY-MM-DD");

      case "TWICEMONTHLY":
        return mDate
          .clone()
          .add(15, "days")
          .subtract(1, "day")
          .format("YYYY-MM-DD");

      case "FOURWEEKLY":
        return mDate
          .clone()
          .add(4, "weeks")
          .subtract(1, "day")
          .format("YYYY-MM-DD");

      case "MONTHLY":
        return mDate.clone().add(30, "days").format("YYYY-MM-DD");

      case "QUARTERLY":
        return mDate
          .clone()
          .add(3, "months")
          .subtract(1, "day")
          .format("YYYY-MM-DD");

      default:
        return null;
    }
  },
};
