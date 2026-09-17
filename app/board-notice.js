// 공지사항 / 뉴스 게시판 — 기존 화면(그누보드 스킨 마크업) 그대로, 데이터만 Supabase 에서 가져오고
// 관리자로 로그인했을 때만 글쓰기 / 수정 / 삭제 버튼이 보임
import { sb, getProfile, humanError } from './supabase.js';
import { PAGE_SIZE } from './config.js';
import { esc, nl2br, fmtDate, fmtDateShort, qs, toast, setBusy } from './ui.js';

const $ = (id) => document.getElementById(id);
const boTable = document.querySelector('input[name="bo_table"]')?.value || 'notice';
const category = boTable === 'news01' ? 'news' : 'notice';
const listEl = $('bo_list'), viewEl = $('bo_v'), formEl = $('bo_w');
const show = (which) => { listEl.style.display = which === 'list' ? '' : 'none'; viewEl.style.display = which === 'view' ? '' : 'none'; formEl.style.display = which === 'form' ? '' : 'none'; };

const profile = await getProfile().catch(() => null);
const isAdmin = profile?.role === 'admin';
let current = null;

// ---------- 목록 ----------
async function loadList(page) {
  const rows = $('bo-rows');
  const from = (page - 1) * PAGE_SIZE, to = from + PAGE_SIZE - 1;
  const { data, count, error } = await sb.from('notices')
    .select('id, title, is_pinned, view_count, author_name, created_at', { count: 'exact' })
    .eq('category', category)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);
  rows.querySelectorAll('li:not(.board-head-list)').forEach((li) => li.remove());
  if (error) { rows.insertAdjacentHTML('beforeend', `<li><div class="empty_table">${esc(humanError(error))}</div></li>`); return; }
  const pages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
  $('bo_list_total').innerHTML = `<span>Total ${count || 0} </span> / ${pages} Page`;
  if (!data.length) { rows.insertAdjacentHTML('beforeend', '<li><div class="empty_table">게시물이 없습니다.</div></li>'); }
  else {
    rows.insertAdjacentHTML('beforeend', data.map((n) => `
      <li class="board-list board-list-body${n.is_pinned ? ' bo_notice' : ''}">
        <div class="list-item list-subject"><a href="?id=${n.id}" class="bo_tit">${n.is_pinned ? '<span class="notice_icon">공지</span> ' : ''}${esc(n.title)}</a></div>
        <div class="list-item list-info list-writer">${esc(n.author_name || '대한수자원')}</div>
        <div class="list-item list-info list-count">${n.view_count}</div>
        <div class="list-item list-info list-date">${fmtDate(n.created_at)}</div>
      </li>`).join(''));
  }
  // 페이지네이션 (그누보드 마크업)
  const pager = $('bo-pager');
  if (pages > 1) {
    let h = '';
    if (page > 1) h += `<a href="?page=${page - 1}" class="pg_page pg_start">이전</a>`;
    for (let p = Math.max(1, page - 4); p <= Math.min(pages, page + 4); p++) h += p === page ? `<strong class="pg_current">${p}</strong>` : `<a href="?page=${p}" class="pg_page">${p}</a>`;
    if (page < pages) h += `<a href="?page=${page + 1}" class="pg_page pg_end">다음</a>`;
    pager.querySelector('.pg').innerHTML = h; pager.style.display = '';
  } else pager.style.display = 'none';
  // 관리자: 글쓰기 버튼
  if (isAdmin && !$('bo-write')) {
    $('bo_btn_top').insertAdjacentHTML('beforeend',
      `<ul class="btn_bo_user app-admin"><li class="board-write-btn"><a class="btn_b01 btn" id="bo-write"><span class="board-write">글쓰기</span></a></li></ul>`);
    $('bo-write').addEventListener('click', (e) => { e.preventDefault(); openForm(null); });
  }
  show('list');
}

// ---------- 상세 ----------
async function loadView(id) {
  const { data, error } = await sb.from('notices').select('*').eq('id', id).eq('category', category).maybeSingle();
  if (error || !data) { toast(error ? humanError(error) : '게시물이 없습니다.', 'error'); location.replace(location.pathname); return; }
  current = data;
  viewEl.querySelector('.bo_v_tit').textContent = data.title;
  $('bo-v-author').textContent = data.author_name || '대한수자원';
  $('bo-v-views').textContent = `${data.view_count + 1}회`;
  $('bo-v-date').textContent = fmtDateShort(data.created_at);
  $('bo_v_con').innerHTML = nl2br(data.content);
  document.querySelectorAll('.bo-v-admin').forEach((el) => { el.style.display = isAdmin ? '' : 'none'; });
  document.title = `${data.title} | 대한수자원`;
  show('view');
  sb.rpc('increment_notice_view', { p_id: data.id }).then(() => {});
}

$('bo-v-edit')?.addEventListener('click', (e) => { e.preventDefault(); openForm(current); });
$('bo-v-del')?.addEventListener('click', async (e) => {
  e.preventDefault();
  if (!current || !confirm(`"${current.title}" 글을 삭제하시겠습니까?`)) return;
  const { error } = await sb.from('notices').delete().eq('id', current.id);
  if (error) return toast(humanError(error), 'error');
  toast('삭제되었습니다.', 'success');
  setTimeout(() => location.href = location.pathname, 400);
});

// ---------- 글쓰기 / 수정 ----------
function openForm(post) {
  if (!isAdmin) return toast('관리자만 작성할 수 있습니다.', 'error');
  const f = $('bo-w-form');
  $('bo-w-title').textContent = post ? '글 수정' : '글쓰기';
  f.title.value = post?.title || '';
  f.content.value = post?.content || '';
  f.is_pinned.checked = !!post?.is_pinned;
  f.dataset.editId = post?.id || '';
  $('bo-w-msg').style.display = 'none';
  show('form');
  f.title.focus();
}
$('bo-w-cancel').addEventListener('click', () => current ? show('view') : show('list'));
$('bo-w-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target, msg = $('bo-w-msg'), btn = f.querySelector('.btn_submit');
  const payload = { category, title: f.title.value.trim(), content: f.content.value, is_pinned: f.is_pinned.checked };
  if (!payload.title) { msg.textContent = '제목을 입력하세요.'; msg.style.display = ''; return; }
  setBusy(btn, true, '저장 중…');
  try {
    let id = f.dataset.editId;
    if (id) {
      const { error } = await sb.from('notices').update(payload).eq('id', id); if (error) throw error;
    } else {
      payload.author_id = profile.id; payload.author_name = profile.display_name;
      const { data, error } = await sb.from('notices').insert(payload).select('id').single(); if (error) throw error;
      id = data.id;
    }
    toast('저장되었습니다.', 'success');
    location.href = `${location.pathname}?id=${id}`;
  } catch (err) {
    msg.textContent = humanError(err); msg.style.display = '';
    setBusy(btn, false, '');
  }
});

// ---------- 라우팅 ----------
const id = qs('id');
if (id) await loadView(id);
else await loadList(Math.max(1, parseInt(qs('page') || '1', 10)));
