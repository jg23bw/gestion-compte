'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create: createPortAdapter } = require('../../../src/adapters/authentication/supabase-authentication-repository.js');
const { create: createService } = require('../../../src/application/authentication/authentication-service.js');

function fixture() {
  const calls = [];
  let listener;
  const session = { user: { id: 'user-1' }, access_token: 'synthetic-token' };
  const auth = {
    async getSession() { calls.push('getSession'); return { data: { session }, error: null }; },
    onAuthStateChange(callback) {
      calls.push('subscribe');
      listener = callback;
      return { data: { subscription: { unsubscribe() { calls.push('unsubscribe'); } } }, error: null };
    },
    async signInWithPassword(credentials) { calls.push(['signIn', credentials]); return { data: { session, user: session.user }, error: null }; },
    async signUp(credentials) { calls.push(['signUp', credentials]); return { data: { session: null, user: session.user }, error: null }; },
    async signOut() { calls.push('signOut'); return { data: {}, error: null }; }
  };
  const repository = createPortAdapter({ getClient: () => ({ auth }) });
  const service = createService({ authenticationRepository: repository });
  return { calls, service, session, emit: (event, value) => listener(event, value) };
}

test('authentication service delegates session, sign-in, sign-up and sign-out', async () => {
  const f = fixture();
  assert.equal(await f.service.getSession(), f.session);
  const signedIn = await f.service.signIn({ email: 'user@example.test', password: 'synthetic-password' });
  assert.equal(signedIn.session, f.session);
  const signedUp = await f.service.signUp({ email: 'user@example.test', password: 'synthetic-password', emailRedirectTo: 'https://example.test/' });
  assert.equal(signedUp.session, null);
  await f.service.signOut();
  assert.deepEqual(f.calls.map(call => Array.isArray(call) ? call[0] : call), ['getSession', 'signIn', 'signUp', 'signOut']);
  assert.deepEqual(f.calls[1][1], { email: 'user@example.test', password: 'synthetic-password' });
  assert.deepEqual(f.calls[2][1], { email: 'user@example.test', password: 'synthetic-password', options: { emailRedirectTo: 'https://example.test/' } });
});

test('authentication state subscription forwards event and session and returns unsubscribe handle', () => {
  const f = fixture();
  const events = [];
  const subscription = f.service.onAuthStateChange((event, session) => events.push({ event, session }));
  f.emit('SIGNED_IN', f.session);
  assert.deepEqual(events, [{ event: 'SIGNED_IN', session: f.session }]);
  subscription.unsubscribe();
  assert.ok(f.calls.includes('unsubscribe'));
});

test('authentication adapter propagates SDK errors', async () => {
  const adapter = createPortAdapter({
    getClient: () => ({ auth: { async getSession() { return { data: { session: null }, error: new Error('session failed') }; } } })
  });
  await assert.rejects(adapter.getSession(), /session failed/);
});

test('authentication service rejects objects that do not implement its port', () => {
  assert.throws(() => createService({ authenticationRepository: {} }), /authentication repository port/);
});
