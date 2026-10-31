/**
 * Port for recurring-template persistence.
 */
(function exposeRecurringTemplateRepositoryPort(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.RecurringTemplateRepositoryPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const methods = ['findAll', 'findById', 'save', 'delete'];
  function assert(repository) {
    if (!repository || methods.some(method => typeof repository[method] !== 'function')) {
      throw new TypeError('recurring template repository port is required');
    }
    return repository;
  }
  return Object.freeze({ assert });
});
