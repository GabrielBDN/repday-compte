import { API_ORIGIN } from './account-config.js';

const path = window.location.pathname.replace(/\/$/, '');
const parameters = new URLSearchParams(window.location.hash.slice(1));
let token = parameters.get('token');
// Remove the secret before any interaction or HTTP request. Keep only in RAM.
history.replaceState(null, '', window.location.pathname);
const status = document.getElementById('status');
const form = document.getElementById('account-form');
const submit = document.getElementById('submit');
const valid = ['/reset', '/verify'].includes(path) &&
  parameters.getAll('token').length === 1 && [...parameters.keys()].length === 1 &&
  /^[0-9a-f]{64}$/i.test(token ?? '') && window.location.protocol === 'https:';
if (!valid) {
  token = null;
  form.hidden = true;
  status.textContent = 'Lien invalide. Demandez un nouveau lien depuis RepDay.';
}
if (path === '/reset') document.getElementById('title').textContent = 'Réinitialiser votre mot de passe';
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!token || submit.disabled) return;
  const password = document.getElementById('password');
  const confirm = document.getElementById('confirm');
  if (password.value !== confirm.value) {
    status.textContent = 'Les mots de passe doivent être identiques.';
    return;
  }
  submit.disabled = true;
  status.textContent = 'Confirmation en cours…';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${API_ORIGIN}/auth/${path === '/verify' ? 'verify-email' : 'reset-password'}`, {
      method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password.value }), signal: controller.signal,
    });
    if (!response.ok) throw new Error('Action rejected');
    token = null;
    form.reset();
    form.hidden = true;
    status.textContent = 'Votre compte est sécurisé. Vous pouvez vous connecter dans RepDay.';
  } catch {
    status.textContent = 'La confirmation a échoué. Vérifiez le lien ou demandez-en un nouveau dans RepDay.';
    submit.disabled = false;
  } finally { clearTimeout(timer); }
});
window.addEventListener('pagehide', () => { token = null; form.reset(); });
