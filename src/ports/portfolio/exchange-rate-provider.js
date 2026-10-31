(function exposeExchangeRateProviderPort(root) {
  const api = Object.freeze({
    assert(provider) {
      if (!provider || typeof provider.fetchRates !== 'function') throw new TypeError('exchange rate provider port is required');
      return provider;
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ExchangeRateProviderPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
