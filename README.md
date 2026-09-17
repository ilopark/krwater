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
| `/theme/home/sub/certificate.php` (인증서) | `theme/home/sub/certificate.php.html` |
| `/theme/home/sub/organization.php` (조직도) | `theme/home/sub/organization.php.html` |
| `/theme/home/sub/map.php` (오시는길) | `theme/home/sub/map.php.html` |
| `/theme/home/sub/pro07.php` (심층지하수 개발) | `theme/home/sub/pro07.php.html` |
| `/bbs/board.php?bo_table=gallery` (시공사진) | `bbs/board.php@bo_table=gallery.html` (+ wr_id=1~4 상세) |
| `/bbs/board.php?bo_table=notice` (공지사항) | `bbs/board.php@bo_table=notice.html` |
| `/bbs/board.php?bo_table=news01` (뉴스) | `bbs/board.php@bo_table=news01.html` |
| `/bbs/login.php`, `register.php`, `password_lost.php` | `bbs/*.php.html` (화면만, 동작 안 함) |

- CSS/JS/이미지/폰트: `theme/home/`, `js/`, `img/`, `data/editor/` 아래에 원본 경로 그대로
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

## 게시판 앱 (`app/`) — Supabase 연동 (공지사항 · 뉴스 · 갤러리 · 관리자 로그인)

정적 사이트(GitHub Pages / Cloudflare Pages)에서 그대로 동작하는 순수 HTML/JS 앱. 빌드 없음.

| 파일 | 역할 |
|---|---|
| `supabase/schema.sql` | 테이블·RLS 정책·트리거·Storage 버킷 (SQL Editor 에서 1회 실행) |
| `app/config.js` | Supabase URL / anon key 등 설정 (**여기만 채우면 됨**) |
| `app/supabase.js` | 클라이언트, 로그인/가입/프로필 헬퍼 |
| `app/ui.js`, `app/style.css` | 공통 헤더·유틸·스타일 |
| `app/login.html`, `app/signup.html` | 로그인(아이디+비밀번호), 회원가입(사용자명·아이디·비밀번호) |
| `app/notices.html` | 공지사항/뉴스 목록·상세, 관리자 작성·수정·삭제·상단고정 |
| `app/gallery.html` | 갤러리 목록·상세, 관리자 사진/동영상 업로드·유튜브 링크·삭제 |
| `app/index.html` | 게시판 진입 페이지 |

### 권한 구조
- 비밀번호는 Supabase Auth 가 **bcrypt** 로 저장 (앱 코드·DB 테이블에 비밀번호 없음)
- `profiles.role` = `user` | `admin`. **첫 번째 가입자가 자동 admin**, 이후 가입자는 user
- 공지/갤러리 **조회는 누구나**, **작성·수정·삭제는 admin 만** — DB 의 RLS 정책이 강제하므로 프론트 코드를 고쳐도 우회 불가
- 로그인 아이디는 내부적으로 `아이디@users.krwater.co.kr` 이메일로 변환해 Supabase Auth 에 저장 (실제 메일 수신 없음)

### 설정 순서 (최초 1회)
1. **프로젝트 생성**: supabase.com → New project → 이름 `krwater`, DB 비밀번호(보관), Region **Northeast Asia (Seoul)** → Create
2. **스키마 실행**: 왼쪽 메뉴 SQL Editor → New query → `supabase/schema.sql` 전체 붙여넣기 → Run (초록색 Success 확인)
3. **Auth 설정**: Authentication → Sign In / Providers → Email
   - **Confirm email → OFF** (필수. 켜져 있으면 가입해도 로그인 불가)
   - Allow new users to sign up → 일단 ON (관리자 가입 끝나면 OFF 권장 → 외부인 가입 차단)
4. **키 복사**: Project Settings → API (또는 API Keys) → `Project URL` 과 `anon public` 키(새 대시보드면 `sb_publishable_…` 키도 가능) → `app/config.js` 의 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 에 입력
   - `service_role` / `sb_secret_…` 키는 **절대 저장소에 넣지 말 것**
5. **커밋·푸시** → GitHub Pages 반영 후 `https://ilopark.github.io/krwater/app/signup.html` 에서 **가장 먼저 가입** → 자동 관리자
6. 추가 관리자: SQL Editor 에서 `update public.profiles set role = 'admin' where username = '아이디';`

### 로컬 테스트
```bash
python3 -m http.server 8090 --directory /Users/ilo/dev/krwater
# → http://localhost:8090/app/
```
(`file://` 로 열면 ES 모듈이 막혀서 안 됨. 반드시 http 서버로)

### 운영 메모
- Supabase 무료 플랜은 **7일간 DB 요청이 없으면 일시정지** → 대시보드에서 Resume. 방문자가 조금이라도 있으면 안 걸림. 확실히 막으려면 GitHub Actions/Cloudflare Cron 으로 3일마다 `select 1` 호출
- 갤러리 사진은 업로드 전 브라우저에서 긴 변 1600px 로 축소(JPEG 85%) → 무료 Storage 1GB / 트래픽 5GB 절약
- 동영상은 파일당 50MB(무료 플랜 한도). 큰 영상은 유튜브에 올리고 링크로 첨부
