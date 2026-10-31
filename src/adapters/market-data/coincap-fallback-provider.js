(function exposeCoinCapFallbackProvider(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CoinCapFallbackProvider = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create({ endpoint, coinIds, fetchImpl = (...args) => fetch(...args) }) {
    if (!endpoint || !coinIds) throw new TypeError('endpoint and CoinCap ID map are required');
    return Object.freeze({
      async fetchPrices(holdingIds, usdToEur) {
        const mapped = [...new Set((holdingIds || []).map(id => coinIds[id]).filter(Boolean))];
        if (!mapped.length) return {};
        const rate = Number(usdToEur);
        if (!Number.isFinite(rate) || rate <= 0) return {};
        const response = await fetchImpl(endpoint + '?ids=' + encodeURIComponent(mapped.join(',')), {
          headers: { Accept: 'application/json' }, cache: 'no-store'
        });
        if (!response.ok) return {};
        const payload = await response.json();
        const idByCoincap = Object.fromEntries(Object.entries(coinIds).map(([coingecko, coincap]) => [coincap, coingecko]));
        const values = {};
        for (const asset of Array.isArray(payload?.data) ? payload.data : []) {
          const id = idByCoincap[asset.id], usd = Number(asset.priceUsd);
          if (id && Number.isFinite(usd) && usd > 0) values[id] = usd * rate;
        }
        return values;
      }
    });
  }
  return Object.freeze({ create });
});
