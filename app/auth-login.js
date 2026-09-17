// 기존 로그인 화면(bbs/login.php.html) 그대로, 제출만 Supabase 로 처리
import { signIn, humanError, getSession } from './supabase.js';
import { qs, setBusy } from './ui.js';

const form = document.getElementById('flogin');
const msg = document.getElementById('login-msg');
const next = qs('next') || '../index.html';
if (await getSession()) location.replace(next);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.style.display = 'none';
  const id = form.mb_id.value.trim(), pw = form.mb_password.value;
  if (!id || !pw) { msg.textContent = '아이디와 비밀번호를 입력하세요.'; msg.style.display = ''; return; }
  const btn = form.querySelector('.btn_submit');
  setBusy(btn, true, '로그인 중…');
  try {
    await signIn(id, pw);
    location.href = next;
  } catch (err) {
    msg.textContent = humanError(err); msg.style.display = '';
    setBusy(btn, false, '');
  }
});
