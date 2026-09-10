-- ============================================================
-- FIX 8: Storage 버킷 생성
--
-- 스키마 리셋 이후 storage.buckets 가 비어 있어 사진 업로드가
-- 전부 실패하고 있었다 (포트폴리오 · 상품 사진 · 아바타 · 의상).
-- storage.objects 의 정책만 남아 있었고 버킷 자체가 없었다.
--
-- 코드가 실제로 사용하는 버킷:
--   avatars       : 프로필 이미지            (ProfileAvatar)
--   portfolios    : 작가 포트폴리오          (uploadImage(...,'portfolios'))
--   photographers : 작가 대표/기타 이미지    (uploadImage(...,'photographers'))
--   snap-products : 스냅 상품 사진           (uploadImage(...,'snap-products'))
--   dresses       : 의상/장소 벤더 이미지    (BUCKETS.DRESS)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',       'avatars',       true, 5242880, array['image/jpeg','image/png','image/webp','image/heic']),
  ('portfolios',    'portfolios',    true, 5242880, array['image/jpeg','image/png','image/webp','image/heic']),
  ('photographers', 'photographers', true, 5242880, array['image/jpeg','image/png','image/webp','image/heic']),
  ('snap-products', 'snap-products', true, 5242880, array['image/jpeg','image/png','image/webp','image/heic']),
  ('dresses',       'dresses',       true, 5242880, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── 정책 재정비 ────────────────────────────────────────────────
-- 기존 커스텀 정책을 모두 제거한 뒤 5개 버킷에 대해 일괄 생성한다.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname not like 'Give %'          -- Supabase 기본 정책 보존
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;
end $$;

-- 공개 읽기: 5개 버킷 전부
create policy "phosnap_public_read"
  on storage.objects for select
  using (bucket_id in ('avatars','portfolios','photographers','snap-products','dresses'));

-- 업로드: 로그인 사용자만, 본인 userId 폴더 안에만
create policy "phosnap_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars','portfolios','photographers','snap-products','dresses')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "phosnap_owner_update"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars','portfolios','photographers','snap-products','dresses')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "phosnap_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars','portfolios','photographers','snap-products','dresses')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 검증
-- ============================================================
select id, public, file_size_limit from storage.buckets order by id;
