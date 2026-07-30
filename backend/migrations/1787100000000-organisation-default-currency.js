import { DataTypes } from "sequelize";

/**
 * Organisation reporting currency for dashboards / aggregated payroll.
 * Employee wage currencies remain independent; dashboard converts into this.
 */
export async function up(queryInterface) {
  const sequelize = queryInterface.sequelize;
  const desc = await queryInterface.describeTable("organisations");

  if (!desc.default_currency) {
    await queryInterface.addColumn("organisations", "default_currency", {
      type: DataTypes.STRING(8),
      allowNull: true,
    });
  }

  // Backfill from phone / default country ISO
  await sequelize.query(`
    UPDATE organisations
    SET default_currency = CASE UPPER(COALESCE(default_country, phone_country_iso, ''))
      WHEN 'US' THEN 'USD'
      WHEN 'IN' THEN 'INR'
      WHEN 'AU' THEN 'AUD'
      WHEN 'GB' THEN 'GBP'
      WHEN 'NZ' THEN 'NZD'
      WHEN 'CA' THEN 'CAD'
      WHEN 'SG' THEN 'SGD'
      WHEN 'IE' THEN 'EUR'
      WHEN 'DE' THEN 'EUR'
      WHEN 'FR' THEN 'EUR'
      WHEN 'NL' THEN 'EUR'
      WHEN 'ES' THEN 'EUR'
      WHEN 'IT' THEN 'EUR'
      WHEN 'PT' THEN 'EUR'
      WHEN 'BE' THEN 'EUR'
      WHEN 'AT' THEN 'EUR'
      WHEN 'FI' THEN 'EUR'
      ELSE COALESCE(default_currency, 'USD')
    END
    WHERE default_currency IS NULL OR default_currency = ''
  `);
}

export async function down(queryInterface) {
  const desc = await queryInterface.describeTable("organisations");
  if (desc.default_currency) {
    await queryInterface.removeColumn("organisations", "default_currency");
  }
}
