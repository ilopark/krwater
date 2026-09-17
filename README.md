# krwater.co.kr 정적 미러 (2026-09-17 스냅샷)

원본: https://krwater.co.kr (그누보드5 / PHP 7.2 / Apache, 호스팅 ivyro.net)
방법: `wget --mirror --page-requisites --convert-links --adjust-extension` (단일 호스트 krwater.co.kr 기준)

## 로컬 실행
```bash
python3 -m http.server 8090 --directory /Users/ilo/dev/krwater
# → http://localhost:8090
```

## 파일 매핑 (원본 URL → 로컬 파일)
| 원본 | 로컬 |
|---|---|
| `/` | `index.html` |
| `/theme/home/sub/introduce.php` (인사말) | `theme/home/sub/introduce.php.html` |
| `/theme/home/sub/certificate.php` (인증서) | ~~삭제~~ → `app/certificates.html` |
| `/theme/home/sub/organization.php` (조직도) | `theme/home/sub/organization.php.html` |
| `/theme/home/sub/map.php` (오시는길) | `theme/home/sub/map.php.html` |
| `/theme/home/sub/pro07.php` (심층지하수 개발) | `theme/home/sub/pro07.php.html` |
| `/bbs/board.php?bo_table=gallery` (시공사진) | ~~삭제~~ → `app/gallery.html` (Supabase) |
| `/bbs/board.php?bo_table=notice` (공지사항) | ~~삭제~~ → `app/notices.html?category=notice` |
| `/bbs/board.php?bo_table=news01` (뉴스) | ~~삭제~~ → `app/notices.html?category=news` |
| `/bbs/login.php`, `register.php`, `password_lost.php` | ~~삭제~~ → `app/login.html`, `app/signup.html` |

- CSS/JS/이미지/폰트: `theme/home/`, `js/`, `img/` 아래에 원본 경로 그대로 (구 `data/editor/` 시공사진은 제거 → Supabase Storage 로 이관)
- `?ver=210618` 같은 쿼리스트링은 파일명에서 `@ver=210618`로 치환됨

## 한계 (정적 복사본이므로)
- 로그인/회원가입/게시글 작성/관리자(adm) 등 PHP+DB 기능은 동작하지 않음 (화면만 복제)
- 외부 CDN 의존: Swiper(cdnjs), xeicon(jsdelivr), FontAwesome, Daum 지도(roughmap) → 인터넷 필요
- 원본 사이트 자체에 없는 파일(favicon.ico, index.css, noto-sans *.ttf, section3_plus_btn1.png)은 원본에서도 404

## 수동 보정 내역
- `theme/home/css/main.css`, `common/common.css`, `common/font.css`: 절대 URL(`https://krwater.co.kr/theme/home/`) → 상대경로
- `theme/home/img/main/skyscrapers-3184798_1920.jpg`, `theme/home/img/company/skyscrapers-2612766_1920.jpg`: wget이 놓친 CSS 배경 이미지 별도 다운로드

## 이미지 교체 (2026-09-17)
출처 불명 스톡 9장 → Pexels, 아이콘 16개 → Lucide(ISC), 사업소개 인포그래픽 → 자체 제작본으로 교체. 상세 목록: [IMAGE_SOURCES.md](IMAGE_SOURCES.md)

---

## 관리자 기능 (Supabase 연동) — 기존 화면 그대로, 관리자에게만 버튼 추가

정적 사이트(GitHub Pages / Cloudflare Pages)에서 그대로 동작. 빌드 없음. **화면 구조는 원본 그대로**이고, 게시판 데이터만 Supabase 에서 가져오며, 관리자로 로그인하면 글쓰기/수정/삭제 버튼이 나타난다.

