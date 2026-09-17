#!/usr/bin/env python3
"""app/*.js, app/board.css 참조에 ?v=<버전> 을 붙여 브라우저 캐시를 무효화한다.
JS/CSS 를 수정해 커밋할 때마다 실행:  python3 tools/bump_assets.py
"""
import re, glob, subprocess, datetime
ver = datetime.datetime.now().strftime('%Y%m%d%H%M')
n = 0
# 1) HTML 의 <script type="module" src="…app/x.js"> 와 <link href="…app/board.css">
for f in ['index.html'] + glob.glob('theme/home/sub/*.html') + glob.glob('bbs/*.html'):
    s = open(f, encoding='utf-8').read()
    s2 = re.sub(r'(app/[\w-]+\.(?:js|css))(?:\?v=[\w.]+)?"', rf'\1?v={ver}"', s)
    if s2 != s: open(f, 'w', encoding='utf-8').write(s2); n += 1
# 2) 모듈 내부 import './x.js'
for f in glob.glob('app/*.js'):
    s = open(f, encoding='utf-8').read()
    s2 = re.sub(r"(from\s+'\./[\w-]+\.js)(?:\?v=[\w.]+)?'", rf"\1?v={ver}'", s)
    if s2 != s: open(f, 'w', encoding='utf-8').write(s2); n += 1
print(f'v={ver}, {n}개 파일 갱신')
