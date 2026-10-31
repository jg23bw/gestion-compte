/**
 * Pure stock/ETF valuation rules. Market prices, FX rates and the clock are
 * supplied by the caller so the domain never performs I/O.
 */
(function exposeStockValuation(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.StockValuation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_MANUAL_ANNUAL_RATE = 0.021;
  const MANUAL_VALUE_ISIN = 'SUR000001737';
  const MANUAL_VALUE_PRICE_ID = 'SUR-SUR000001737';

  function isManualValueHolding(holding) {
    return Boolean(holding?.manualValue)
      || String(holding?.isin || '').toUpperCase() === MANUAL_VALUE_ISIN
      || String(holding?.priceId || '').toUpperCase() === MANUAL_VALUE_PRICE_ID;
  }

  function manualHoldingValue(holding, {
    now = Date.now(),
    today = () => new Date(now).toISOString().slice(0, 10),
    annualRate = DEFAULT_MANUAL_ANNUAL_RATE
  } = {}) {
    const base = Number(holding?.invested) || 0;
    const start = Date.parse((holding?.manualValueDate || today()) + 'T00:00:00Z');
    const elapsedDays = Math.max(0, (now - start) / 86400000);
    return base * Math.pow(1 + annualRate, elapsedDays / 365.25);
  }

  function euroPrice(nativePrice, fxRate) {
    const price = Number(nativePrice);
    const rate = Number(fxRate);
    return Number.isFinite(price) && price > 0 && Number.isFinite(rate) && rate > 0
      ? price * rate
      : null;
  }

  function positionMetrics(holding, {
    nativePrice = null,
    fxRate = null,
    now = Date.now(),
    today,
    annualRate = DEFAULT_MANUAL_ANNUAL_RATE
  } = {}) {
    const invested = Number(holding?.invested) || 0;
    const quantity = Number(holding?.quantity) || 0;
    const manual = isManualValueHolding(holding);
    const price = euroPrice(nativePrice, fxRate);
    const value = manual
      ? manualHoldingValue(holding, { now, today, annualRate })
      : price === null ? null : quantity * price;
    const gain = value === null ? null : value - invested;
    return {
      manual, invested, quantity, value, gain,
      performance: gain === null || invested <= 0 ? null : gain / invested * 100
    };
  }

  return Object.freeze({
    DEFAULT_MANUAL_ANNUAL_RATE,
    isManualValueHolding,
    manualHoldingValue,
    euroPrice,
    positionMetrics
  });
});
