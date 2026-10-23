// §11 타이틀 → (최초 1회) 닉네임 입력. 모바일 키보드 호환을 위해 HTML 오버레이 사용.
import { FALLBACK_NICKNAME, sanitizeNickname } from '../config/constants.js';
import { Storage } from './Storage.js';

export function promptNickname(scene, { allowCancel = false, initial = '' } = {}) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('nick-overlay');
    const form = document.getElementById('nick-card');
    const input = document.getElementById('nick-input');
    const msg = document.getElementById('nick-msg');
    const ok = document.getElementById('nick-ok');
    const cancel = document.getElementById('nick-cancel');
    if (!overlay || !form) {
      resolve(null);
      return;
    }

    const keyboard = scene?.game?.input?.keyboard;
    if (keyboard) keyboard.enabled = false;

    let pendingReplace = false;
    cancel.hidden = !allowCancel;
    input.value = initial || '';
    msg.textContent = '';
    msg.style.color = '';
    ok.textContent = '결정';
    overlay.classList.add('open');
    setTimeout(() => input.focus(), 60);

    const close = (value) => {
      overlay.classList.remove('open');
      form.removeEventListener('submit', onSubmit);
      cancel.removeEventListener('click', onCancel);
      input.blur();
      if (keyboard) keyboard.enabled = true;
      resolve(value);
    };

    const onSubmit = (e) => {
      e.preventDefault();
      if (pendingReplace) {
        Storage.setNickname(FALLBACK_NICKNAME);
        close(FALLBACK_NICKNAME);
        return;
      }
      const r = sanitizeNickname(input.value);
      if (!r.ok && !r.value) {
        msg.textContent = r.reason;
        return;
      }
      if (r.replaced) {
        pendingReplace = true;
        msg.style.color = '#ffe066';
        msg.textContent = `${r.reason} '${FALLBACK_NICKNAME}'(으)로 대체돼요.`;
        ok.textContent = '이대로 결정';
        input.addEventListener(
          'input',
          () => {
            pendingReplace = false;
            ok.textContent = '결정';
            msg.textContent = '';
          },
          { once: true }
        );
        return;
      }
      Storage.setNickname(r.value);
      close(r.value);
    };
    const onCancel = () => close(null);

    form.addEventListener('submit', onSubmit);
    cancel.addEventListener('click', onCancel);
  });
}
