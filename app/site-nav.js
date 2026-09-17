// 사이트 헤더 "로그인" 메뉴: 로그인 상태면 "이름 · 로그아웃" 으로 표시
import { getProfile, signOut } from './supabase.js?v=202609171438';
import { toast } from './ui.js?v=202609171438';

const link = document.getElementById('site-auth-link');
if (link) {
  try {
    const profile = await getProfile();
    if (profile) {
      link.textContent = `${profile.role === 'admin' ? '관리자' : profile.display_name} · 로그아웃`;
      link.title = `${profile.display_name} 로그아웃`;
      link.classList.add('app-logout');
      link.setAttribute('href', '#');
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        await signOut();
        toast('로그아웃 되었습니다.');
        setTimeout(() => location.reload(), 400);
      });
    }
  } catch (e) { /* 연결 실패 시 '로그인' 유지 */ }
}
