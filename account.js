import { API_ORIGIN } from './account-config.js';

const path = window.location.pathname.replace(/\/$/, '');
const hasQuery = Boolean(window.location.search);
const verifying = path === '/verify';
const parameters = new URLSearchParams(window.location.hash.slice(1));
let token = parameters.get('token');
// Remove the secret before any interaction or HTTP request. Keep only in RAM.
history.replaceState(null, '', window.location.pathname);
const status = document.getElementById('status');
const form = document.getElementById('account-form');
const submit = document.getElementById('submit');
const valid = ['/reset', '/verify'].includes(path) &&
  parameters.getAll('token').length === 1 && [...parameters.keys()].length === 1 &&
  /^[0-9a-f]{64}$/i.test(token ?? '') && window.location.protocol === 'https:' && !hasQuery;
if (!valid) {
  token = null;
  form.hidden = true;
  status.textContent = 'Lien invalide. Demandez un nouveau lien depuis RepDay.';
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!token || submit.disabled) return;
  const password = document.getElementById('password');
  const confirm = document.getElementById('confirm');
  if (!verifying && password.value !== confirm.value) {
    status.textContent = 'Les mots de passe doivent être identiques.';
    return;
  }
  submit.disabled = true;
  status.textContent = 'Confirmation en cours…';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${API_ORIGIN}/auth/${verifying ? 'verify-email' : 'reset-password'}`, {
      method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verifying ? { token, currentPassword: password.value } : { token, newPassword: password.value }), signal: controller.signal,
    });
    if (!response.ok) {
      const { message } = await response.json();
      if (verifying && ['EMAIL_LINK_INVALID', 'EMAIL_LINK_EXPIRED', 'EMAIL_ALREADY_VERIFIED'].includes(message)) {
        form.reset();
        form.hidden = true;
        token = null;
        status.textContent = {
          EMAIL_LINK_INVALID: 'Lien invalide. Demandez un nouveau lien dans RepDay.',
          EMAIL_LINK_EXPIRED: 'Ce lien a expiré. Demandez un nouveau lien dans RepDay.',
          EMAIL_ALREADY_VERIFIED: 'Votre adresse est déjà vérifiée. Vous pouvez vous connecter dans RepDay.',
        }[message];
      } else {
        status.textContent = message === 'SIGNUP_PROOF_REQUIRED' ? 'Vérifiez votre mot de passe RepDay actuel.'
          : response.status === 429 ? 'Trop de tentatives. Réessayez dans une minute.'
          : 'Impossible de confirmer. Vérifiez le lien puis réessayez.';
        submit.disabled = false;
      }
      return;
    }
    token = null;
    form.reset();
    form.hidden = true;
    if (verifying) {
      status.textContent = 'Votre adresse e-mail est vérifiée. Vous pouvez vous connecter dans RepDay avec votre mot de passe.';
    } else {
      const result = await response.json();
      status.textContent = result.verificationRequired
        ? 'Votre mot de passe est modifié. Confirmez votre adresse avec un nouveau lien de vérification. Pour en demander un, connectez-vous à RepDay avec votre nouveau mot de passe.'
        : 'Votre mot de passe est modifié. Vous pouvez vous connecter dans RepDay.';
    }
  } catch {
    status.textContent = 'La confirmation a échoué. Vérifiez le lien ou demandez-en un nouveau dans RepDay.';
    submit.disabled = false;
  } finally { clearTimeout(timer); }
});
window.addEventListener('pagehide', () => { token = null; form.reset(); });
