// workers.js - Run all workers with one command

import "./workers/location.worker.js";
import "./workers/email.worker.js";
import "./workers/notification.worker.js";
import "./workers/earning-rate.worker.js";
import "./workers/payroll-calendar.worker.js";
import "./workers/employee.worker.js";
import "./workers/timesheet.worker.js";

console.log("🚀 All workers started successfully...");
