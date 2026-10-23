// Filet de sécurité pour que l'écran de connexion reste interactif même si app.js échoue.
document.addEventListener('DOMContentLoaded', () => {
  const dialog = document.getElementById('cloud-dialog');
  const login = document.getElementById('auth-login');
  const signup = document.getElementById('auth-signup');
  const message = document.getElementById('cloud-message');
  if (!dialog) return;
  const openAuth = (mode) => {
    if (message) {
      message.textContent = mode === 'signup'
        ? 'Renseignez votre e-mail et un mot de passe d’au moins 8 caractères, puis cliquez sur « Créer un compte ».'
        : 'Connectez-vous ou créez votre compte pour activer la synchronisation.';
    }
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    const email = document.getElementById('cloud-email');
    if (email) email.focus();
  };
  if (login) login.addEventListener('click', () => openAuth('login'));
  if (signup) signup.addEventListener('click', () => openAuth('signup'));
});
