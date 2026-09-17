-- =====================================================================
--  krwater — Supabase 스키마 (공지사항 / 갤러리(사진·동영상) / 사용자·관리자 권한)
--  실행 방법: Supabase 대시보드 → SQL Editor → New query → 전체 붙여넣기 → Run
--  여러 번 실행해도 안전하도록(idempotent) 작성됨
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. 공통 함수: updated_at 자동 갱신
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. 사용자 프로필 (auth.users 1:1)
--    - 비밀번호는 여기에 저장하지 않음. Supabase Auth가 bcrypt 로 auth.users 에 보관
--    - role: 'user' | 'admin'  (admin 만 공지/갤러리 작성·수정·삭제 가능)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text not null,                    -- 로그인 아이디
  display_name  text not null,                    -- 사용자명(표시 이름)
  role          text not null default 'user' check (role in ('user', 'admin')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 관리자 여부 (RLS 정책에서 사용). security definer 라 profiles RLS 재귀를 피함
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- 회원가입 시 프로필 자동 생성 (signUp 의 options.data 에서 username / display_name 을 받음)
-- ★ 첫 번째 가입자는 자동으로 admin (프로젝트 만든 본인이 가장 먼저 가입할 것)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username     text;
  v_display_name text;
  v_role         text;
begin
  v_username     := coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1));
  v_display_name := coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), v_username);
  select case when count(*) = 0 then 'admin' else 'user' end into v_role from public.profiles;

  insert into public.profiles (id, username, display_name, role)
  values (new.id, v_username, v_display_name, v_role);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 일반 사용자가 자기 role 을 admin 으로 바꾸는 것을 차단
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'role 은 관리자만 변경할 수 있습니다';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

alter table public.profiles enable row level security;

