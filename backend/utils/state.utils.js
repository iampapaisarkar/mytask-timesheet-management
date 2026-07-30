import { Op } from "sequelize";
import models from "../models/index.js";

const { States } = models;

/**
 * Resolve a state/province id for worldwide addresses.
 * Matches by name first (codes like "WA" collide across countries),
 * then creates a new row when Places returns an unknown area label.
 */
export async function resolveStateId(state, transaction) {
  if (!state) return null;

  if (state.id) {
    const byId = await States.findByPk(state.id, { transaction });
    if (byId) return byId.id;
  }

  const name = String(state.name || "").trim();
  const code = String(state.code || "").trim();

  if (!name && !code) return null;

  if (name) {
    const byName = await States.findOne({
      where: { name: { [Op.like]: name } },
      transaction,
    });
    if (byName) return byName.id;
  }

  const created = await States.create(
    {
      name: name || code,
      code: code || (name ? name.slice(0, 12).toUpperCase() : null),
    },
    { transaction },
  );

  return created.id;
}

export default { resolveStateId };
