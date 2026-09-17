// 인증서 — 기존 인증서 화면(그리드) 그대로. 이미지는 그대로 표시, PDF 는 미리보기 영역. 관리자만 등록/수정/삭제
import { sb, getProfile, humanError } from './supabase.js?v=202609171438';
import { IMAGE_QUALITY } from './config.js?v=202609171438';
import { esc, toast, setBusy, resolveUrl, shrinkImage, safeName } from './ui.js?v=202609171438';

const BUCKET = 'certificates', MAX_MB = 20, MAX_EDGE = 2000;
const $ = (id) => document.getElementById(id);
const storage = sb.storage.from(BUCKET);
const publicUrl = (path) => storage.getPublicUrl(path).data.publicUrl;
const ul = $('cert-list');
const staticHtml = ul.innerHTML;   // DB 에 아무것도 없을 때 기존 정적 이미지 유지

const profile = await getProfile().catch(() => null);
const isAdmin = profile?.role === 'admin';
let items = [];

function itemHtml(c) {
  const url = resolveUrl(c.url);
  const admin = isAdmin ? `<div class="cert-admin"><a data-act="edit" data-id="${c.id}">수정</a><a data-act="del" data-id="${c.id}" class="app-danger">삭제</a></div>` : '';
  const body = c.file_type === 'pdf'
    ? `<iframe class="cert-pdf" src="${esc(url)}#toolbar=0&view=FitH" title="${esc(c.title)}"></iframe>`
    : `<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(c.title)}"></a>`;
  return `<li class="cert-item" data-id="${c.id}">${admin}${body}
    <p class="cert-title">${esc(c.title)}</p>${c.description ? `<p class="cert-desc">${esc(c.description)}</p>` : ''}
    ${c.file_type === 'pdf' ? `<p class="cert-links"><a href="${esc(url)}" target="_blank" rel="noopener">새 창에서 보기</a><a href="${esc(url)}" download>다운로드</a></p>` : ''}
  </li>`;
}

async function load() {
  const { data, error } = await sb.from('certificates').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
  if (error) { toast(humanError(error), 'error'); return; }
  items = data;
  ul.innerHTML = data.length ? data.map(itemHtml).join('') : staticHtml;
  if (isAdmin) {
    $('cert-toolbar').style.display = '';
    if (!data.length) ul.querySelectorAll('li').forEach((li) => li.insertAdjacentHTML('afterbegin', '<p class="cert-desc" style="color:#c33">※ 이 이미지는 옛 사이트의 고정 이미지입니다. "인증서 등록"으로 올리면 이 자리를 대체합니다.</p>'));
  }
}

ul.addEventListener('click', async (e) => {
  const a = e.target.closest('.cert-admin a');
  if (!a) return;
  e.preventDefault();
  const c = items.find((x) => String(x.id) === a.dataset.id);
  if (!c) return;
  if (a.dataset.act === 'edit') return openForm(c);
  if (!confirm(`"${c.title}" 인증서를 삭제하시겠습니까?`)) return;
  try {
    if (c.storage_path) { const { error } = await storage.remove([c.storage_path]); if (error) throw error; }
    const { error } = await sb.from('certificates').delete().eq('id', c.id); if (error) throw error;
    toast('삭제되었습니다.', 'success');
    await load();
  } catch (err) { toast(humanError(err), 'error'); }
});

// ---------- 등록 / 수정 ----------
function openForm(cert) {
  const f = $('cert-form');
  $('cert-form-title').textContent = cert ? '인증서 수정' : '인증서 등록';
  f.title.value = cert?.title || '';
  f.description.value = cert?.description || '';
  f.sort_order.value = cert?.sort_order ?? 0;
  f.file.value = '';
  f.dataset.editId = cert?.id || '';
  $('cert-file-info').textContent = cert ? `현재 파일: ${cert.file_name || cert.url} — 바꾸려면 새 파일을 선택하세요 (비우면 유지)` : 'PDF 또는 JPG/PNG, 20MB 이하. 이미지는 긴 변 2000px 로 자동 축소됩니다.';
  $('cert-msg').style.display = 'none';
  $('cert-form-wrap').style.display = '';
  $('cert-form-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
  f.title.focus();
}
$('cert-new').addEventListener('click', (e) => { e.preventDefault(); openForm(null); });
$('cert-cancel').addEventListener('click', () => { $('cert-form-wrap').style.display = 'none'; });
$('cert-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target, msg = $('cert-msg'), btn = f.querySelector('.btn_submit');
  const showErr = (t) => { msg.textContent = t; msg.style.display = ''; };
  const title = f.title.value.trim(), description = f.description.value, sort_order = parseInt(f.sort_order.value || '0', 10) || 0;
  const raw = f.file.files[0] || null, editId = f.dataset.editId;
  if (!title) return showErr('제목을 입력하세요.');
  if (!editId && !raw) return showErr('PDF 또는 이미지 파일을 선택하세요.');
  if (raw && !(raw.type === 'application/pdf' || raw.type.startsWith('image/'))) return showErr('PDF 또는 이미지 파일만 올릴 수 있습니다.');
  if (raw && raw.size > MAX_MB * 1024 * 1024) return showErr(`파일이 ${MAX_MB}MB 를 넘습니다.`);
  setBusy(btn, true, '저장 중…');
  try {
    const payload = { title, description, sort_order };
    const prev = editId ? items.find((x) => String(x.id) === editId) : null;
    if (raw) {
      const file = raw.type === 'application/pdf' ? raw : await shrinkImage(raw, MAX_EDGE, IMAGE_QUALITY);
      const path = `${Date.now()}_${safeName(file.name)}`;
      const { error: upErr } = await storage.upload(path, file, { contentType: file.type, upsert: false }); if (upErr) throw upErr;
      Object.assign(payload, { file_type: raw.type === 'application/pdf' ? 'pdf' : 'image', storage_path: path, url: publicUrl(path), file_name: raw.name, file_size: file.size });
    }
    if (editId) {
      const { error } = await sb.from('certificates').update(payload).eq('id', editId); if (error) throw error;
      if (raw && prev?.storage_path) await storage.remove([prev.storage_path]);
    } else {
      payload.author_id = profile.id; payload.author_name = profile.display_name;
      const { error } = await sb.from('certificates').insert(payload); if (error) throw error;
    }
    toast('저장되었습니다.', 'success');
    $('cert-form-wrap').style.display = 'none';
    await load();
  } catch (err) { showErr(humanError(err)); }
  finally { setBusy(btn, false, ''); }
});

await load();
