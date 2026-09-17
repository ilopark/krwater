-- 시공사진(갤러리) 전체 비우기: 게시물·첨부 연결·Storage 파일 모두 삭제 (되돌릴 수 없음)
delete from public.gallery_posts;                       -- gallery_media 는 cascade 로 함께 삭제
delete from storage.objects where bucket_id = 'gallery'; -- 업로드된 파일
select count(*) as remaining_posts from public.gallery_posts;
