(function () {
  'use strict';
  const { api } = window.App;
  const err = document.getElementById('err');
  const btn = document.getElementById('btn');
  const showErr = (m) => { err.textContent = m; err.classList.add('show'); };

  api('/api/state', { allow401: true }).then((s) => {
    document.querySelectorAll('[data-site-name]').forEach((n) => { n.textContent = s.siteName; });
    const tf = document.getElementById('token-field');
    if (tf && s.setupTokenRequired) { tf.classList.remove('hide'); document.getElementById('token').required = true; }
  }).catch(() => {});

  const login = document.getElementById('login-form');
  if (login) {
    login.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.classList.remove('show');
      btn.disabled = true; btn.textContent = 'Entrando...';
      try {
        const r = await api('/api/login', { method: 'POST', allow401: true, body: { username: login.elements.username.value, password: login.elements.password.value } });
        location.href = r.redirect;
      } catch (ex) {
        showErr(ex.message);
        btn.disabled = false; btn.textContent = 'Entrar';
      }
    });
  }

  const setup = document.getElementById('setup-form');
  if (setup) {
    setup.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.classList.remove('show');
      if (setup.elements.password.value !== setup.elements.password2.value) return showErr('As senhas não conferem.');
      btn.disabled = true; btn.textContent = 'Criando...';
      try {
        const r = await api('/api/setup', { method: 'POST', allow401: true, body: {
          name: setup.elements.name.value, username: setup.elements.username.value, password: setup.elements.password.value, token: setup.elements.token.value,
        } });
        location.href = r.redirect;
      } catch (ex) {
        showErr(ex.message);
        btn.disabled = false; btn.textContent = 'Criar conta ADM';
      }
    });
  }
})();
