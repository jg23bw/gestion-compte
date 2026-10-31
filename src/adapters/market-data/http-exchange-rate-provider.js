(function exposeHttpExchangeRateProvider(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.HttpExchangeRateProvider = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create({ endpoint, fetchImpl = (...args) => fetch(...args) }) {
    if (!endpoint) throw new TypeError('exchange rate endpoint is required');
    if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
    return Object.freeze({
      async fetchRates(currencies) {
        if (!Array.isArray(currencies)) throw new TypeError('currencies must be an array');
        const requested = [...new Set(currencies.map(code => String(code || '').toUpperCase()).filter(code => code && code !== 'EUR'))];
        if (!requested.length) return {};
        const response = await fetchImpl(endpoint, { headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!response.ok) throw new Error('réponse HTTP ' + response.status);
        const data = await response.json();
        if (data?.result !== 'success' || !data?.rates) throw new Error('taux de change indisponibles');
        const rates = {};
        for (const currency of requested) {
          const apiCode = currency === 'GBX' ? 'GBP' : currency;
          const perEuro = Number(data.rates[apiCode]);
          if (Number.isFinite(perEuro) && perEuro > 0) rates[currency] = (1 / perEuro) / (currency === 'GBX' ? 100 : 1);
        }
        if (!Object.keys(rates).length) throw new Error('aucun taux EUR reçu');
        return rates;
      }
    });
  }
  return Object.freeze({ create });
});
