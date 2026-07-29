/** Map Sequelize / service rows to stable UI DTOs (no raw table dumps). */

export function mapNamedId(row) {
  if (!row) return null;
  const plain = typeof row.toJSON === "function" ? row.toJSON() : row;
  return {
    id: plain.id,
    name: plain.name ?? null,
    code: plain.code ?? undefined,
  };
}

export function mapNamedIdList(rows = []) {
  return rows.map(mapNamedId).filter(Boolean);
}

export function mapOrganisationMembership(org) {
  const plain = typeof org.toJSON === "function" ? org.toJSON() : org;
  return {
    id: plain.id,
    name: plain.name,
    code: plain.code,
    role: plain.role
      ? {
          id: plain.role.id,
          name: plain.role.name,
          code: plain.role.code,
        }
      : null,
  };
}

export function mapInvitation(invite) {
  const plain = typeof invite.toJSON === "function" ? invite.toJSON() : invite;
  return {
    id: plain.id,
    organisation_id: plain.organisation_id,
    employee_id: plain.employee_id,
    invitation_token: plain.invitation_token,
    status: plain.status
      ? {
          id: plain.status.id,
          name: plain.status.name,
          code: plain.status.code,
        }
      : null,
    organisation: plain.organisation
      ? { id: plain.organisation.id, name: plain.organisation.name }
      : null,
    role: plain.role
      ? {
          id: plain.role.id,
          name: plain.role.name,
          code: plain.role.code,
        }
      : null,
    employee: plain.employee
      ? {
          id: plain.employee.id,
          created_by: plain.employee.created_by,
          creator: plain.employee.creator
            ? {
                id: plain.employee.creator.id,
                full_name: plain.employee.creator.full_name,
                first_name: plain.employee.creator.first_name,
                middle_name: plain.employee.creator.middle_name,
                last_name: plain.employee.creator.last_name,
              }
            : null,
        }
      : null,
  };
}

export function mapNotification(n) {
  const plain = typeof n.toJSON === "function" ? n.toJSON() : n;
  return {
    id: plain.id,
    title: plain.title,
    body: plain.body,
    url: plain.url,
    sent_at: plain.sent_at,
    status: plain.status
      ? {
          id: plain.status.id,
          name: plain.status.name,
          code: plain.status.code,
        }
      : null,
  };
}

export function mapJobOption(job) {
  const plain = typeof job.toJSON === "function" ? job.toJSON() : job;
  return {
    id: plain.id,
    name: plain.name,
    is_active: plain.is_active !== false,
  };
}