| 화면 (원본 경로 그대로) | 동작 |
|---|---|
| `bbs/board.php@bo_table=notice.html` (공지사항), `news01.html` (뉴스) | 목록·상세(`?id=`)·페이지. 관리자: 글쓰기 / 수정 / 삭제 / 상단고정 |
| `bbs/board.php@bo_table=gallery.html` (시공사진) | 목록·상세. 관리자: 글쓰기, 사진·동영상 업로드, 유튜브 링크, 파일 삭제, 게시물 삭제 |
| `theme/home/sub/certificate.php.html` (인증서) | 이미지는 그대로, PDF 는 미리보기 영역. 관리자: 등록 / 수정(파일 교체) / 삭제 |
| `bbs/login.php.html`, `bbs/register.php.html` | 원본 로그인 박스 디자인, 제출만 Supabase Auth (아이디+비밀번호) |
| 헤더 메뉴 "로그인" | 로그인하면 "관리자 · 로그아웃" 으로 바뀜 |
| 메인 "시공사진" 4장 | 갤러리 최신 4건 (게시물 없으면 기존 사진 유지) |

| 파일 | 역할 |
|---|---|
| `supabase/schema.sql` | 테이블(profiles·notices·gallery_posts·gallery_media·certificates)·RLS·트리거·Storage 버킷 (재실행 안전) |
| `supabase/seed.sql` | 기존 시공사진 4건(제목·날짜) + 인증서 1건을 DB 에 등록 (1회). 사진 파일은 관리자 화면에서 다시 업로드 |
| `app/config.js` | Supabase URL / publishable key |
| `app/supabase.js`, `app/ui.js` | 클라이언트·인증 헬퍼, 유틸 |
| `app/board-notice.js`, `board-gallery.js`, `board-cert.js` | 각 화면에 삽입되는 모듈 (기존 스킨 마크업으로 렌더링) |
| `app/auth-login.js`, `auth-signup.js`, `site-nav.js`, `home-latest.js` | 로그인/가입, 헤더 상태, 메인 최신 사진 |
| `app/board.css` | 관리자 버튼·폼·토스트 등 추가분 스타일만 |

### 권한 구조
- 비밀번호는 Supabase Auth 가 **bcrypt** 로 저장 (앱 코드·DB 테이블에 비밀번호 없음)
- `profiles.role` = `user` | `admin`. **첫 번째 가입자가 자동 admin**, 이후 가입자는 user
- 조회는 누구나, **작성·수정·삭제는 admin 만** — DB 의 RLS 정책이 강제하므로 프론트 코드를 고쳐도 우회 불가
- 로그인 아이디는 내부적으로 `아이디@users.krwater.co.kr` 이메일로 변환 (실제 메일 없음 → Auth 의 Confirm email OFF 필수)

### 설정 순서 (최초 1회)
1. Supabase 프로젝트 (Region: Northeast Asia/Seoul) → SQL Editor 에서 `supabase/schema.sql` 실행 → `supabase/seed.sql` 실행
2. Authentication → Sign In / Providers → Email: Enable ON, **Confirm email OFF**
3. Settings → API Keys → Project URL, Publishable key → `app/config.js`
4. 사이트 헤더 "로그인" → 회원가입에서 **가장 먼저 가입** → 자동 관리자. 이후 Authentication → "Allow new users to sign up" OFF
5. 추가 관리자: `update public.profiles set role = 'admin' where username = '아이디';`

### 로컬 테스트
```bash
python3 -m http.server 8090 --directory /Users/ilo/dev/krwater
```
(`file://` 로 열면 ES 모듈이 막혀서 안 됨)

### 운영 메모
- Supabase 무료 플랜은 7일간 DB 요청이 없으면 일시정지 → 대시보드에서 Resume
- 갤러리 사진은 업로드 전 브라우저에서 긴 변 1600px 로 축소. 동영상은 파일당 50MB, 큰 영상은 유튜브 링크

### JS/CSS 수정 후
GitHub Pages 는 10분 캐시(`max-age=600`)라 수정 직후 브라우저에 옛 파일이 남을 수 있음. JS/CSS 를 고쳤으면 커밋 전에
```bash
python3 tools/bump_assets.py
```
를 실행해 `?v=` 버전을 올리면 모든 방문자가 즉시 새 파일을 받는다.
