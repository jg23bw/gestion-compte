/**
 * Pure normalization rules for stock/ETF holding metadata.
 * The persisted shape remains compatible with user_metadata.stockHoldings.
 */
(function exposeStockHoldingRules(root) {
  'use strict';
  function create({ currencies, markets, today }) {
    const supportedCurrencies = new Set(currencies || []);
    const marketCatalog = markets || {};
    const currentDate = typeof today === 'function' ? today : () => new Date().toISOString().slice(0, 10);
    function normalizeCurrency(value) {
      const currency = String(value || '').trim().toUpperCase();
      return supportedCurrencies.has(currency) ? currency : 'EUR';
    }
    function normalize(value) {
      if (!Array.isArray(value)) return [];
      const result = [], seen = new Set();
      for (const raw of value) {
        if (!raw || typeof raw !== 'object') continue;
        const id = String(raw.id || '').trim();
        const accountId = String(raw.accountId || '').trim();
        const priceId = String(raw.priceId || raw.stockanalysisId || '').trim();
        const isin = String(raw.isin || '').trim().toUpperCase().slice(0, 12);
        const symbol = String(raw.symbol || '').trim().toUpperCase().slice(0, 24);
        if (!id || seen.has(id) || !accountId || !priceId || !symbol) continue;
        const invested = Number(raw.invested), quantity = Number(raw.quantity);
        if (!Number.isFinite(invested) || invested < 0 || (!Number.isFinite(quantity) && !raw.manualValue)) continue;
        const manualValue = Boolean(raw.manualValue) || isin === 'SUR000001737' || priceId.toUpperCase() === 'SUR-SUR000001737';
        const market = marketCatalog[String(priceId).split('-')[0].toUpperCase()] || marketCatalog.US || { label: 'États-Unis', currency: 'USD' };
        seen.add(id);
        result.push({
          id, accountId, priceId, symbol, isin,
          name: String(raw.name || symbol).trim().slice(0, 160) || symbol,
          market: String(raw.market || market.label).trim().slice(0, 80) || market.label,
          currency: normalizeCurrency(raw.currency || market.currency),
          invested, quantity: Number.isFinite(quantity) ? quantity : 0, manualValue,
          manualValueDate: raw.manualValueDate || currentDate(),
          sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : 0
        });
      }
      return result;
    }
    return Object.freeze({ normalize, normalizeCurrency });
  }
  const api = Object.freeze({ create });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.StockHoldingRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
