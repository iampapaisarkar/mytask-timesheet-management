// graphql/context/context.js
import Auth from "#auth";
import models from "../models/index.js";
const { Organisations, UserOrganisationRoles } = models;
import { Acl } from "#acl";

export const context = async ({ req }) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) throw new Error("Unauthorized: token missing");

  const response = await Auth.verifyToken(token);
  if (!response?.success) throw new Error("Unauthorized: invalid token");

  const userResponse = await Auth.getUserByToken(token);
  if (!userResponse?.success) throw new Error("Unauthorized: user not found");

  const user = userResponse.user;

  // Organisation info (optional, may be required by some queries)
  const orgId = req.headers["ms-organisation-id"];

  const organisationResponse = await Organisations.scope({
    method: ["withUser", user.id],
  }).findOne({
    where: {
      id: orgId,
    },
    raw: false,
    nest: true,
  });

  const org = organisationResponse?.toJSON() ?? null;

  const acl = await Acl.organisationAcl(org?.role?.code);

  if (!org) throw new Error("Unauthorized: organisation invalid");

  const orgRole = await UserOrganisationRoles.findOne({
    where: { organisation_id: orgId, user_id: user.id },
    raw: true,
  });

  if (!orgRole)
    throw new Error(
      "Access denied: You are not authorized to access this organisation."
    );

  return { user, organisation: { ...org, acl: acl } };
};
