export function parseEventToCron(event, value) {
  const now = new Date();

  switch (event) {
    case "everySecondIn": {
      const interval = Number(value) || 1;
      if (interval < 1 || interval > 59) throw new Error('Invalid second interval');
      return `*/${interval} * * * * *`; // Note the 6-field cron format
    }
    case "everyMinuteIn": {
      const interval = Number(value) || ((now.getMinutes() % 59) + 1);
      return `*/${interval} * * * *`;
    }
    case "everyHourIn": {
      const minute = Number(value) || now.getMinutes();
      return `${minute} * * * *`;
    }
    case "everyDayAt": {
      const time = value || now.toTimeString().split(" ")[0]; // "HH:MM:SS"
      const [hour, minute] = time.split(":").map(Number);
      return `${minute} ${hour} * * *`;
    }
    case "everyWeekAt": {
      const dayName = (
        value || now.toLocaleDateString("en-US", { weekday: "long" })
      ).toLowerCase();
      const days = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      if (!(dayName in days)) throw new Error(`Invalid weekday: ${value}`);
      return `0 0 * * ${days[dayName]}`;
    }
    case "everyMonthAt": {
      const date = Number(value) || now.getDate();
      return `0 0 ${date} * *`;
    }
    default:
      throw new Error(`Unknown event: ${event}`);
  }
}
