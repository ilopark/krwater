-- 시공사진(갤러리) 게시물 전체 삭제 (되돌릴 수 없음). 첨부 연결(gallery_media)은 cascade 로 함께 삭제됨
delete from public.gallery_posts;
select count(*) as remaining_posts from public.gallery_posts;

-- ※ Storage 에 올라간 파일은 SQL 로 지울 수 없음 (Supabase 가 storage.objects 직접 삭제를 막음)
--    대시보드 → Storage → gallery 버킷 → 파일 선택 → Delete 로 지우거나,
--    사이트에서 게시물별 [삭제] 버튼을 쓰면 파일까지 같이 지워짐
