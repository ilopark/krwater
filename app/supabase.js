// Supabase 클라이언트 + 인증/프로필 헬퍼
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, AUTH_EMAIL_DOMAIN } from './config.js?v=202609171444';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// 아이디 → Supabase Auth 용 이메일
export function toEmail(username) {
  return `${String(username).trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

export async function getSession() {
  const { data } = await sb.auth.getSession();
  return data.session ?? null;
}

let _profileCache = null;
export async function getProfile(force = false) {
  const session = await getSession();
  if (!session) { _profileCache = null; return null; }
  if (_profileCache && _profileCache.id === session.user.id && !force) return _profileCache;
  const { data, error } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  if (error) { console.error('profile load error', error); return null; }
  _profileCache = data;
  return data;
}

export async function isAdmin() {
  const p = await getProfile();
  return p?.role === 'admin';
}

export async function signIn(username, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email: toEmail(username), password });
  if (error) throw error;
  _profileCache = null;
  return data;
}

export async function signUp({ username, displayName, password }) {
  const { data, error } = await sb.auth.signUp({
    email: toEmail(username),
    password,
    options: { data: { username: username.trim().toLowerCase(), display_name: displayName.trim() } },
  });
  if (error) throw error;
  _profileCache = null;
  return data;
}

export async function signOut() {
  await sb.auth.signOut();
  _profileCache = null;
}

sb.auth.onAuthStateChange(() => { _profileCache = null; });

// 에러 메시지 한글화 (자주 나오는 것만)
export function humanError(err) {
  const m = String(err?.message || err || '');
  if (/Invalid login credentials/i.test(m)) return '아이디 또는 비밀번호가 올바르지 않습니다.';
  if (/User already registered|already been registered/i.test(m)) return '이미 사용 중인 아이디입니다.';
  if (/Password should be at least/i.test(m)) return '비밀번호는 6자 이상이어야 합니다.';
  if (/Email not confirmed/i.test(m)) return '이메일 확인이 켜져 있습니다. Supabase → Authentication → Providers → Email → "Confirm email" 을 끄세요.';
  if (/row-level security|violates row-level security/i.test(m)) return '권한이 없습니다 (관리자만 가능).';
  if (/Signups not allowed/i.test(m)) return '현재 회원가입이 막혀 있습니다 (Supabase 설정).';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Supabase 에 연결할 수 없습니다. app/config.js 의 URL/KEY 를 확인하세요.';
  return m || '알 수 없는 오류';
}
