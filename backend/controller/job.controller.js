import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const {
  Jobs,
  JobAddress,
  UserOrganisationRoles,
  OrganisationRoles,
  Users,
} = models;
import moment from "moment";
import { enqueueSendEmail } from "../queue-jobs/send-email.job.js";
import { enqueueSendNotification } from "../queue-jobs/send-notification.job.js";
import { resolveStateId } from "../utils/state.utils.js";
import { resolvePhoneFields } from "../utils/phone.js";
import { buildAddressRow } from "../utils/address.utils.js";

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
    site_contact_phone_country_code,
    site_contact_phone_country_iso,
    organisation,
  } = req.body;
  if (!organisation.acl.job.create) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    const { assertOrganisationSetupComplete } = await import(
      "../utils/org-setup.utils.js"
    );
    await assertOrganisationSetupComplete(organisation.id);

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
    if (!address?.address_1 && !address?.address_line_1 && !address?.formatted_address && !address?.street_address && !address?.street) {
      return res.status(400).json({
        message: "Please select an address from Google Places suggestions.",
      });
    }
    if (!address?.latitude && address?.latitude !== 0) {
      return res.status(501).json({
        message: "Latitude is required!",
      });
    }
    if (!address?.longitude && address?.longitude !== 0) {
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

    let sitePhone;
    try {
      sitePhone = resolvePhoneFields({
        phone_number: site_contact_phone_number,
        phone_country_code: site_contact_phone_country_code,
        phone_country_iso: site_contact_phone_country_iso,
        required: false,
        label: "Site contact phone",
      });
    } catch (phoneErr) {
      return res.status(phoneErr.status || 400).json({
        message: phoneErr.message,
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
      site_contact_phone_number: sitePhone.phone_number,
      site_contact_phone_country_code: sitePhone.phone_country_code,
      site_contact_phone_country_iso: sitePhone.phone_country_iso,
      created_at: currentUTCTime,
      created_by: user.id,
      updated_at: currentUTCTime,
      updated_by: user.id,
    });

    // Create Address
    if (address) {
      const stateId = await resolveStateId(
        address.state ||
          (address.state_region_province || address.administrative_area
            ? { name: address.state_region_province || address.administrative_area }
            : null),
      );
      const row = buildAddressRow(address, {
        organisationId: organisation.id,
        extra: { job_id: job.id, state_id: stateId },
        includeCoordinates: true,
      });
      await JobAddress.create(row);
    }

    await sendEmailAndNotification(user, organisation, job);

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
    site_contact_phone_country_code,
    site_contact_phone_country_iso,
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
    if (!address?.address_1 && !address?.address_line_1 && !address?.formatted_address && !address?.street_address && !address?.street) {
      return res.status(400).json({
        message: "Please select an address from Google Places suggestions.",
      });
    }
    if (!address?.latitude && address?.latitude !== 0) {
      return res.status(501).json({
        message: "Latitude is required!",
      });
    }
    if (!address?.longitude && address?.longitude !== 0) {
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

    let sitePhone;
    try {
      sitePhone = resolvePhoneFields({
        phone_number: site_contact_phone_number,
        phone_country_code: site_contact_phone_country_code,
        phone_country_iso: site_contact_phone_country_iso,
        required: false,
        label: "Site contact phone",
      });
    } catch (phoneErr) {
      return res.status(phoneErr.status || 400).json({
        message: phoneErr.message,
      });
    }

    const currentUTCTime = moment().utc().format();

    const response = await Jobs.update(
      {
        name: name,
        customer_id: customer.id,
        radius: radius,
        site_contact_name: site_contact_name,
        site_contact_email: site_contact_email,
        site_contact_phone_number: sitePhone.phone_number,
        site_contact_phone_country_code: sitePhone.phone_country_code,
        site_contact_phone_country_iso: sitePhone.phone_country_iso,
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
      const stateId = await resolveStateId(
        address.state ||
          (address.state_region_province || address.administrative_area
            ? { name: address.state_region_province || address.administrative_area }
            : null),
      );
      const row = buildAddressRow(address, {
        organisationId: organisation.id,
        extra: { job_id: id, state_id: stateId },
        includeCoordinates: true,
      });
      await JobAddress.create(row);
    }

    return res.status(200).json({
      message: "Job updated",
    });
  } catch (err) {
    console.log("error::", err);
    res.status(500).json({
      message: "Unable to update job. Please ty again later.",
      details: err,
    });
  }
}

async function sendEmailAndNotification(user, organisation, job) {
  try {
    /* ----------------------------------
     * Notify org owners, moderators, managers
     * ---------------------------------- */
    const orgManagers = await UserOrganisationRoles.findAll({
      where: {
        organisation_id: organisation.id,
        user_id: {
          [Op.ne]: user.id,
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
          where: { code: { [Op.in]: ["owner", "moderator", "manager"] } },
        },
      ],
      raw: true,
      nest: true,
    });

    const subject = `New Job Created (${job.name}) - ${organisation.name}`;
    const bodyMessage = `${user.full_name} created a new job - ${job.name}.`;

    const uniqueUsersMap = new Map();
    orgManagers?.forEach((row) => {
      const gUser = row?.user;
      if (gUser?.id && gUser?.id != user.id) {
        uniqueUsersMap.set(gUser.id, {
          user_id: gUser.id,
          email: gUser.email,
        });
      }
    });

    const uniqueUsers = Array.from(uniqueUsersMap.values());
    const sendToEmails = uniqueUsers.map((u) => u.email);
    const sendToNotificationUserIds = uniqueUsers.map((u) => u.user_id);

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
  } catch (err) {
    throw err;
  }
}
