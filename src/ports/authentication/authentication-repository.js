/**
 * Port for the authentication operations required by the application.
 */
(function exposeAuthenticationRepositoryPort(root) {
  const api = Object.freeze({
    isAuthenticationRepository(value) {
      return Boolean(value
        && typeof value.getSession === 'function'
        && typeof value.onAuthStateChange === 'function'
        && typeof value.signIn === 'function'
        && typeof value.signUp === 'function'
        && typeof value.signOut === 'function');
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AuthenticationRepositoryPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
