// 메인 사이트(정적 페이지) 헤더의 "로그인" 메뉴를 로그인 상태에 맞게 바꿈
import { getProfile } from './supabase.js';

const link = document.getElementById('site-auth-link');
if (link) {
  try {
    const profile = await getProfile();
    if (profile) {
      const appDir = link.getAttribute('href').replace(/login\.html$/, '');
      link.textContent = profile.role === 'admin' ? `관리자 (${profile.display_name})` : profile.display_name;
      link.setAttribute('href', `${appDir}index.html`);
      link.title = '게시판 관리로 이동';
    }
  } catch (e) { /* 연결 실패 시 그대로 '로그인' 유지 */ }
}
