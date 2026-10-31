(function exposeMcpTokenServicePort(root) {
  const api = Object.freeze({
    assert(service) {
      if (!service || typeof service.list !== 'function' || typeof service.create !== 'function' || typeof service.revoke !== 'function') {
        throw new TypeError('MCP token service port is required');
      }
      return service;
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.McpTokenServicePort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
