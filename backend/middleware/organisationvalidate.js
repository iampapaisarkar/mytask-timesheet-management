import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const {
  Users,
  Organisations,
  OrganisationRoles,
  UserOrganisationRoles,
  EmployeeInvitations,
  InvitationStatus,
  Employees,
  OrganisationSettings,
} = models;
import redisUtils from "../utils/redis.utils.js";
import organisationService from "../service/organisation.service.js";
import { Acl } from "#acl";

const OrganisationValidate = async (req, res, next) => {
  try {
    const { user, orgId, orgCode } = req.body;

    if (!orgId) {
      return res.status(400).json({ message: "Organisation ID missing." });
    }

    const cacheKey = `organisation:${orgId}:${user.id}`;
    const cached = await redisUtils.getCache(cacheKey);
    if (cached) {
      // Always refresh ACL from code so permission changes apply without waiting for cache expiry
      const roleCode = cached?.role?.code || cached?.role_code;
      cached.acl = await Acl.organisationAcl(roleCode);
      req.body.organisation = cached;
      return next();
    }

    const response = await organisationService.getOrganisation(
      user.id,
      orgCode
    );

    if (response.success) {
      await redisUtils.setCache(cacheKey, response.data);

      req.body.organisation = response.data;
      next();
    } else {
      return res.status(400).json({ message: "Invalid Organisation." });
    }
  } catch (err) {
    console.error("Organization check error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export default OrganisationValidate;
