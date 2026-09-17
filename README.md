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
