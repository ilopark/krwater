// 공통 UI: 헤더/내비, 토스트, 유틸
import { sb, getProfile, signOut } from './supabase.js';

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const nl2br = (s) => esc(s).replace(/\r?\n/g, '<br>');

export function fmtDate(iso, withTime = false) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return withTime ? `${date} ${p(d.getHours())}:${p(d.getMinutes())}` : date;
}

export function fmtBytes(n) {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const qs = (k) => new URLSearchParams(location.search).get(k);

export function toast(msg, type = 'info', ms = 3500) {
  let box = document.getElementById('toast-box');
  if (!box) { box = document.createElement('div'); box.id = 'toast-box'; document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 300); }, ms);
}

// 헤더 렌더링 (active: 'notices' | 'gallery' | 'login' | 'signup' | '')
export async function renderHeader(active = '') {
  const host = document.getElementById('app-header');
  if (!host) return null;
  const profile = await getProfile();
  const isAdmin = profile?.role === 'admin';
  host.innerHTML = `
    <header class="hdr">
      <div class="hdr-inner">
        <a class="brand" href="../index.html" title="사이트 홈으로">
          <img src="../theme/home/img/logo_b.png" alt="대한수자원">
        </a>
        <nav class="nav">
          <a href="./notices.html" class="${active === 'notices' ? 'on' : ''}">공지사항</a>
          <a href="./notices.html?category=news" class="${active === 'news' ? 'on' : ''}">뉴스</a>
          <a href="./gallery.html" class="${active === 'gallery' ? 'on' : ''}">갤러리</a>
          <a href="./certificates.html" class="${active === 'certificates' ? 'on' : ''}">인증서</a>
        </nav>
        <div class="auth">
          ${profile
            ? `<span class="who">${esc(profile.display_name)}${isAdmin ? ' <b class="badge">관리자</b>' : ''}</span>
               <button id="btn-logout" class="btn btn-sm btn-ghost">로그아웃</button>`
            : `<a href="./login.html" class="btn btn-sm btn-ghost ${active === 'login' ? 'on' : ''}">로그인</a>
               <a href="./signup.html" class="btn btn-sm ${active === 'signup' ? 'on' : ''}">회원가입</a>`}
        </div>
      </div>
    </header>`;
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await signOut();
    toast('로그아웃 되었습니다.');
    setTimeout(() => location.href = './login.html', 400);
  });
  return profile;
}

// 로그인 상태가 바뀌면 헤더 갱신
sb.auth.onAuthStateChange(() => {
  const host = document.getElementById('app-header');
  if (host && host.dataset.active !== undefined) renderHeader(host.dataset.active);
});

export function setBusy(el, busy, label) {
  if (!el) return;
  el.disabled = busy;
  if (label !== undefined) {
    if (busy) { el.dataset.label = el.textContent; el.textContent = label; }
    else if (el.dataset.label) { el.textContent = el.dataset.label; }
  }
}

// 유튜브 URL → 영상 ID (아니면 null)
export function youtubeId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
