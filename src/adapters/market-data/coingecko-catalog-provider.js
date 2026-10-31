(function exposeCoinGeckoCatalogProvider(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CoinGeckoCatalogProvider = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create({ searchEndpoint, fetchImpl = (...args) => fetch(...args), resultLimit = 10 }) {
    if (!searchEndpoint) throw new TypeError('CoinGecko search endpoint is required');
    return Object.freeze({
      async searchCoins(query, { signal } = {}) {
        const term = String(query || '').trim();
        if (!term) return [];
        const response = await fetchImpl(searchEndpoint + '?query=' + encodeURIComponent(term), {
          signal, headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(response.status === 429
          ? 'limite de requêtes atteinte, réessayez dans une minute'
          : 'réponse HTTP ' + response.status);
        const payload = await response.json();
        return (Array.isArray(payload?.coins) ? payload.coins : []).slice(0, resultLimit);
      }
    });
  }
  return Object.freeze({ create });
});
