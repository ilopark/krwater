// =====================================================================
//  Supabase 연결 설정 — Supabase 대시보드 → Project Settings → API 에서 복사
//  * anon(public) key 는 브라우저에 노출되는 게 정상. 보안은 DB 의 RLS 정책이 담당.
//  * service_role key 는 절대 여기(또는 저장소 어디에도) 넣지 말 것.
// =====================================================================
export const SUPABASE_URL = 'https://fpbmlhawihcdlwlmacmu.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_eqlY5dGrDMzE2JL_5kUVLw_iA6OMojF';

// 아이디 기반 로그인: Supabase Auth 는 이메일을 요구하므로 "아이디@도메인" 형태로 변환해 사용
// (실제 메일 수신 안 됨 → Supabase Auth 의 'Confirm email' 을 꺼야 함. README 참고)
export const AUTH_EMAIL_DOMAIN = 'users.krwater.co.kr';

// 갤러리 업로드
export const GALLERY_BUCKET = 'gallery';
export const MAX_IMAGE_EDGE = 1600;   // 업로드 전 브라우저에서 긴 변 기준 리사이즈(px)
export const IMAGE_QUALITY = 0.85;    // JPEG 품질
export const MAX_VIDEO_MB = 50;       // Supabase 무료 플랜 파일 한도

// 페이지네이션
export const PAGE_SIZE = 15;
