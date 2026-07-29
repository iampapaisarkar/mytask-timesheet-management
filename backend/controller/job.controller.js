import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const {
  Jobs,
  JobAddress,
  ManagementGroupJobs,
  UserOrganisationRoles,
  OrganisationRoles,
  Users,
} = models;
import moment from "moment";
import { enqueueSendEmail } from "../queue-jobs/send-email.job.js";
import { enqueueSendNotification } from "../queue-jobs/send-notification.job.js";
import { resolveStateId } from "../utils/state.utils.js";

export async function list(req, res, next) {
  const { user, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;
  if (!organisation.acl.job.list) {
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
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { site_contact_name: { [Op.like]: `%${search}%` } },
          { site_contact_email: { [Op.like]: `%${search}%` } },
          { site_contact_phone_number: { [Op.like]: `%${search}%` } },
          { address: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    let employeeCondition = {};
    if (
      organisation?.role?.code === "manager" ||
      organisation?.role?.code === "staff"
    ) {
      employeeCondition = {
        employee_id: organisation?.employee?.id,
      };
    }

    const { count, rows: jobs } = await Jobs.scope({
      method: ["withEmployee", employeeCondition],
    }).findAndCountAll({
      where: whereCondition,
      offset,
      limit: rowsPerPage,
      order: [[sortBy, sortDirection]],
      raw: false,
      nest: true,
    });

    const total_pages = Math.ceil(jobs.length / rowsPerPage);

    return res.status(200).json({
      data: jobs,
      pagination: {
        total_rows: jobs.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching jobs:", err);
    return res.status(500).json({
      message: "Unable to fetch jobs",
      details: err.message,
    });
  }
}

export async function create(req, res, next) {
  const {
    user,
    name,
    customer,
    address,
    radius,
    site_contact_name,
    site_contact_email,
    site_contact_phone_number,
    management_groups,
    is_active,
    organisation,
  } = req.body;
  if (!organisation.acl.job.create) {
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
    if (!customer) {
      return res.status(501).json({
        message: "Customer is required!",
      });
    }
    if (!address?.address_1) {
      return res.status(501).json({
        message: "Address Line 1 is required!",
      });
    }
    if (!address?.city) {
      return res.status(501).json({
        message: "City is required!",
      });
    }
    if (!address?.state) {
      return res.status(501).json({
        message: "State is required!",
      });
    }
    if (!address?.postcode) {
      return res.status(501).json({
        message: "Postcode is required!",
      });
    }
    if (!address?.latitude) {
      return res.status(501).json({
        message: "Latitude is required!",
      });
    }
    if (!address?.longitude) {
      return res.status(501).json({
        message: "Longitude is required!",
      });
    }
    if (!radius) {
      return res.status(501).json({
        message: "Radius is required!",
      });
    }
    // if (!site_contact_name) {
    //   return res.status(501).json({
    //     message: "Site contact name is required!",
    //   });
    // }
    // if (!site_contact_email) {
    //   return res.status(501).json({
    //     message: "Site contact email is required!",
    //   });
    // }
    // if (!site_contact_phone_number) {
    //   return res.status(501).json({
    //     message: "Site contact phone number is required!",
    //   });
    // }
    if (management_groups.length <= 0) {
      return res.status(501).json({
        message: "Management groups are required!",
      });
    }

    const currentUTCTime = moment().utc().format();

    const job = await Jobs.create({
      organisation_id: organisation.id,
      name: name,
      customer_id: customer.id,
      radius: radius,
      site_contact_name: site_contact_name,
      site_contact_email: site_contact_email,
      site_contact_phone_number: site_contact_phone_number,
      is_active: is_active,
      created_at: currentUTCTime,
      created_by: user.id,
      updated_at: currentUTCTime,
      updated_by: user.id,
    });

    // Create Address
    if (address) {
      const stateId = await resolveStateId(address.state);
      if (!stateId) {
        return res.status(501).json({
          message: "State / region is required!",
        });
      }
      await JobAddress.create({
        organisation_id: organisation.id,
        job_id: job.id,
        address_1: address?.address_1,
        address_2: address?.address_2,
        city: address?.city,
        state_id: stateId,
        postcode: String(address?.postcode ?? ""),
        latitude: address?.latitude,
        longitude: address?.longitude,
      });
    }

    for (const group of management_groups) {
      await ManagementGroupJobs.create({
        organisation_id: organisation.id,
        group_id: group.id,
        job_id: job.id,
      });
    }

    await sendEmailAndNotification(user, organisation, management_groups, job);

    return res.status(200).json({
      message: "Job created",
    });
  } catch (err) {
    console.log("error::", err);
    res.status(500).json({
      message: "Unable to create job. Please ty again later.",
      details: err,
    });
  }
}

export async function update(req, res, next) {
  const {
    user,
    name,
    customer,
    address,
    latitude,
    longitude,
    radius,
    site_contact_name,
    site_contact_email,
    site_contact_phone_number,
    management_groups,
    is_active,
    organisation,
  } = req.body;
  const id = req?.params?.id;
  if (!organisation.acl.job.edit) {
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
    if (!customer) {
      return res.status(501).json({
        message: "Customer is required!",
      });
    }
    if (!address?.address_1) {
      return res.status(501).json({
        message: "Address Line 1 is required!",
      });
    }
    if (!address?.city) {
      return res.status(501).json({
        message: "City is required!",
      });
    }
    if (!address?.state) {
      return res.status(501).json({
        message: "State is required!",
      });
    }
    if (!address?.postcode) {
      return res.status(501).json({
        message: "Postcode is required!",
      });
    }
    if (!address?.latitude) {
      return res.status(501).json({
        message: "Latitude is required!",
      });
    }
    if (!address?.longitude) {
      return res.status(501).json({
        message: "Longitude is required!",
      });
    }
    if (!radius) {
      return res.status(501).json({
        message: "Radius is required!",
      });
    }
    // if (!site_contact_name) {
    //   return res.status(501).json({
    //     message: "Site contact name is required!",
    //   });
    // }
    // if (!site_contact_email) {
    //   return res.status(501).json({
    //     message: "Site contact email is required!",
    //   });
    // }
    // if (!site_contact_phone_number) {
    //   return res.status(501).json({
    //     message: "Site contact phone number is required!",
    //   });
    // }
    if (management_groups.length <= 0) {
      return res.status(501).json({
        message: "Management groups are required!",
      });
    }

    const currentUTCTime = moment().utc().format();

    const response = await Jobs.update(
      {
        name: name,
        customer_id: customer.id,
        address: address,
        latitude: latitude,
        longitude: longitude,
        radius: radius,
        site_contact_name: site_contact_name,
        site_contact_email: site_contact_email,
        site_contact_phone_number: site_contact_phone_number,
        is_active: is_active,
        updated_at: currentUTCTime,
        updated_by: user.id,
      },
      {
        where: { id: id, organisation_id: organisation.id },
      },
    );

    // Destroy old address
    await JobAddress.destroy({
      where: {
        organisation_id: organisation.id,
        job_id: id,
      },
    });

    // Create Address
    if (address) {
      const stateId = await resolveStateId(address.state);
      if (!stateId) {
        return res.status(501).json({
          message: "State / region is required!",
        });
      }
      await JobAddress.create({
        organisation_id: organisation.id,
        job_id: id,
        address_1: address?.address_1,
        address_2: address?.address_2,
        city: address?.city,
        state_id: stateId,
        postcode: String(address?.postcode ?? ""),
        latitude: address?.latitude,
        longitude: address?.longitude,
      });
    }

    const groupIds = management_groups.map((group) => group.id);

    await ManagementGroupJobs.destroy({
      where: {
        organisation_id: organisation.id,
        job_id: id,
        group_id: { [Op.in]: groupIds },
      },
    });

    for (const group of management_groups) {
      await ManagementGroupJobs.create({
        organisation_id: organisation.id,
        group_id: group.id,
        job_id: id,
      });
    }

    return res.status(200).json({
      message: "Job updated",
      management_groups,
    });
  } catch (err) {
    console.log("error::", err);
    res.status(500).json({
      message: "Unable to update job. Please ty again later.",
      details: err,
    });
  }
}

async function sendEmailAndNotification(
  user,
  organisation,
  managementGroups,
  job,
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
    const subject = `A job assgined to a Management Group (${job.name}) - ${organisation.name}`;
    const bodyMessage = `${user.full_name} has assigned a job to management group - ${job.name}.`;
    // let URL = `${process.env.CLIENT_URL}/${organisation.code}/management-group`;

    const uniqueUsersMap = new Map();

    managementGroups?.forEach((group) => {
      group.employees?.forEach((groupEmployee) => {
        const gUser = groupEmployee?.employee?.user;

        if (gUser?.id && gUser?.id != user.id) {
          // Map ensures no duplicate user.id
          uniqueUsersMap.set(gUser.id, {
            user_id: gUser.id,
            email: gUser.email,
          });
        }
      });
    });

    const uniqueUsers = Array.from(uniqueUsersMap.values());
    const sendToEmails = uniqueUsers.map((u) => u.email);
    const sendToNotificationUserIds = uniqueUsers.map((u) => u.user_id);

    /* ----------------------------------
     * OWNER MESSAGE (DIFFERENT CONTENT)
     * ---------------------------------- */
    const ownerMessage = {
      subject: `New Job Created (${job.name}) - ${organisation.name}`,
      body: `${user.full_name} created a new job.`,
    };

    /* ----------------------------------
     * SEND EMAILS
     * ---------------------------------- */
    if (sendToEmails.length) {
      const message = {
        subject,
        template: "create-job.html",
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
          template: "create-job.html",
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
