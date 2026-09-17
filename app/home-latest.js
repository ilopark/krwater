// 메인 페이지 "시공사진" 영역을 갤러리 최신 4건으로 교체 (게시물이 없으면 기존 사진 유지)
import { sb } from './supabase.js';
import { esc, youtubeId, resolveUrl } from './ui.js';

const list = document.querySelector('.pic_lt ul');
if (list) {
  try {
    const { data, error } = await sb.from('gallery_posts')
      .select('id, title, description, created_at, gallery_media(media_type, url, sort_order)')
      .order('created_at', { ascending: false }).limit(4);
    if (!error && data && data.length) {
      const pad = (n) => String(n).padStart(2, '0');
      list.innerHTML = data.map((p) => {
        const m = (p.gallery_media || []).slice().sort((a, b) => a.sort_order - b.sort_order)[0];
        const href = `bbs/board.php@bo_table=gallery.html?id=${p.id}`;
        let cover;
        if (!m) cover = `<img src="theme/home/img/main/main_section_2.jpg" alt="">`;
        else if (m.media_type === 'image') cover = `<img src="${esc(resolveUrl(m.url))}" alt="${esc(p.title)}">`;
        else if (m.media_type === 'embed') { const y = youtubeId(m.url); cover = `<img src="${y ? `https://img.youtube.com/vi/${y}/hqdefault.jpg` : 'theme/home/img/main/main_section_2.jpg'}" alt="">`; }
        else cover = `<video src="${esc(resolveUrl(m.url))}#t=0.5" muted preload="metadata" style="width:100%;height:100%;object-fit:cover"></video>`;
        const d = new Date(p.created_at);
        const desc = (p.description || '').split('\n').filter(Boolean).slice(0, 2).map((t) => `<p>${esc(t)}</p>`).join('');
        return `<li>
          <a href="${href}" class="lt_img" style="padding:10px">${cover}</a>
          <a class="gall_text_area" href="${href}"><div class="text_area_box"><div class="gall_title"><strong style="padding:10px">${esc(p.title)}</strong></div><div class="gall_content">${desc}</div></div></a>
          <span class="lt_date" style="padding:10px"><i class="fa fa-clock-o" aria-hidden="true"></i>${pad(d.getMonth() + 1)}-${pad(d.getDate())}</span>
        </li>`;
      }).join('');
    }
  } catch (e) { /* 실패 시 정적 사진 유지 */ }
}
