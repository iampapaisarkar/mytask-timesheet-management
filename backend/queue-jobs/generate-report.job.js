import { reportQueue } from "../queue/report.queue.js";
import reportRequestService from "../service/report-request.service.js";
import models from "../models/index.js";

const { ReportRequests } = models;

/**
 * Prefer queue; if Redis is down, process immediately so reports still complete.
 */
export async function enqueueGenerateReport({
  reportRequestId,
  organisationId,
  organisationCode,
  requestedBy,
}) {
  try {
    await ReportRequests.update(
      {
        status: "queued",
        updated_at: new Date(),
      },
      { where: { id: reportRequestId } },
    );

    await reportQueue.add(
      "generate-report",
      {
        reportRequestId,
        organisationId,
        organisationCode,
        requestedBy,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    return { queued: true };
  } catch (err) {
    console.error(
      "Report queue unavailable, processing immediately:",
      err?.message || err,
    );
    await reportRequestService.processReportRequest(reportRequestId);
    return { queued: false, processed: true };
  }
}
