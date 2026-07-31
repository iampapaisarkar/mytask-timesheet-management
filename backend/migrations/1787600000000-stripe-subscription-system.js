import { DataTypes } from "sequelize";

/**
 * Stripe SaaS subscription system — user-owned plans, usage, billing, webhooks.
 */
export async function up(queryInterface) {
  await queryInterface.createTable(
    { tableName: "plans" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER.UNSIGNED,
      },
      code: { type: DataTypes.STRING(32), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(64), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      is_free: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: { type: DataTypes.DATE, allowNull: true },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    },
  );

  await queryInterface.createTable(
    { tableName: "plan_prices" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER.UNSIGNED,
      },
      plan_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "plans", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      billing_interval: {
        type: DataTypes.ENUM("month", "year", "none"),
        allowNull: false,
        defaultValue: "none",
      },
      amount_cents: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "usd",
      },
      stripe_price_id: { type: DataTypes.STRING(128), allowNull: true },
      stripe_product_id: { type: DataTypes.STRING(128), allowNull: true },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: { type: DataTypes.DATE, allowNull: true },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    },
  );
  await queryInterface.addIndex(
    { tableName: "plan_prices" },
    ["plan_id", "billing_interval"],
    { name: "plan_prices_plan_interval_idx", unique: true },
  );
  await queryInterface.addIndex(
    { tableName: "plan_prices" },
    ["stripe_price_id"],
    { name: "plan_prices_stripe_price_idx" },
  );

  await queryInterface.createTable(
    { tableName: "plan_features" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER.UNSIGNED,
      },
      plan_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "plans", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      feature_key: { type: DataTypes.STRING(64), allowNull: false },
      feature_type: {
        type: DataTypes.ENUM("boolean", "limit"),
        allowNull: false,
        defaultValue: "limit",
      },
      limit_value: { type: DataTypes.INTEGER, allowNull: true },
      bool_value: { type: DataTypes.BOOLEAN, allowNull: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: { type: DataTypes.DATE, allowNull: true },
    },
  );
  await queryInterface.addIndex(
    { tableName: "plan_features" },
    ["plan_id", "feature_key"],
    { name: "plan_features_plan_key_uidx", unique: true },
  );

  await queryInterface.createTable(
    { tableName: "feature_limits" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER.UNSIGNED,
      },
      feature_key: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      display_name: { type: DataTypes.STRING(128), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      reset_period: {
        type: DataTypes.ENUM("none", "daily", "monthly"),
        allowNull: false,
        defaultValue: "none",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: { type: DataTypes.DATE, allowNull: true },
    },
  );

  await queryInterface.createTable(
    { tableName: "stripe_customers" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER.UNSIGNED,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      stripe_customer_id: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
      },
      email: { type: DataTypes.STRING(255), allowNull: true },
      default_payment_method: { type: DataTypes.STRING(128), allowNull: true },
      metadata: { type: DataTypes.JSON, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: { type: DataTypes.DATE, allowNull: true },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    },
  );

  await queryInterface.createTable(
    { tableName: "subscriptions" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      plan_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "plans", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      plan_price_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "plan_prices", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      status: {
        type: DataTypes.ENUM(
          "active",
          "trialing",
          "past_due",
          "canceled",
          "unpaid",
          "incomplete",
          "incomplete_expired",
          "paused",
          "expired",
        ),
        allowNull: false,
        defaultValue: "active",
      },
      billing_interval: {
        type: DataTypes.ENUM("month", "year", "none"),
        allowNull: false,
        defaultValue: "none",
      },
      stripe_subscription_id: {
        type: DataTypes.STRING(128),
        allowNull: true,
        unique: true,
      },
      stripe_customer_id: { type: DataTypes.STRING(128), allowNull: true },
      current_period_start: { type: DataTypes.DATE, allowNull: true },
      current_period_end: { type: DataTypes.DATE, allowNull: true },
      cancel_at_period_end: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      canceled_at: { type: DataTypes.DATE, allowNull: true },
      ended_at: { type: DataTypes.DATE, allowNull: true },
      trial_end: { type: DataTypes.DATE, allowNull: true },
      payment_status: {
        type: DataTypes.ENUM(
          "none",
          "paid",
          "pending",
          "failed",
          "refunded",
        ),
        allowNull: false,
        defaultValue: "none",
      },
      metadata: { type: DataTypes.JSON, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: { type: DataTypes.DATE, allowNull: true },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    },
  );
  await queryInterface.addIndex(
    { tableName: "subscriptions" },
    ["user_id"],
    { name: "subscriptions_user_idx" },
  );
  await queryInterface.addIndex(
    { tableName: "subscriptions" },
    ["user_id", "status"],
    { name: "subscriptions_user_status_idx" },
  );
  await queryInterface.addIndex(
    { tableName: "subscriptions" },
    ["current_period_end"],
    { name: "subscriptions_period_end_idx" },
  );

  await queryInterface.createTable(
    { tableName: "subscription_history" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      subscription_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: "subscriptions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      from_plan_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      to_plan_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      event_type: { type: DataTypes.STRING(64), allowNull: false },
      previous_status: { type: DataTypes.STRING(32), allowNull: true },
      new_status: { type: DataTypes.STRING(32), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      metadata: { type: DataTypes.JSON, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: { type: DataTypes.DATE, allowNull: true },
    },
  );
  await queryInterface.addIndex(
    { tableName: "subscription_history" },
    ["subscription_id", "created_at"],
    { name: "subscription_history_sub_created_idx" },
  );

  await queryInterface.createTable(
    { tableName: "billing_history" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      subscription_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: "subscriptions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      plan_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      invoice_number: { type: DataTypes.STRING(64), allowNull: true },
      stripe_invoice_id: {
        type: DataTypes.STRING(128),
        allowNull: true,
        unique: true,
      },
      stripe_payment_intent_id: { type: DataTypes.STRING(128), allowNull: true },
      amount_cents: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "usd",
      },
      status: {
        type: DataTypes.ENUM(
          "draft",
          "open",
          "paid",
          "uncollectible",
          "void",
          "failed",
        ),
        allowNull: false,
        defaultValue: "open",
      },
      billing_reason: { type: DataTypes.STRING(64), allowNull: true },
      payment_method_brand: { type: DataTypes.STRING(32), allowNull: true },
      payment_method_last4: { type: DataTypes.STRING(8), allowNull: true },
      invoice_pdf_url: { type: DataTypes.STRING(1024), allowNull: true },
      hosted_invoice_url: { type: DataTypes.STRING(1024), allowNull: true },
      period_start: { type: DataTypes.DATE, allowNull: true },
      period_end: { type: DataTypes.DATE, allowNull: true },
      paid_at: { type: DataTypes.DATE, allowNull: true },
      metadata: { type: DataTypes.JSON, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: { type: DataTypes.DATE, allowNull: true },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    },
  );
  await queryInterface.addIndex(
    { tableName: "billing_history" },
    ["user_id", "created_at"],
    { name: "billing_history_user_created_idx" },
  );

  await queryInterface.createTable(
    { tableName: "invoice_history" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      billing_history_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: "billing_history", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      stripe_invoice_id: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
      },
      raw_payload: { type: DataTypes.JSON, allowNull: true },
      synced_at: { type: DataTypes.DATE, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: { type: DataTypes.DATE, allowNull: true },
    },
  );

  await queryInterface.createTable(
    { tableName: "payment_attempts" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      subscription_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      stripe_payment_intent_id: { type: DataTypes.STRING(128), allowNull: true },
      stripe_invoice_id: { type: DataTypes.STRING(128), allowNull: true },
      amount_cents: { type: DataTypes.INTEGER, allowNull: true },
      currency: { type: DataTypes.STRING(3), allowNull: true },
      status: { type: DataTypes.STRING(32), allowNull: false },
      failure_code: { type: DataTypes.STRING(64), allowNull: true },
      failure_message: { type: DataTypes.TEXT, allowNull: true },
      attempt_count: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      metadata: { type: DataTypes.JSON, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: { type: DataTypes.DATE, allowNull: true },
    },
  );
  await queryInterface.addIndex(
    { tableName: "payment_attempts" },
    ["user_id", "created_at"],
    { name: "payment_attempts_user_created_idx" },
  );

  await queryInterface.createTable(
    { tableName: "stripe_events" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      stripe_event_id: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
      },
      type: { type: DataTypes.STRING(128), allowNull: false },
      api_version: { type: DataTypes.STRING(32), allowNull: true },
      livemode: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      processing_status: {
        type: DataTypes.ENUM("received", "processing", "processed", "failed"),
        allowNull: false,
        defaultValue: "received",
      },
      error_message: { type: DataTypes.TEXT, allowNull: true },
      payload: { type: DataTypes.JSON, allowNull: true },
      processed_at: { type: DataTypes.DATE, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: { type: DataTypes.DATE, allowNull: true },
    },
  );
  await queryInterface.addIndex(
    { tableName: "stripe_events" },
    ["type", "created_at"],
    { name: "stripe_events_type_created_idx" },
  );

  await queryInterface.createTable(
    { tableName: "webhook_logs" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      provider: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "stripe",
      },
      stripe_event_id: { type: DataTypes.STRING(128), allowNull: true },
      event_type: { type: DataTypes.STRING(128), allowNull: true },
      http_status: { type: DataTypes.INTEGER, allowNull: true },
      success: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      request_headers: { type: DataTypes.JSON, allowNull: true },
      request_body: { type: DataTypes.JSON, allowNull: true },
      response_body: { type: DataTypes.JSON, allowNull: true },
      error_message: { type: DataTypes.TEXT, allowNull: true },
      duration_ms: { type: DataTypes.INTEGER, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: { type: DataTypes.DATE, allowNull: true },
    },
  );
  await queryInterface.addIndex(
    { tableName: "webhook_logs" },
    ["created_at"],
    { name: "webhook_logs_created_idx" },
  );

  await queryInterface.createTable(
    { tableName: "usage_counters" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      organisation_id: { type: DataTypes.INTEGER, allowNull: true },
      employee_id: { type: DataTypes.INTEGER, allowNull: true },
      feature_key: { type: DataTypes.STRING(64), allowNull: false },
      period_type: {
        type: DataTypes.ENUM("lifetime", "daily", "monthly"),
        allowNull: false,
        defaultValue: "lifetime",
      },
      period_key: { type: DataTypes.STRING(16), allowNull: false },
      count: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: { type: DataTypes.DATE, allowNull: true },
    },
  );
  await queryInterface.addIndex(
    { tableName: "usage_counters" },
    [
      "user_id",
      "organisation_id",
      "employee_id",
      "feature_key",
      "period_type",
      "period_key",
    ],
    { name: "usage_counters_unique_idx", unique: true },
  );

  await queryInterface.createTable(
    { tableName: "subscription_notifications" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.BIGINT.UNSIGNED,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      subscription_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
      },
      notification_type: { type: DataTypes.STRING(64), allowNull: false },
      channel: {
        type: DataTypes.ENUM("in_app", "email", "both"),
        allowNull: false,
        defaultValue: "in_app",
      },
      title: { type: DataTypes.STRING(255), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: true },
      sent_at: { type: DataTypes.DATE, allowNull: true },
      read_at: { type: DataTypes.DATE, allowNull: true },
      metadata: { type: DataTypes.JSON, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: { type: DataTypes.DATE, allowNull: true },
    },
  );
  await queryInterface.addIndex(
    { tableName: "subscription_notifications" },
    ["user_id", "notification_type", "created_at"],
    { name: "subscription_notifications_user_type_idx" },
  );

  await queryInterface.createTable(
    { tableName: "system_logs_access" },
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER.UNSIGNED,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      plan_code: { type: DataTypes.STRING(32), allowNull: true },
      granted_at: { type: DataTypes.DATE, allowNull: true },
      revoked_at: { type: DataTypes.DATE, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: { type: DataTypes.DATE, allowNull: true },
    },
  );

  // Seed feature catalogue
  const now = new Date();
  await queryInterface.bulkInsert("feature_limits", [
    {
      feature_key: "organisations",
      display_name: "Organisations",
      description: "Max organisations a user can own",
      reset_period: "none",
      created_at: now,
    },
    {
      feature_key: "employees_per_org",
      display_name: "Employees per organisation",
      description: "Max employees in an organisation",
      reset_period: "none",
      created_at: now,
    },
    {
      feature_key: "customers",
      display_name: "Customers",
      description: "Max customers per organisation",
      reset_period: "none",
      created_at: now,
    },
    {
      feature_key: "jobs_per_customer",
      display_name: "Jobs per customer",
      description: "Max jobs per customer",
      reset_period: "none",
      created_at: now,
    },
    {
      feature_key: "timesheets_per_employee_month",
      display_name: "Timesheets per employee / month",
      description: "Max timesheets generated per employee per month",
      reset_period: "monthly",
      created_at: now,
    },
    {
      feature_key: "reports_per_day",
      display_name: "Reports per day",
      description: "Max reports generated per day",
      reset_period: "daily",
      created_at: now,
    },
    {
      feature_key: "email_notifications",
      display_name: "Email notifications",
      description: "Email notification delivery",
      reset_period: "none",
      created_at: now,
    },
    {
      feature_key: "system_logs",
      display_name: "System logs",
      description: "Access to system audit logs",
      reset_period: "none",
      created_at: now,
    },
  ]);

  await queryInterface.bulkInsert("plans", [
    {
      id: 1,
      code: "free",
      name: "Free",
      description: "Get started with essential timesheet tools",
      is_free: true,
      is_active: true,
      sort_order: 1,
      created_at: now,
    },
    {
      id: 2,
      code: "pro",
      name: "Pro",
      description: "Scale your team with higher limits and premium features",
      is_free: false,
      is_active: true,
      sort_order: 2,
      created_at: now,
    },
  ]);

  await queryInterface.bulkInsert("plan_prices", [
    {
      id: 1,
      plan_id: 1,
      billing_interval: "none",
      amount_cents: 0,
      currency: "usd",
      stripe_price_id: null,
      stripe_product_id: null,
      is_active: true,
      created_at: now,
    },
    {
      id: 2,
      plan_id: 2,
      billing_interval: "month",
      amount_cents: 999,
      currency: "usd",
      stripe_price_id: process.env.STRIPE_PRICE_PRO_MONTHLY || null,
      stripe_product_id: process.env.STRIPE_PRODUCT_PRO || null,
      is_active: true,
      created_at: now,
    },
    {
      id: 3,
      plan_id: 2,
      billing_interval: "year",
      amount_cents: 9999,
      currency: "usd",
      stripe_price_id: process.env.STRIPE_PRICE_PRO_YEARLY || null,
      stripe_product_id: process.env.STRIPE_PRODUCT_PRO || null,
      is_active: true,
      created_at: now,
    },
  ]);

  const freeFeatures = [
    ["organisations", "limit", 1, null],
    ["employees_per_org", "limit", 3, null],
    ["customers", "limit", 3, null],
    ["jobs_per_customer", "limit", 5, null],
    ["timesheets_per_employee_month", "limit", 3, null],
    ["reports_per_day", "limit", 3, null],
    ["email_notifications", "boolean", null, false],
    ["system_logs", "boolean", null, false],
  ];
  const proFeatures = [
    ["organisations", "limit", 5, null],
    ["employees_per_org", "limit", 10, null],
    ["customers", "limit", 10, null],
    ["jobs_per_customer", "limit", 20, null],
    ["timesheets_per_employee_month", "limit", 20, null],
    ["reports_per_day", "limit", 20, null],
    ["email_notifications", "boolean", null, true],
    ["system_logs", "boolean", null, true],
  ];

  const featureRows = [];
  for (const [key, type, limit, bool] of freeFeatures) {
    featureRows.push({
      plan_id: 1,
      feature_key: key,
      feature_type: type,
      limit_value: limit,
      bool_value: bool,
      description: null,
      created_at: now,
    });
  }
  for (const [key, type, limit, bool] of proFeatures) {
    featureRows.push({
      plan_id: 2,
      feature_key: key,
      feature_type: type,
      limit_value: limit,
      bool_value: bool,
      description: null,
      created_at: now,
    });
  }
  await queryInterface.bulkInsert("plan_features", featureRows);
}

export async function down(queryInterface) {
  const tables = [
    "system_logs_access",
    "subscription_notifications",
    "usage_counters",
    "webhook_logs",
    "stripe_events",
    "payment_attempts",
    "invoice_history",
    "billing_history",
    "subscription_history",
    "subscriptions",
    "stripe_customers",
    "plan_features",
    "feature_limits",
    "plan_prices",
    "plans",
  ];
  for (const table of tables) {
    await queryInterface.dropTable({ tableName: table });
  }
}