drop policy if exists "profiles: 본인 또는 관리자 조회" on public.profiles;
create policy "profiles: 본인 또는 관리자 조회"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: 본인 수정" on public.profiles;
create policy "profiles: 본인 수정"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- 2. 공지사항 / 뉴스  (category 로 구분)
-- ---------------------------------------------------------------------
create table if not exists public.notices (
  id           bigint generated always as identity primary key,
  category     text not null default 'notice' check (category in ('notice', 'news')),
  title        text not null check (char_length(title) between 1 and 200),
  content      text not null default '',
  is_pinned    boolean not null default false,
  view_count   integer not null default 0,
  author_id    uuid references public.profiles (id) on delete set null,
  author_name  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists notices_list_idx on public.notices (category, is_pinned desc, created_at desc);

drop trigger if exists notices_set_updated_at on public.notices;
create trigger notices_set_updated_at
  before update on public.notices
  for each row execute function public.set_updated_at();

alter table public.notices enable row level security;

drop policy if exists "notices: 누구나 조회" on public.notices;
create policy "notices: 누구나 조회"
  on public.notices for select
  to anon, authenticated
  using (true);

drop policy if exists "notices: 관리자 작성" on public.notices;
create policy "notices: 관리자 작성"
  on public.notices for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "notices: 관리자 수정" on public.notices;
create policy "notices: 관리자 수정"
  on public.notices for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "notices: 관리자 삭제" on public.notices;
create policy "notices: 관리자 삭제"
  on public.notices for delete
  to authenticated
  using (public.is_admin());

-- 조회수 증가 (비로그인 방문자도 호출 가능, 이 컬럼만 갱신)
create or replace function public.increment_notice_view(p_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notices set view_count = view_count + 1 where id = p_id;
$$;
grant execute on function public.increment_notice_view(bigint) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. 갤러리: 게시물(gallery_posts) 1 : N 미디어(gallery_media)
--    - media_type: image | video | embed(유튜브 등 외부 URL)
--    - storage_path: Storage 버킷 'gallery' 안의 경로 (업로드한 파일일 때)
--    - url: 공개 URL (업로드 파일의 public URL 또는 외부 링크)
-- ---------------------------------------------------------------------
create table if not exists public.gallery_posts (
  id           bigint generated always as identity primary key,
  title        text not null check (char_length(title) between 1 and 200),
  description  text not null default '',
  author_id    uuid references public.profiles (id) on delete set null,
  author_name  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists gallery_posts_created_idx on public.gallery_posts (created_at desc);

drop trigger if exists gallery_posts_set_updated_at on public.gallery_posts;
create trigger gallery_posts_set_updated_at
  before update on public.gallery_posts
  for each row execute function public.set_updated_at();

create table if not exists public.gallery_media (
  id            bigint generated always as identity primary key,
  post_id       bigint not null references public.gallery_posts (id) on delete cascade,
  media_type    text not null check (media_type in ('image', 'video', 'embed')),
  storage_path  text,
  url           text not null,
  file_name     text,
  file_size     bigint,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists gallery_media_post_idx on public.gallery_media (post_id, sort_order);

alter table public.gallery_posts enable row level security;
alter table public.gallery_media enable row level security;

drop policy if exists "gallery_posts: 누구나 조회" on public.gallery_posts;
create policy "gallery_posts: 누구나 조회"
  on public.gallery_posts for select to anon, authenticated using (true);
drop policy if exists "gallery_posts: 관리자 작성" on public.gallery_posts;
create policy "gallery_posts: 관리자 작성"
  on public.gallery_posts for insert to authenticated with check (public.is_admin());
drop policy if exists "gallery_posts: 관리자 수정" on public.gallery_posts;
create policy "gallery_posts: 관리자 수정"
  on public.gallery_posts for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "gallery_posts: 관리자 삭제" on public.gallery_posts;
create policy "gallery_posts: 관리자 삭제"
  on public.gallery_posts for delete to authenticated using (public.is_admin());

drop policy if exists "gallery_media: 누구나 조회" on public.gallery_media;
create policy "gallery_media: 누구나 조회"
  on public.gallery_media for select to anon, authenticated using (true);
drop policy if exists "gallery_media: 관리자 작성" on public.gallery_media;
create policy "gallery_media: 관리자 작성"
  on public.gallery_media for insert to authenticated with check (public.is_admin());
drop policy if exists "gallery_media: 관리자 수정" on public.gallery_media;
create policy "gallery_media: 관리자 수정"
  on public.gallery_media for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "gallery_media: 관리자 삭제" on public.gallery_media;
create policy "gallery_media: 관리자 삭제"
  on public.gallery_media for delete to authenticated using (public.is_admin());

-- 갤러리 조회수 (원본 화면의 "Hit" 표시용)
alter table public.gallery_posts add column if not exists view_count integer not null default 0;
create or replace function public.increment_gallery_view(p_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.gallery_posts set view_count = view_count + 1 where id = p_id;
$$;
grant execute on function public.increment_gallery_view(bigint) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Storage 버킷 'gallery' (공개 읽기, 관리자만 업로드/삭제)
--    - 파일당 50MB 제한 (무료 플랜 한도와 동일), 이미지·동영상만 허용
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 52428800, array['image/*', 'video/*'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "gallery bucket: 누구나 읽기" on storage.objects;
create policy "gallery bucket: 누구나 읽기"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'gallery');

drop policy if exists "gallery bucket: 관리자 업로드" on storage.objects;
create policy "gallery bucket: 관리자 업로드"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gallery' and public.is_admin());

drop policy if exists "gallery bucket: 관리자 수정" on storage.objects;
create policy "gallery bucket: 관리자 수정"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'gallery' and public.is_admin())
  with check (bucket_id = 'gallery' and public.is_admin());

drop policy if exists "gallery bucket: 관리자 삭제" on storage.objects;
create policy "gallery bucket: 관리자 삭제"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gallery' and public.is_admin());

-- ---------------------------------------------------------------------
-- 5. 인증서 (PDF 또는 이미지 1개 + 제목/설명). 관리자만 CRUD, 조회는 누구나
-- ---------------------------------------------------------------------
create table if not exists public.certificates (
  id            bigint generated always as identity primary key,
  title         text not null check (char_length(title) between 1 and 200),
  description   text not null default '',
  file_type     text not null check (file_type in ('pdf', 'image')),
  storage_path  text,                   -- Storage 버킷 'certificates' 안의 경로 (사이트 내 정적 파일이면 NULL)
  url           text not null,          -- 공개 URL
  file_name     text,
  file_size     bigint,
  author_id     uuid references public.profiles (id) on delete set null,
  author_name   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- 정렬은 업로드 순(최신이 앞, 오래된 것이 뒤). 예전 sort_order 컬럼은 제거
drop index if exists certificates_order_idx;
alter table public.certificates drop column if exists sort_order;
create index if not exists certificates_created_idx on public.certificates (created_at desc);
alter table public.certificates alter column storage_path drop not null;

drop trigger if exists certificates_set_updated_at on public.certificates;
create trigger certificates_set_updated_at
  before update on public.certificates
  for each row execute function public.set_updated_at();

alter table public.certificates enable row level security;

drop policy if exists "certificates: 누구나 조회" on public.certificates;
create policy "certificates: 누구나 조회"
  on public.certificates for select to anon, authenticated using (true);
drop policy if exists "certificates: 관리자 작성" on public.certificates;
create policy "certificates: 관리자 작성"
  on public.certificates for insert to authenticated with check (public.is_admin());
drop policy if exists "certificates: 관리자 수정" on public.certificates;
create policy "certificates: 관리자 수정"
  on public.certificates for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "certificates: 관리자 삭제" on public.certificates;
create policy "certificates: 관리자 삭제"
  on public.certificates for delete to authenticated using (public.is_admin());

-- Storage 버킷 'certificates' (공개 읽기, 관리자만 업로드/삭제, PDF·이미지만, 파일당 20MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificates', 'certificates', true, 20971520, array['application/pdf', 'image/*'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "certificates bucket: 누구나 읽기" on storage.objects;
create policy "certificates bucket: 누구나 읽기"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'certificates');
drop policy if exists "certificates bucket: 관리자 업로드" on storage.objects;
create policy "certificates bucket: 관리자 업로드"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'certificates' and public.is_admin());
drop policy if exists "certificates bucket: 관리자 수정" on storage.objects;
create policy "certificates bucket: 관리자 수정"
  on storage.objects for update to authenticated
  using (bucket_id = 'certificates' and public.is_admin())
  with check (bucket_id = 'certificates' and public.is_admin());
drop policy if exists "certificates bucket: 관리자 삭제" on storage.objects;
create policy "certificates bucket: 관리자 삭제"
  on storage.objects for delete to authenticated
  using (bucket_id = 'certificates' and public.is_admin());

-- ---------------------------------------------------------------------
-- 6. 관리자 추가 (첫 가입자 이후에 관리자를 더 두고 싶을 때 수동 실행)
-- ---------------------------------------------------------------------
-- update public.profiles set role = 'admin' where username = '아이디';
-- select id, username, display_name, role, created_at from public.profiles order by created_at;
