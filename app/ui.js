// 공통 유틸 (토스트, 이스케이프, 날짜, URL 등). 화면 구조는 건드리지 않음
export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const nl2br = (s) => esc(s).replace(/\r?\n/g, '<br>');

// 사이트 루트 기준 상대경로 (각 페이지의 <meta name="site-root"> 로 주입됨)
export const SITE_ROOT = document.querySelector('meta[name="site-root"]')?.content ?? '';
export const resolveUrl = (u) => (/^(https?:)?\/\//.test(u || '') ? u : SITE_ROOT + (u || ''));

export function fmtDate(iso, withTime = false) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return withTime ? `${date} ${p(d.getHours())}:${p(d.getMinutes())}` : date;
}
// 원본 사이트 상세 화면 표기 (21-10-28 12:19)
export function fmtDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${String(d.getFullYear()).slice(2)}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
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

// 이미지: 브라우저에서 리사이즈 → JPEG (용량·트래픽 절약). GIF/SVG 는 그대로
export async function shrinkImage(file, maxEdge = 1600, quality = 0.85) {
  if (!file.type.startsWith('image/') || /gif|svg/.test(file.type)) return file;
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { return file; }
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.type === 'image/jpeg' && file.size < 1024 * 1024) return file;
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', quality));
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}
export const safeName = (name) => name.normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(-80) || 'file';
