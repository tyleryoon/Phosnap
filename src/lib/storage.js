// ─── Supabase Storage 이미지 업로드 유틸 ────────────────────────────────
// 버킷: avatars(프로필), portfolios(포트폴리오), dresses(의상)
//
// 파일 경로 규칙: {bucket}/{userId}/{filename}
// → RLS로 본인 폴더만 쓰기/삭제 허용
//
// 사전 설정 필요:
//   1. Supabase Dashboard → Storage → New Bucket (public)
//   2. migration_rls_hardening_v1.sql 하단의 Storage RLS 실행
// ────────────────────────────────────────────────────────────────────────

import { getSupabase } from './supabase';

// ── 상수 ──────────────────────────────────────────────────────────────
const BUCKETS = {
  AVATAR:     'avatars',
  PORTFOLIO:  'portfolios',
  DRESS:      'dresses',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;  // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

// ── 유틸 ──────────────────────────────────────────────────────────────

/** 파일 확장자 추출 */
const getExt = (file) => {
  const name = file.name || '';
  const ext = name.split('.').pop()?.toLowerCase();
  return ext || 'jpg';
};

/** 고유 파일명 생성 */
const uniqueName = (file, prefix = '') => {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${prefix}${ts}_${rand}.${getExt(file)}`;
};

/** 파일 유효성 검증 */
const validateFile = (file) => {
  if (!file) return '파일이 없습니다';
  if (file.size > MAX_FILE_SIZE) return `파일 크기가 ${MAX_FILE_SIZE / 1024 / 1024}MB를 초과합니다`;
  if (!ALLOWED_TYPES.includes(file.type)) return `허용되지 않는 파일 형식입니다 (${ALLOWED_TYPES.join(', ')})`;
  return null;
};

// ── 업로드 함수 ─────────────────────────────────────────────────────

/**
 * 이미지를 Supabase Storage에 업로드하고 public URL을 반환합니다.
 *
 * @param {File}   file     — 업로드할 파일
 * @param {string} bucket   — 버킷명 ('avatars' | 'portfolios' | 'dresses')
 * @param {string} userId   — 유저 ID (폴더 경로)
 * @param {Object} [options]
 * @param {string} [options.prefix]  — 파일명 접두사 (예: 'thumb_')
 * @param {boolean}[options.upsert]  — 기존 파일 덮어쓰기 (기본: false)
 * @returns {{ url: string, path: string, error: string|null }}
 */
export const uploadImage = async (file, bucket, userId, options = {}) => {
  // 유효성 검증
  const validError = validateFile(file);
  if (validError) return { url: null, path: null, error: validError };

  const sb = await getSupabase();
  if (!sb) return { url: null, path: null, error: 'Supabase 연결 실패' };

  // Storage RLS 는 첫 폴더명이 auth.uid() 와 일치할 때만 쓰기를 허용한다.
  // 호출부가 photographerId 를 넘기거나 아예 넘기지 않는 경우가 있어
  // 여기서 항상 로그인 사용자 id 로 교정한다.
  let ownerId = userId;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user?.id) {
      return { url: null, path: null, error: '로그인 후 업로드할 수 있습니다.' };
    }
    ownerId = user.id;
  } catch (e) {
    return { url: null, path: null, error: '인증 확인 실패' };
  }

  const fileName = uniqueName(file, options.prefix || '');
  const filePath = `${ownerId}/${fileName}`;

  const { data, error } = await sb.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: options.upsert || false,
      contentType: file.type,
    });

  if (error) {
    return { url: null, path: null, error: error.message };
  }

  // Public URL 생성
  const { data: urlData } = sb.storage.from(bucket).getPublicUrl(data.path);

  return {
    url: urlData?.publicUrl || null,
    path: data.path,
    error: null,
  };
};

/**
 * Storage에서 파일 삭제
 * @param {string} bucket   — 버킷명
 * @param {string} filePath — 전체 파일 경로 (예: 'userId/abc123.jpg')
 */
export const deleteImage = async (bucket, filePath) => {
  const sb = await getSupabase();
  if (!sb) return { error: 'Supabase 연결 실패' };

  const { error } = await sb.storage.from(bucket).remove([filePath]);
  return { error: error?.message || null };
};

/**
 * 여러 이미지 일괄 업로드 (포트폴리오용)
 * @param {File[]}  files    — 파일 배열
 * @param {string}  bucket   — 버킷명
 * @param {string}  userId   — 유저 ID
 * @returns {{ results: Array<{url, path, error}>, successCount: number, errorCount: number }}
 */
export const uploadMultipleImages = async (files, bucket, userId) => {
  const results = await Promise.all(
    files.map(file => uploadImage(file, bucket, userId))
  );
  const successCount = results.filter(r => !r.error).length;
  const errorCount = results.filter(r => r.error).length;
  return { results, successCount, errorCount };
};

// ── 편의 함수 (버킷별) ──────────────────────────────────────────────

/** 프로필 아바타 업로드 (기존 파일 덮어쓰기) */
export const uploadAvatar = (file, userId) =>
  uploadImage(file, BUCKETS.AVATAR, userId, { prefix: 'avatar_', upsert: true });

/** 포트폴리오 이미지 업로드 */
export const uploadPortfolioImage = (file, userId) =>
  uploadImage(file, BUCKETS.PORTFOLIO, userId, { prefix: 'port_' });

/** 의상 이미지 업로드 */
export const uploadDressImage = (file, userId) =>
  uploadImage(file, BUCKETS.DRESS, userId, { prefix: 'dress_' });

/** 포트폴리오 이미지 일괄 업로드 */
export const uploadPortfolioImages = (files, userId) =>
  uploadMultipleImages(files, BUCKETS.PORTFOLIO, userId);

// ── Storage 마이그레이션 SQL (참조용) ───────────────────────────────
// Supabase SQL Editor에서 실행:
//
// INSERT INTO storage.buckets (id, name, public, file_size_limit)
// VALUES
//   ('avatars',    'avatars',    true, 5242880),
//   ('portfolios', 'portfolios', true, 5242880),
//   ('dresses',    'dresses',    true, 5242880);
//
// -- RLS는 migration_rls_hardening_v1.sql 참조

export { BUCKETS, MAX_FILE_SIZE, ALLOWED_TYPES };
