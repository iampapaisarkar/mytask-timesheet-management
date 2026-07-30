import models from "../../models/index.js";

const { Organisations, UserOrganisationRoles, Users } = models;

/**
 * Resolve a compact { id, code } org context for audit attribution.
 * Prefer an explicit organisation; otherwise first org membership for the user.
 */
export async function resolveAuditOrganisation(organisation, userId = null) {
  if (organisation?.id) {
    return {
      id: organisation.id,
      code: organisation.code || null,
      employee: organisation.employee || null,
    };
  }

  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return null;

  const membership = await UserOrganisationRoles.findOne({
    where: { user_id: uid },
    attributes: ["organisation_id"],
    order: [["id", "ASC"]],
    raw: true,
  });
  if (!membership?.organisation_id) return null;

  const org = await Organisations.findByPk(membership.organisation_id, {
    attributes: ["id", "code"],
    raw: true,
  });
  if (!org) return null;

  return {
    id: org.id,
    code: org.code || null,
    employee: organisation?.employee || null,
  };
}

/**
 * Resolve user + org contexts for Firebase auth flows keyed by email.
 */
export async function resolveAuditContextByEmail(email) {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalized) return { user: null, organisation: null };

  const user = await Users.findOne({
    where: { email: normalized },
    attributes: ["id", "email", "first_name", "last_name"],
  });
  if (!user) return { user: null, organisation: null };

  const plain = user.get ? user.get({ plain: true }) : user;
  const organisation = await resolveAuditOrganisation(null, plain.id);
  return { user: plain, organisation };
}

export default {
  resolveAuditOrganisation,
  resolveAuditContextByEmail,
};
