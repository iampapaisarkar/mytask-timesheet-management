import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const { Notifications, NotificationStatus } = models;
import { FirebaseMessaging } from "#firebasemessaging";

export async function notifications(req, res, next) {
  const { user, locale } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;
  try {
    const rowsPerPage = parseInt(rows_per_page) || 10;
    const pageNumber = parseInt(page_number) || 1;
    const offset = (pageNumber - 1) * rowsPerPage;
    const sortBy = sort_by || "id";
    const sortDirection = sort_direction || "asc";

    const { count, rows: notifications } = await Notifications.findAndCountAll({
      attributes: ["id", "title", "body", "url", "sent_at"],
      where: {
        user_id: user.id,
      },
      include: [
        {
          model: NotificationStatus,
          as: "status",
          attributes: ["id", "name", "code"],
          on: {
            id: { [Op.eq]: col("Notifications.status_id") },
          },
          required: true,
        },
      ],
      offset: offset,
      limit: rowsPerPage,
      raw: false,
      nest: true,
      subQuery: false,
      order: [["sent_at", "desc"]],
    });

    const unreadCount = await Notifications.count({
      where: {
        user_id: user.id,
      },
      include: [
        {
          model: NotificationStatus,
          as: "status",
          on: {
            id: { [Op.eq]: col("Notifications.status_id") },
          },
          required: true,
          where: {
            code: "unread",
          },
        },
      ],
    });

    // Build pagination metadata
    const total_pages = Math.ceil(count / rows_per_page);

    const pagination = {
      total_rows: notifications.length,
      rows_per_page: rowsPerPage,
      page_number: pageNumber,
      total_pages,
      sort_by: sortBy,
      sort_direction: sortDirection,
    };

    return res.status(200).json({
      data: notifications,
      pagination: pagination,
      unread_count: unreadCount,
    });
  } catch (err) {
    console.log("err: ", err);
    return res.status(500).json({
      message: "Unable to fetch notifications.",
      details: err,
    });
  }
}

export async function markAs(req, res, next) {
  const { user, locale } = req.body;
  let { type = "" } = req.query;
  const id = req?.params?.id;
  try {
    const notificationMatched = await Notifications.findOne({
      where: {
        id: id,
      },
      raw: true,
    });

    if (!notificationMatched) {
      return res.status(404).json({
        message: "Notification not found!",
      });
    }

    const status = await NotificationStatus.findOne({
      where: {
        code: type,
      },
      raw: true,
    });

    await Notifications.update(
      { status_id: status.id },
      { where: { id: id, user_id: user.id } }
    );

    return res.status(200).json({});
  } catch (err) {
    console.log("err: ", err);
    return res.status(500).json({
      message: "Unable to change notification state.",
      details: err,
    });
  }
}

export async function markAllAs(req, res, next) {
  const { user, locale } = req.body;
  let { type = "" } = req.query;
  try {
    const status = await NotificationStatus.findOne({
      where: {
        code: type,
      },
      raw: true,
    });

    await Notifications.update(
      { status_id: status.id },
      { where: { user_id: user.id } }
    );

    return res.status(200).json({});
  } catch (err) {
    console.log("err: ", err);
    return res.status(500).json({
      message: "Unable to change notification state.",
      details: err,
    });
  }
}

export async function sendServerNotification(req, res, next) {
  const { user_ids, message, url = null } = req.body;
  try {
    await FirebaseMessaging.sendNotification(user_ids, message, url);
    return res.status(200).json({});
  } catch (err) {
    console.log("err: ", err);
    return res.status(500).json({
      message: "Unable to send server notification",
      details: err,
    });
  }
}
