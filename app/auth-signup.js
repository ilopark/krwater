// 회원가입 — 사용자명 / 아이디 / 비밀번호. (비밀번호는 Supabase Auth 가 bcrypt 로 보관)
import { signUp, humanError, getSession, USERNAME_RE } from './supabase.js?v=202609171443';
import { setBusy } from './ui.js?v=202609171443';

const form = document.getElementById('fregister');
const msg = document.getElementById('signup-msg');
if (await getSession()) location.replace('../index.html');
const showErr = (t) => { msg.textContent = t; msg.style.display = ''; };

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.style.display = 'none';
  const displayName = form.mb_name.value.trim();
  const username = form.mb_id.value.trim().toLowerCase();
  const password = form.mb_password.value, password2 = form.mb_password_re.value;
  if (!displayName) return showErr('사용자명을 입력하세요.');
  if (!USERNAME_RE.test(username)) return showErr('아이디는 영문 소문자·숫자·밑줄(_) 3~20자로 입력하세요.');
  if (password.length < 8) return showErr('비밀번호는 8자 이상이어야 합니다.');
  if (password !== password2) return showErr('비밀번호가 서로 다릅니다.');
  const btn = form.querySelector('.btn_submit');
  setBusy(btn, true, '가입 중…');
  try {
    const { session } = await signUp({ username, displayName, password });
    if (!session) return showErr('가입은 되었지만 이메일 확인 설정이 켜져 있어 로그인할 수 없습니다. Supabase → Authentication → Confirm email 을 끄세요.');
    location.href = '../index.html';
  } catch (err) { showErr(humanError(err)); }
  finally { setBusy(btn, false, ''); }
});
