-- ============================================================
--  Phosnap · Storage 버킷 생성 + RLS
--  Supabase SQL Editor에서 실행
--
--  버킷:
--   - avatars:    프로필 이미지 (1인 1개, upsert)
--   - portfolios: 포트폴리오 (작가당 여러 장)
--   - dresses:    의상 이미지 (업체당 여러 장)
--
--  경로 규칙: {bucket}/{userId}/{filename}
--  → RLS로 본인 userId 폴더만 쓰기/삭제 허용
-- ============================================================

-- ── 1. 버킷 생성 (public: CDN 공개 읽기) ─────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',    'avatars',    true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('portfolios', 'portfolios', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('dresses',    'dresses',    true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/heic'])
ON CONFLICT (id) DO NOTHING;

-- ── 2. avatars RLS ────────────────────────────────────────────
-- 누구나 읽기 (public bucket)
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 본인 폴더만 업로드
CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 본인 폴더만 수정 (upsert)
CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 본인 폴더만 삭제
CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 3. portfolios RLS ────────────────────────────────────────
CREATE POLICY "portfolios_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolios');

CREATE POLICY "portfolios_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'portfolios'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "portfolios_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'portfolios'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "portfolios_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'portfolios'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── 4. dresses RLS ───────────────────────────────────────────
CREATE POLICY "dresses_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dresses');

CREATE POLICY "dresses_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dresses'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "dresses_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'dresses'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "dresses_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'dresses'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 완료! 3개 버킷 + 12개 Storage RLS 정책
-- ============================================================
