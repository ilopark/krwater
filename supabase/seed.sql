-- =====================================================================
--  초기 데이터 (1회 실행) — 인증서 1건만. 시공사진은 관리자 화면에서 직접 올림
--  - 인증서 1건 (theme/home/img/company/cert02.jpg)
--  실행: SQL Editor → 붙여넣기 → Run.  schema.sql 을 먼저 실행해야 함.
--  ※ 이미 같은 id 가 있으면 건너뜀 (재실행 안전)
-- =====================================================================
insert into public.certificates (title, description, file_type, storage_path, url, file_name, sort_order, author_name)
select '특허증', '', 'image', null, 'theme/home/img/company/cert02.jpg', 'cert02.jpg', 0, '대한수자원'
where not exists (select 1 from public.certificates where url = 'theme/home/img/company/cert02.jpg');
