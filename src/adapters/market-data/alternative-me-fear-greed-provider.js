(function exposeAlternativeMeFearGreedProvider(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AlternativeMeFearGreedProvider = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create({ endpoint, fetchImpl = (...args) => fetch(...args) }) {
    if (!endpoint) throw new TypeError('fear and greed endpoint is required');
    return Object.freeze({
      async fetchLatest() {
        const response = await fetchImpl(endpoint, { headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!response.ok) throw new Error('API indisponible');
        const payload = await response.json();
        const row = payload?.data?.[0], value = Number(row?.value);
        if (!Number.isFinite(value)) throw new Error('Indice absent');
        return { value, classification: String(row.value_classification || 'Sentiment crypto') };
      }
    });
  }
  return Object.freeze({ create });
});
