(function exposeFearGreedProviderPort(root) {
  const api = Object.freeze({
    assert(provider) {
      if (!provider || typeof provider.fetchLatest !== 'function') throw new TypeError('fear and greed provider port is required');
      return provider;
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FearGreedProviderPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
