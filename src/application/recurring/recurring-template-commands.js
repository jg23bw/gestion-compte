/**
 * Application use cases for recurring-template mutations.
 */
(function exposeRecurringTemplateCommands(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.RecurringTemplateCommands = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create({ repository }) {
    const portApi = typeof RecurringTemplateRepositoryPort !== 'undefined'
      ? RecurringTemplateRepositoryPort
      : (typeof require === 'function' ? require('../../ports/recurring/recurring-template-repository.js') : null);
    if (!repository) throw new TypeError('recurring template repository is required');
    if (!portApi) throw new TypeError('recurring template repository port is unavailable');
    const port = portApi.assert(repository);
    return Object.freeze({
      findById(id) { return port.findById(id); },
      save(template) {
        if (!template || !template.id) throw new TypeError('a recurring template id is required');
        return port.save({ ...template });
      },
      update(id, changes) {
        const previous = port.findById(id);
        if (!previous) return null;
        return port.save({ ...previous, ...changes, id: previous.id });
      },
      remove(id) { return port.delete(id); }
    });
  }
  return Object.freeze({ create });
});
