/**
 * In-memory adapter for the legacy application state.
 */
(function exposeStateRecurringTemplateRepository(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.StateRecurringTemplateRepository = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create(getState) {
    if (typeof getState !== 'function') throw new TypeError('state provider is required');
    return Object.freeze({
      findAll() { return getState().recurringTemplates || []; },
      findById(id) { return this.findAll().find(item => item.id === id) || null; },
      save(template) {
        const state = getState();
        const templates = state.recurringTemplates || (state.recurringTemplates = []);
        const index = templates.findIndex(item => item.id === template.id);
        if (index < 0) templates.push(template);
        else templates[index] = template;
        return template;
      },
      delete(id) {
        const state = getState();
        const templates = state.recurringTemplates || [];
        const index = templates.findIndex(item => item.id === id);
        return index < 0 ? null : templates.splice(index, 1)[0];
      }
    });
  }
  return Object.freeze({ create });
});
