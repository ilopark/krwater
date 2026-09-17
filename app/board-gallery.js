// 시공사진(갤러리) — 기존 갤러리 스킨 마크업 그대로, 데이터만 Supabase. 관리자만 글쓰기/수정/삭제/파일추가
import { sb, getProfile, humanError } from './supabase.js?v=202609171444';
import { GALLERY_BUCKET, MAX_IMAGE_EDGE, IMAGE_QUALITY, MAX_VIDEO_MB, PAGE_SIZE } from './config.js?v=202609171444';
import { esc, nl2br, fmtDate, fmtDateShort, fmtBytes, qs, toast, setBusy, youtubeId, resolveUrl, shrinkImage, safeName } from './ui.js?v=202609171444';

const $ = (id) => document.getElementById(id);
const listEl = $('bo_gall') || $('bo_list'), viewEl = $('bo_v'), formEl = $('bo_w');   // 갤러리 스킨은 #bo_gall
const show = (which) => { listEl.style.display = which === 'list' ? '' : 'none'; viewEl.style.display = which === 'view' ? '' : 'none'; formEl.style.display = which === 'form' ? '' : 'none'; };
const storage = sb.storage.from(GALLERY_BUCKET);
const publicUrl = (path) => storage.getPublicUrl(path).data.publicUrl;

const profile = await getProfile().catch(() => null);
const isAdmin = profile?.role === 'admin';
let current = null;

const firstMedia = (media) => (media || []).slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)[0];
function coverHtml(m) {
  if (!m) return `<span class="no_image"><i class="fa fa-picture-o" aria-hidden="true"></i></span>`;
  if (m.media_type === 'image') return `<img src="${esc(resolveUrl(m.url))}" alt="">`;
  if (m.media_type === 'embed') { const y = youtubeId(m.url); return y ? `<img src="https://img.youtube.com/vi/${y}/hqdefault.jpg" alt="">` : `<span class="no_image">▶</span>`; }
  return `<video src="${esc(resolveUrl(m.url))}#t=0.5" muted preload="metadata" style="width:100%;display:block"></video>`;
}

