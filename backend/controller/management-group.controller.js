import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const {
  ManagementGroups,
  ManagementGroupEmployees,
  UserOrganisationRoles,
  OrganisationRoles,
  Users,
} = models;
import moment from "moment";
import { enqueueSendEmail } from "../queue-jobs/send-email.job.js";
import { enqueueSendNotification } from "../queue-jobs/send-notification.job.js";

export async function list(req, res, next) {
  const { user, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;
  if (!organisation.acl.managementGroup.list) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    const rowsPerPage = parseInt(rows_per_page) || 10;
    const pageNumber = parseInt(page_number) || 1;
    const offset = (pageNumber - 1) * rowsPerPage;
    const sortBy = sort_by || "id";
    const sortDirection = sort_direction || "asc";

    let whereCondition = {
      organisation_id: organisation.id,
    };

    if (search && search.trim() !== "") {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [{ name: { [Op.like]: `%${search}%` } }],
      };
    }

    if (
      organisation?.role?.code === "manager" ||
      organisation?.role?.code === "staff"
    ) {
      const employeeGroups = await ManagementGroupEmployees.findAll({
        where: {
          employee_id: organisation?.employee?.id,
        },
        raw: true,
      });
      const groupIds = employeeGroups.map((group) => group.group_id);
      whereCondition = {
        ...whereCondition,
        id: { [Op.in]: groupIds },
      };
    }

    const { count, rows: groups } = await ManagementGroups.scope({
      method: ["withEmployee", whereCondition],
    }).findAndCountAll({
      offset,
      limit: rowsPerPage,
      order: [[sortBy, sortDirection]],
      raw: false,
      nest: true,
    });

    const total_pages = Math.ceil(groups.length / rowsPerPage);

    return res.status(200).json({
      data: groups,
      pagination: {
        total_rows: groups.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching management groups:", err);
    return res.status(500).json({
      message: "Unable to fetch management groups",
      details: err.message,
    });
  }
}

export async function create(req, res, next) {
  const { user, organisation, name, group_managers, group_staffs } = req.body;
  if (!organisation.acl.managementGroup.create) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }

  try {
    if (!name) {
      return res.status(501).json({
        message: "Name is required!",
      });
    }

    const currentUTCTime = moment().utc().format();

    const managementGroup = await ManagementGroups.create({
      organisation_id: organisation.id,
      name: name,
      created_at: currentUTCTime,
      created_by: user.id,
      updated_at: currentUTCTime,
      updated_by: user.id,
    });

    // Create Group Managers
    if (group_managers?.length > 0) {
      for (const employee of group_managers) {
        await ManagementGroupEmployees.create({
          organisation_id: organisation.id,
          group_id: managementGroup.id,
          employee_id: employee.id,
          is_manager: true,
        });
      }
    }

    // Create Group Staffs
    if (group_staffs?.length > 0) {
      for (const employee of group_staffs) {
        await ManagementGroupEmployees.create({
          organisation_id: organisation.id,
          group_id: managementGroup.id,
          employee_id: employee.id,
          is_manager: false,
        });
      }
    }

    await sendEmailAndNotification(
      user,
      organisation,
      managementGroup,
      group_managers,
      group_staffs,
    );

    return res.status(200).json({
      message: "Management group created",
    });
  } catch (err) {
    console.log("error::", err);
    res.status(500).json({
      message: "Unable to create management group. Please ty again later.",
      details: err,
    });
  }
}

export async function update(req, res, next) {
  const { user, organisation, name, group_managers, group_staffs } = req.body;
  const id = req?.params?.id;
  if (!organisation.acl.managementGroup.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    if (!name) {
      return res.status(501).json({
        message: "Name is required!",
      });
    }

    const currentUTCTime = moment().utc().format();

    await ManagementGroups.update(
      {
        name: name,
        updated_at: currentUTCTime,
        updated_by: user.id,
      },
      {
        where: { id: id, organisation_id: organisation.id },
      },
    );

    // Delete old mangers and staffs
    await ManagementGroupEmployees.destroy({
      where: {
        organisation_id: organisation.id,
        group_id: id,
      },
    });

    // Create manager
    if (group_managers?.length > 0) {
      for (const employee of group_managers) {
        await ManagementGroupEmployees.create({
          organisation_id: organisation.id,
          group_id: id,
          employee_id: employee.id,
          is_manager: true,
        });
      }
    }

    // Create staff
    if (group_staffs?.length > 0) {
      for (const employee of group_staffs) {
        await ManagementGroupEmployees.create({
          organisation_id: organisation.id,
          group_id: id,
          employee_id: employee.id,
          is_manager: false,
        });
      }
    }

    return res.status(200).json({
      message: "Management group updated",
    });
  } catch (err) {
    console.log("error::", err);
    res.status(500).json({
      message: "Unable to update management group. Please ty again later.",
      details: err,
    });
  }
}

async function sendEmailAndNotification(
  user,
  organisation,
  managementGroup,
  group_managers,
  group_staffs,
) {
  try {
    /* ----------------------------------
     * Get organisation owner
     * ---------------------------------- */
    const organisationOwner = await UserOrganisationRoles.findOne({
      where: {
        organisation_id: organisation.id,
        user_id: {
          [Op.ne]: user.id, // ❌ exclude current user
        },
      },
      include: [
        {
          model: Users,
          as: "user",
        },
        {
          model: OrganisationRoles,
          as: "role",
          attributes: ["id", "name", "code"],
          where: { code: "owner" },
        },
      ],
      raw: true,
      nest: true,
    });
    const organisationOwnerUser = organisationOwner?.user || null;

    /* ----------------------------------
     * NORMAL USERS (staff / managers)
     * ---------------------------------- */
    const subject = `You’ve Been Added to a Management Group (${managementGroup.name}) - ${organisation.name}`;
    const bodyMessage = `${user.full_name} has added you to the ${organisation.name} organization’s management group, ${managementGroup.name}.`;
    // let URL = `${process.env.CLIENT_URL}/${organisation.code}/management-group`;

    const safeManagers = Array.isArray(group_managers) ? group_managers : [];
    const safeStaffs = Array.isArray(group_staffs) ? group_staffs : [];

    const users = [...safeManagers, ...safeStaffs]
      .map((e) => e?.user)
      .filter((u) => u?.id && u.id !== user?.id);

    const sendToEmails = [...new Set(users.map((u) => u.email))];
    const sendToNotificationUserIds = [...new Set(users.map((u) => u.id))];

    /* ----------------------------------
     * OWNER MESSAGE (DIFFERENT CONTENT)
     * ---------------------------------- */
    const ownerMessage = {
      subject: `New Management Group Created (${managementGroup.name}) - ${organisation.name}`,
      body: `${user.full_name} created a new management group.`,
    };

    /* ----------------------------------
     * SEND EMAILS
     * ---------------------------------- */
    if (sendToEmails.length) {
      const message = {
        subject,
        template: "create-management-group.html",
        variables: {
          title: subject,
          message: bodyMessage,
        },
      };

      await enqueueSendEmail({
        user,
        organisation,
        userEmails: [...new Set(sendToEmails)],
        message,
      });
    }

    if (organisationOwnerUser?.email && ownerMessage) {
      await enqueueSendEmail({
        user,
        organisation,
        userEmails: [organisationOwnerUser.email],
        message: {
          subject: ownerMessage.subject,
          template: "create-management-group.html",
          variables: {
            title: ownerMessage.subject,
            message: ownerMessage.body,
          },
        },
      });
    }

    /* ----------------------------------
     * SEND PUSH NOTIFICATIONS
     * ---------------------------------- */
    if (sendToNotificationUserIds.length) {
      await enqueueSendNotification({
        user: user,
        sentToUserIds: sendToNotificationUserIds,
        message: {
          title: subject,
          body: bodyMessage,
        },
      });
    }

    if (organisationOwnerUser?.id && ownerMessage) {
      await enqueueSendNotification({
        user: user,
        sentToUserIds: [organisationOwnerUser.id],
        message: {
          title: ownerMessage.subject,
          body: ownerMessage.body,
        },
      });
    }
  } catch (err) {
    throw err;
  }
}
