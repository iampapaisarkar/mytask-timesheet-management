import payoutService from "../service/payout.service.js";
import {
  emitPayoutCreated,
  emitPayoutUpdated,
  emitDashboardUpdated,
} from "../service/realtime.service.js";

function deny(res) {
  return res.status(403).json({
    message: "Access denied: You are not authorized to access this action.",
  });
}

function handleError(res, err, fallbackMessage) {
  console.error(fallbackMessage, err);
  const status = err.statusCode || 500;
  return res.status(status).json({
    message: err.message || fallbackMessage,
    details: err.message,
  });
}

export async function list(req, res) {
  const { organisation } = req.body;
  if (!organisation.acl.payout.list) return deny(res);

  try {
    const {
      employee_id,
      status,
      from,
      to,
      search,
      rows_per_page,
      page_number,
    } = req.query;
    const limit = Math.min(Math.max(Number(rows_per_page) || 10, 1), 100);
    const page = Math.max(Number(page_number) || 1, 1);
    const result = await payoutService.listPayouts(organisation, {
      employee_id,
      status,
      from,
      to,
      search,
      limit,
      offset: (page - 1) * limit,
    });
    const totalRows = Number(result.total) || 0;
    return res.status(200).json({
      data: result.data,
      pagination: {
        total_rows: totalRows,
        rows_per_page: limit,
        page_number: page,
        total_pages: Math.max(1, Math.ceil(totalRows / limit) || 1),
      },
    });
  } catch (err) {
    return handleError(res, err, "Unable to fetch payouts");
  }
}

export async function get(req, res) {
  const { organisation } = req.body;
  if (!organisation.acl.payout.view && !organisation.acl.payout.list) {
    return deny(res);
  }
  try {
    const payout = await payoutService.getPayout(organisation, req.params.id);
    return res.status(200).json({ data: payout });
  } catch (err) {
    return handleError(res, err, "Unable to fetch payout");
  }
}

export async function eligible(req, res) {
  const { organisation } = req.body;
  if (!organisation.acl.payout.list && !organisation.acl.payout.create) {
    return deny(res);
  }

  try {
    const timesheets = await payoutService.listEligibleTimesheets(organisation);
    return res.status(200).json({ data: timesheets });
  } catch (err) {
    return handleError(res, err, "Unable to fetch eligible timesheets");
  }
}

export async function create(req, res) {
  const {
    user,
    organisation,
    timesheet_id,
    notes,
    as_draft,
    deductions,
    bonuses,
    adjustments,
    tax_amount,
    pay_date,
  } = req.body;
  if (!organisation.acl.payout.create) return deny(res);

  try {
    const payout = await payoutService.createPayout({
      organisation,
      user,
      timesheet_id,
      notes,
      as_draft: Boolean(as_draft),
      deductions,
      bonuses,
      adjustments,
      tax_amount,
      pay_date,
    });
    emitPayoutCreated(organisation.id, payout, user?.id);
    emitDashboardUpdated(organisation.id);
    return res.status(200).json({
      data: payout,
      message: "Payout created",
    });
  } catch (err) {
    return handleError(res, err, "Unable to create payout");
  }
}

export async function submit(req, res) {
  const { user, organisation, notes } = req.body;
  if (!organisation.acl.payout.edit) return deny(res);
  try {
    const payout = await payoutService.submitForApproval({
      organisation,
      user,
      id: req.params.id,
      notes,
    });
    emitPayoutUpdated(organisation.id, payout, user?.id);
    emitDashboardUpdated(organisation.id);
    return res.status(200).json({ data: payout, message: "Payout submitted" });
  } catch (err) {
    return handleError(res, err, "Unable to submit payout");
  }
}

export async function approve(req, res) {
  const { user, organisation, notes } = req.body;
  if (!organisation.acl.payout.edit) return deny(res);
  try {
    const payout = await payoutService.approve({
      organisation,
      user,
      id: req.params.id,
      notes,
    });
    emitPayoutUpdated(organisation.id, payout, user?.id);
    emitDashboardUpdated(organisation.id);
    return res.status(200).json({ data: payout, message: "Payout approved" });
  } catch (err) {
    return handleError(res, err, "Unable to approve payout");
  }
}

export async function release(req, res) {
  const { user, organisation, notes } = req.body;
  if (!organisation.acl.payout.edit) return deny(res);
  try {
    const payout = await payoutService.release({
      organisation,
      user,
      id: req.params.id,
      notes,
    });
    emitPayoutUpdated(organisation.id, payout, user?.id);
    emitDashboardUpdated(organisation.id);
    return res
      .status(200)
      .json({ data: payout, message: "Payout ready for payout" });
  } catch (err) {
    return handleError(res, err, "Unable to release payout");
  }
}

export async function markPaid(req, res) {
  const { user, organisation, notes } = req.body;
  const { id } = req.params;
  if (!organisation.acl.payout.edit) return deny(res);

  try {
    const payout = await payoutService.markPaid({
      organisation,
      user,
      id,
      notes,
    });
    emitPayoutUpdated(organisation.id, payout, user?.id);
    emitDashboardUpdated(organisation.id);
    return res.status(200).json({
      data: payout,
      message: "Payout marked as paid",
    });
  } catch (err) {
    return handleError(res, err, "Unable to mark payout as paid");
  }
}

export async function cancel(req, res) {
  const { user, organisation, notes } = req.body;
  if (!organisation.acl.payout.edit) return deny(res);
  try {
    const payout = await payoutService.cancel({
      organisation,
      user,
      id: req.params.id,
      notes,
    });
    emitPayoutUpdated(organisation.id, payout, user?.id);
    emitDashboardUpdated(organisation.id);
    return res.status(200).json({ data: payout, message: "Payout cancelled" });
  } catch (err) {
    return handleError(res, err, "Unable to cancel payout");
  }
}

export async function adjust(req, res) {
  const {
    user,
    organisation,
    deductions,
    bonuses,
    adjustments,
    tax_amount,
    notes,
  } = req.body;
  if (!organisation.acl.payout.edit) return deny(res);
  try {
    const payout = await payoutService.updateAmounts({
      organisation,
      user,
      id: req.params.id,
      deductions,
      bonuses,
      adjustments,
      tax_amount,
      notes,
    });
    emitPayoutUpdated(organisation.id, payout, user?.id);
    return res.status(200).json({ data: payout, message: "Payout updated" });
  } catch (err) {
    return handleError(res, err, "Unable to update payout");
  }
}

export async function exportCsv(req, res) {
  const { organisation } = req.body;
  if (!organisation.acl.payout.list) return deny(res);
  try {
    const csv = await payoutService.exportCsv(organisation, req.query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="payouts-${organisation.code || "org"}.csv"`,
    );
    return res.status(200).send(csv);
  } catch (err) {
    return handleError(res, err, "Unable to export payouts");
  }
}
