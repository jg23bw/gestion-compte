/**
 * Authentication use cases exposed to the UI.
 * The service depends only on the authentication repository port.
 */
(function exposeAuthenticationService(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AuthenticationService = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function create({ authenticationRepository }) {
    const port = typeof AuthenticationRepositoryPort !== 'undefined'
      ? AuthenticationRepositoryPort
      : (typeof require === 'function' ? require('../../ports/authentication/authentication-repository.js') : null);
    if (!port?.isAuthenticationRepository(authenticationRepository)) {
      throw new TypeError('authenticationRepository must implement the authentication repository port');
    }

    return Object.freeze({
      getSession: () => authenticationRepository.getSession(),
      onAuthStateChange: callback => authenticationRepository.onAuthStateChange(callback),
      signIn: credentials => authenticationRepository.signIn(credentials),
      signUp: credentials => authenticationRepository.signUp(credentials),
      signOut: () => authenticationRepository.signOut()
    });
  }

  return Object.freeze({ create });
});
