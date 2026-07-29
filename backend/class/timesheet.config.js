export const TimesheetConfig = {
  dayTaskFields: async (role) => {
    const fields = {
      id: null,
      job: null,
      start_time: null,
      end_time: null,
      remarks: null,
      is_break: false,
      is_travel: false,
      source: "manual",
    };
    return fields;
  },

  dayTasksPermissions: async (isManagement, status) => {
    return {
      can_save: canSave(isManagement, status),
    };
  },
  timesheetPermissions: async (isManagement, status) => {
    return {
      can_submit: canSubmit(isManagement, status),
      can_approve: canApprove(isManagement, status),
      can_reject: canReject(isManagement, status),
      can_revert_to_draft: canRevertToDraft(isManagement, status),
    };
  },
};

// -----------------------------
// Permission Handlers
// -----------------------------

const canSave = (isManagement = false, status = null) => {
  // Employee or Management can save only when draft
  const allowed = ["draft"];
  return allowed.includes(status);
};

const canSubmit = (isManagement = false, status = null) => {
  // Employee or Management can submit only when draft
  const allowed = ["draft"];
  return allowed.includes(status);
};

const canApprove = (isManagement = false, status = null) => {
  if (!isManagement) return false;
  // Management approves only when submitted
  return status === "submitted";
};

const canReject = (isManagement = false, status = null) => {
  if (!isManagement) return false;
  // Management rejects only when submitted
  return status === "submitted";
};

const canRevertToDraft = (isManagement = false, status = null) => {
  if (!isManagement) return false;
  // Management revert back to draft only when submitted or rejected
  const allowed = ["submitted", "rejected"];
  return allowed.includes(status);
};
