'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/application/integrations/mcp-token-service.js');

test('sends authenticated MCP token requests and returns parsed responses', async () => {
  const calls = [];
  const service = create({
    authenticationService: { getSession: async () => ({ access_token: 'session-token' }) },
    endpoint: 'https://example.test/mcp-tokens', publishableKey: 'public-key',
    fetchImpl: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ tokens: [] }) }; }
  });
  assert.deepEqual(await service.list({ user: { id: 'u1' } }), { tokens: [] });
  assert.equal(calls[0].options.headers.Authorization, 'Bearer session-token');
  assert.equal(calls[0].options.headers.apikey, 'public-key');
  assert.deepEqual(JSON.parse(calls[0].options.body), { action: 'list' });
});

test('rejects anonymous users and expired sessions before sending requests', async () => {
  let calls = 0;
  const service = create({
    authenticationService: { getSession: async () => null }, endpoint: 'https://example.test', publishableKey: 'key',
    fetchImpl: async () => { calls++; return { ok: true, json: async () => ({}) }; }
  });
  await assert.rejects(service.list({ user: null }), /Connectez-vous/);
  await assert.rejects(service.list({ user: { id: 'u1' } }), /Session expirée/);
  assert.equal(calls, 0);
});

test('surfaces server errors and tolerates unreadable error bodies', async () => {
  const service = create({
    authenticationService: { getSession: async () => ({ access_token: 't' }) },
    endpoint: 'https://example.test', publishableKey: 'key',
    fetchImpl: async () => ({ ok: false, json: async () => ({ error: 'Jeton invalide' }) })
  });
  await assert.rejects(service.revoke({ user: { id: 'u1' }, tokenId: 't1' }), /Jeton invalide/);
});
