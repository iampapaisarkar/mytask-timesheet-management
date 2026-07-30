import redisUtils from "../utils/redis.utils.js";

/**
 * Exchange rates for dashboard / reporting currency conversion.
 *
 * Google does NOT offer an official public Currency Conversion API.
 * GOOGLEFINANCE works only inside Google Sheets and is unsuitable for servers.
 *
 * Provider: Frankfurter (ECB mid-market rates) — free, no API key.
 * https://www.frankfurter.app/
 *
 * Fallback: open.er-api.com (also free, no key).
 */

const CACHE_TTL_SEC = 6 * 60 * 60; // 6 hours
const CACHE_KEY = "fx:rates:USD";

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

async function fetchFrankfurterUsdRates() {
  const res = await fetch("https://api.frankfurter.app/latest?from=USD");
  if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.rates || typeof data.rates !== "object") {
    throw new Error("Frankfurter returned no rates");
  }
  return {
    base: "USD",
    date: data.date || null,
    provider: "frankfurter",
    rates: { USD: 1, ...data.rates },
  };
}

async function fetchOpenErApiUsdRates() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) throw new Error(`open.er-api HTTP ${res.status}`);
  const data = await res.json();
  if (data?.result !== "success" || !data?.rates) {
    throw new Error("open.er-api returned no rates");
  }
  return {
    base: "USD",
    date: data.time_last_update_utc || null,
    provider: "open.er-api",
    rates: { USD: 1, ...data.rates },
  };
}

async function withTimeout(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function loadUsdRates() {
  try {
    const cached = await withTimeout(
      redisUtils.getCache(CACHE_KEY),
      800,
      "redis fx cache",
    );
    if (cached?.rates) return cached;
  } catch {
    /* redis optional */
  }

  let bundle;
  try {
    bundle = await withTimeout(
      fetchFrankfurterUsdRates(),
      8000,
      "frankfurter",
    );
  } catch (err) {
    console.warn("Frankfurter FX failed, trying open.er-api:", err.message);
    bundle = await withTimeout(
      fetchOpenErApiUsdRates(),
      8000,
      "open.er-api",
    );
  }

  try {
    await withTimeout(
      redisUtils.setCache(CACHE_KEY, {
        ...bundle,
        cached_at: new Date().toISOString(),
        ttl_hint_sec: CACHE_TTL_SEC,
      }),
      800,
      "redis fx set",
    );
  } catch {
    /* redis optional */
  }

  return bundle;
}

/**
 * Convert amount from one ISO currency to another using USD pivot rates.
 */
export async function convertAmount(amount, fromCurrency, toCurrency) {
  const from = String(fromCurrency || "USD").toUpperCase();
  const to = String(toCurrency || "USD").toUpperCase();
  const value = Number(amount) || 0;
  if (!value || from === to) {
    return { amount: round2(value), from, to, rate: 1, provider: null };
  }

  const bundle = await loadUsdRates();
  const rates = bundle.rates || {};
  const fromRate = rates[from];
  const toRate = rates[to];
  if (fromRate == null || toRate == null) {
    // Unsupported pair — return original unconverted with rate null
    return {
      amount: round2(value),
      from,
      to,
      rate: null,
      provider: bundle.provider,
      unconverted: true,
    };
  }

  const inUsd = value / fromRate;
  const converted = inUsd * toRate;
  const rate = toRate / fromRate;
  return {
    amount: round2(converted),
    from,
    to,
    rate: Number(rate.toFixed(8)),
    provider: bundle.provider,
    as_of: bundle.date,
  };
}

export async function convertMany(items, toCurrency) {
  const to = String(toCurrency || "USD").toUpperCase();
  if (!items?.length) return { total: 0, to, items: [] };

  const bundle = await loadUsdRates();
  const rates = bundle.rates || {};
  let total = 0;
  const out = [];

  for (const item of items) {
    const from = String(item.currency || to).toUpperCase();
    const value = Number(item.amount) || 0;
    let converted = value;
    let rate = 1;
    let unconverted = false;

    if (from !== to) {
      const fromRate = rates[from];
      const toRate = rates[to];
      if (fromRate == null || toRate == null) {
        unconverted = true;
      } else {
        converted = (value / fromRate) * toRate;
        rate = toRate / fromRate;
      }
    }

    const amount = round2(converted);
    total += amount;
    out.push({
      ...item,
      amount_original: round2(value),
      currency_original: from,
      amount,
      currency: to,
      rate: unconverted ? null : Number(rate.toFixed(8)),
      unconverted,
    });
  }

  return {
    total: round2(total),
    to,
    provider: bundle.provider,
    as_of: bundle.date,
    items: out,
  };
}

export async function getUsdRates() {
  return loadUsdRates();
}

export default {
  convertAmount,
  convertMany,
  getUsdRates,
};
