import payoutService from "../service/payout.service.js";

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
    const payouts = await payoutService.listPayouts(organisation);
    return res.status(200).json({ data: payouts });
  } catch (err) {
    return handleError(res, err, "Unable to fetch payouts");
  }
}

export async function eligible(req, res) {
  const { organisation } = req.body;
  if (!organisation.acl.payout.list) return deny(res);

  try {
    const timesheets = await payoutService.listEligibleTimesheets(organisation);
    return res.status(200).json({ data: timesheets });
  } catch (err) {
    return handleError(res, err, "Unable to fetch eligible timesheets");
  }
}

export async function create(req, res) {
  const { user, organisation, timesheet_id, notes } = req.body;
  if (!organisation.acl.payout.create) return deny(res);

  try {
    const payout = await payoutService.createPayout({
      organisation,
      user,
      timesheet_id,
      notes,
    });
    return res.status(200).json({
      data: payout,
      message: "Payout created",
    });
  } catch (err) {
    return handleError(res, err, "Unable to create payout");
  }
}

export async function markPaid(req, res) {
  const { user, organisation } = req.body;
  const { id } = req.params;
  if (!organisation.acl.payout.edit) return deny(res);

  try {
    const payout = await payoutService.markPaid({
      organisation,
      user,
      id,
    });
    return res.status(200).json({
      data: payout,
      message: "Payout marked as paid",
    });
  } catch (err) {
    return handleError(res, err, "Unable to mark payout as paid");
  }
}
