(function exposeCryptoFallbackProviderPort(root) {
  const api = Object.freeze({
    assert(provider) {
      if (!provider || typeof provider.fetchPrices !== 'function') throw new TypeError('crypto fallback provider port is required');
      return provider;
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CryptoFallbackProviderPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