// ---------- 목록 ----------
async function loadList(page) {
  const ul = $('gall_ul');
  const from = (page - 1) * PAGE_SIZE, to = from + PAGE_SIZE - 1;
  const { data, count, error } = await sb.from('gallery_posts')
    .select('id, title, description, view_count, created_at, gallery_media(id, media_type, url, sort_order)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) { ul.innerHTML = `<li class="empty_table">${esc(humanError(error))}</li>`; return; }
  const pages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
  $('bo_list_total').innerHTML = `<span>Total ${count || 0}</span> / ${pages} 페이지`;
  ul.innerHTML = data.length ? data.map((p) => `
    <li class="gall_li col-gn-4">
      <div class="gall_box">
        <div class="gall_chk"><span class="sound_only">${p.id}</span></div>
        <div class="gall_con">
          <div class="gall_img"><a href="?id=${p.id}">${coverHtml(firstMedia(p.gallery_media))}</a></div>
          <div class="gall_text_href">
            <a href="?id=${p.id}" class="bo_tit">
              <div class="gall-tit">${esc(p.title)}</div>
              <div class="gall_info">
                <span class="">Hit ${p.view_count ?? 0} </span><span class=""> </span><span class=""> </span>
                <span class="gall_date"><span class="sound_only">작성일 </span> ${fmtDate(p.created_at)}</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </li>`).join('') : '<li class="empty_table" style="width:100%;text-align:center;padding:60px 0">게시물이 없습니다.</li>';
  const pager = $('bo-pager');
  if (pages > 1) {
    let h = '';
    if (page > 1) h += `<a href="?page=${page - 1}" class="pg_page pg_start">이전</a>`;
    for (let p = Math.max(1, page - 4); p <= Math.min(pages, page + 4); p++) h += p === page ? `<strong class="pg_current">${p}</strong>` : `<a href="?page=${p}" class="pg_page">${p}</a>`;
    if (page < pages) h += `<a href="?page=${page + 1}" class="pg_page pg_end">다음</a>`;
    pager.querySelector('.pg').innerHTML = h; pager.style.display = '';
  } else pager.style.display = 'none';
  if (isAdmin && !$('bo-write')) {
    $('bo_btn_top').insertAdjacentHTML('beforeend',
      `<ul class="btn_bo_user app-admin"><li class="board-write-btn"><a class="btn_b01 btn" id="bo-write"><span class="board-write">글쓰기</span></a></li></ul>`);
    $('bo-write').addEventListener('click', (e) => { e.preventDefault(); openForm(null); });
  }
  show('list');
}

// ---------- 상세 ----------
function mediaHtml(m) {
  let inner;
  const url = resolveUrl(m.url);
  if (m.media_type === 'image') inner = `<img src="${esc(url)}" alt="${esc(m.file_name || '')}">`;
  else if (m.media_type === 'video') inner = `<video src="${esc(url)}" controls preload="metadata"></video>`;
  else { const y = youtubeId(m.url); inner = y ? `<div class="app-embed"><iframe src="https://www.youtube.com/embed/${y}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>` : `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.url)}</a>`; }
  return `<div class="app-media" data-id="${m.id}">${inner}${isAdmin ? `<div class="app-media-del"><a data-id="${m.id}" data-path="${esc(m.storage_path || '')}">이 파일 삭제</a></div>` : ''}</div>`;
}

async function loadView(id) {
  const { data, error } = await sb.from('gallery_posts').select('*, gallery_media(*)').eq('id', id).maybeSingle();
  if (error || !data) { toast(error ? humanError(error) : '게시물이 없습니다.', 'error'); location.replace(location.pathname); return; }
  current = data;
  current.gallery_media.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  viewEl.querySelector('.bo_v_tit').textContent = data.title;
  $('bo-v-author').textContent = data.author_name || '대한수자원';
  $('bo-v-views').textContent = `${(data.view_count ?? 0) + 1}회`;
  $('bo-v-date').textContent = fmtDateShort(data.created_at);
  $('bo_v_con').innerHTML = current.gallery_media.map(mediaHtml).join('') + (data.description ? `<p>${nl2br(data.description)}</p>` : '');
  document.querySelectorAll('.bo-v-admin').forEach((el) => { el.style.display = isAdmin ? '' : 'none'; });
  document.title = `${data.title} | 대한수자원`;
  show('view');
  sb.rpc('increment_gallery_view', { p_id: data.id }).then(() => {});
}

$('bo_v_con').addEventListener('click', async (e) => {
  const a = e.target.closest('.app-media-del a');
  if (!a || !confirm('이 파일을 삭제하시겠습니까?')) return;
  try {
    if (a.dataset.path) { const { error } = await storage.remove([a.dataset.path]); if (error) throw error; }
    const { error } = await sb.from('gallery_media').delete().eq('id', a.dataset.id); if (error) throw error;
    a.closest('.app-media').remove();
    toast('삭제되었습니다.', 'success');
  } catch (err) { toast(humanError(err), 'error'); }
});
$('bo-v-edit')?.addEventListener('click', (e) => { e.preventDefault(); openForm(current); });
$('bo-v-del')?.addEventListener('click', async (e) => {
  e.preventDefault();
  if (!current || !confirm(`"${current.title}" 게시물과 첨부 파일을 모두 삭제하시겠습니까?`)) return;
  try {
    const paths = current.gallery_media.map((m) => m.storage_path).filter(Boolean);
    if (paths.length) { const { error } = await storage.remove(paths); if (error) throw error; }
    const { error } = await sb.from('gallery_posts').delete().eq('id', current.id); if (error) throw error;
    toast('삭제되었습니다.', 'success');
    setTimeout(() => location.href = location.pathname, 400);
  } catch (err) { toast(humanError(err), 'error'); }
});

// ---------- 글쓰기 / 수정 ----------
function openForm(post) {
  if (!isAdmin) return toast('관리자만 작성할 수 있습니다.', 'error');
  const f = $('bo-w-form');
  $('bo-w-title').textContent = post ? '게시물 수정 / 파일 추가' : '글쓰기';
  f.title.value = post?.title || '';
  f.description.value = post?.description || '';
  f.files.value = ''; f.embeds.value = '';
  f.dataset.editId = post?.id || '';
  $('bo-w-files').textContent = '';
  $('bo-w-msg').style.display = 'none';
  $('bo-w-progress').style.display = 'none';
  show('form');
  f.title.focus();
}
$('bo-w-cancel').addEventListener('click', () => current ? show('view') : show('list'));
$('bo-w-form').files.addEventListener('change', (e) => {
  $('bo-w-files').innerHTML = [...e.target.files].map((f) => `• ${esc(f.name)} (${fmtBytes(f.size)})`).join('<br>');
});
$('bo-w-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target, msg = $('bo-w-msg'), btn = f.querySelector('.btn_submit');
  const showErr = (t) => { msg.textContent = t; msg.style.display = ''; };
  const title = f.title.value.trim(), description = f.description.value;
  const files = [...f.files.files];
  const embeds = f.embeds.value.split('\n').map((s) => s.trim()).filter(Boolean);
  if (!title) return showErr('제목을 입력하세요.');
  const tooBig = files.find((x) => x.type.startsWith('video/') && x.size > MAX_VIDEO_MB * 1024 * 1024);
  if (tooBig) return showErr(`동영상 "${tooBig.name}" 이(가) ${MAX_VIDEO_MB}MB 를 넘습니다. 유튜브에 올리고 링크로 넣어주세요.`);
  const badEmbed = embeds.find((u) => !youtubeId(u));
  if (badEmbed) return showErr(`유튜브 링크 형식이 아닙니다: ${badEmbed}`);

  const total = files.length + embeds.length;
  const prog = (n, text) => { $('bo-w-progress').style.display = ''; $('bo-w-progress-text').textContent = text; $('bo-w-progress-bar').style.width = `${total ? Math.round(n / total * 100) : 100}%`; };
  setBusy(btn, true, '저장 중…');
  try {
    let postId = f.dataset.editId;
    if (postId) { const { error } = await sb.from('gallery_posts').update({ title, description }).eq('id', postId); if (error) throw error; }
    else {
      const { data, error } = await sb.from('gallery_posts').insert({ title, description, author_id: profile.id, author_name: profile.display_name }).select('id').single();
      if (error) throw error; postId = data.id;
    }
    const { data: existing } = await sb.from('gallery_media').select('sort_order').eq('post_id', postId).order('sort_order', { ascending: false }).limit(1);
    let order = (existing?.[0]?.sort_order ?? -1) + 1, done = 0;
    for (const raw of files) {
      prog(done, `업로드 중 (${done + 1}/${total}) ${raw.name}`);
      const file = await shrinkImage(raw, MAX_IMAGE_EDGE, IMAGE_QUALITY);
      const path = `${postId}/${Date.now()}_${safeName(file.name)}`;
      const { error: upErr } = await storage.upload(path, file, { contentType: file.type, upsert: false }); if (upErr) throw upErr;
      const { error } = await sb.from('gallery_media').insert({ post_id: postId, media_type: file.type.startsWith('video/') ? 'video' : 'image', storage_path: path, url: publicUrl(path), file_name: raw.name, file_size: file.size, sort_order: order++ });
      if (error) throw error; done++;
    }
    for (const url of embeds) {
      const { error } = await sb.from('gallery_media').insert({ post_id: postId, media_type: 'embed', url, sort_order: order++ }); if (error) throw error; done++;
    }
    prog(total, '완료');
    toast('저장되었습니다.', 'success');
    location.href = `${location.pathname}?id=${postId}`;
  } catch (err) { showErr(humanError(err)); setBusy(btn, false, ''); }
});

// ---------- 라우팅 ----------
const id = qs('id');
if (id) await loadView(id);
else await loadList(Math.max(1, parseInt(qs('page') || '1', 10)));
