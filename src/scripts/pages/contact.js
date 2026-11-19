// Contact: the site is static, so "Send" opens the visitor's email app with
// everything they typed already filled in.
import { mountCommon } from './common.js';

const EMAIL = 'dhanushk0611@gmail.com';

export function mountContact(root, { gl } = {}) {
  const common = mountCommon(root, { gl });
  const form = root.querySelector('[data-contact-form]');

  const showError = (id, text) => {
    const el = form.querySelector(`[data-error-for="${id}"]`);
    if (!el) return;
    el.textContent = text;
    el.hidden = !text;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    let ok = true;
    const name = (data.name || '').trim();
    const email = (data.email || '').trim();
    const message = (data.message || '').trim();
    showError('name', name ? '' : 'Add your name so I know who is writing.');
    showError('email', /.+@.+\..+/.test(email) ? '' : 'Add an email address I can reply to, like you@example.com.');
    showError('message', message ? '' : 'Write a message before sending.');
    if (!name || !/.+@.+\..+/.test(email) || !message) ok = false;
    if (!ok) {
      form.querySelector('.form__error:not([hidden])')?.closest('.form__q')?.querySelector('.form__field')?.focus();
      return;
    }
    const subject = (data.topic || '').trim() || `Message from ${name}`;
    const body = `${message}\n\n${name}\n${email}`;
    location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  form?.addEventListener('submit', onSubmit);

  return {
    intro() {
      common.intro();
    },
    destroy() {
      common.destroy();
      form?.removeEventListener('submit', onSubmit);
    },
  };
}
