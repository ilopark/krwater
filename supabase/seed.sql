-- =====================================================================
--  기존 사이트에 있던 게시물을 Supabase 로 옮기는 초기 데이터 (1회 실행)
--  - 시공사진 4건 (사진 파일은 사이트 안 data/editor/... 에 그대로 있음 → 사이트 상대경로로 참조)
--  - 인증서 1건 (theme/home/img/company/cert02.jpg)
--  실행: SQL Editor → 붙여넣기 → Run.  schema.sql 을 먼저 실행해야 함.
--  ※ 이미 같은 id 가 있으면 건너뜀 (재실행 안전)
-- =====================================================================
insert into public.gallery_posts (id, title, description, view_count, author_name, created_at, updated_at)
overriding system value
values
  (1, '01', '수맥탐사', 723, '대한수자원', '2021-10-28 12:19:00+09', '2021-10-28 12:19:00+09'),
  (2, '02', '',         0,   '대한수자원', '2021-10-28 12:20:00+09', '2021-10-28 12:20:00+09'),
  (3, '03', '',         0,   '대한수자원', '2021-10-28 12:21:00+09', '2021-10-28 12:21:00+09'),
  (4, '04', '',         971, '대한수자원', '2021-10-28 12:22:00+09', '2021-10-28 12:22:00+09')
on conflict (id) do nothing;

insert into public.gallery_media (post_id, media_type, storage_path, url, file_name, sort_order)
select v.post_id, 'image', null, v.url, v.file_name, 0
from (values
  (1, 'data/editor/2110/thumb-71832e6287ae02a73405f0b7ebdf72b9_1635487573_5769_835x626.jpg', '71832e6287ae02a73405f0b7ebdf72b9_1635487573_5769.jpg'),
  (2, 'data/editor/2110/thumb-71832e6287ae02a73405f0b7ebdf72b9_1635487622_1068_835x626.jpg', '71832e6287ae02a73405f0b7ebdf72b9_1635487622_1068.jpg'),
  (3, 'data/editor/2110/thumb-71832e6287ae02a73405f0b7ebdf72b9_1635487668_7686_835x626.jpg', '71832e6287ae02a73405f0b7ebdf72b9_1635487668_7686.jpg'),
  (4, 'data/editor/2110/thumb-71832e6287ae02a73405f0b7ebdf72b9_1635487651_5442_835x626.jpg', '71832e6287ae02a73405f0b7ebdf72b9_1635487651_5442.jpg')
) as v(post_id, url, file_name)
where not exists (select 1 from public.gallery_media m where m.post_id = v.post_id);

-- identity 시퀀스를 현재 최대 id 뒤로 맞춤 (다음 글쓰기가 id 5 부터)
select setval(pg_get_serial_sequence('public.gallery_posts', 'id'), greatest((select max(id) from public.gallery_posts), 1));

insert into public.certificates (title, description, file_type, storage_path, url, file_name, sort_order, author_name)
select '특허증', '', 'image', null, 'theme/home/img/company/cert02.jpg', 'cert02.jpg', 0, '대한수자원'
where not exists (select 1 from public.certificates where url = 'theme/home/img/company/cert02.jpg');
