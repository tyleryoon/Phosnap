-- ============================================================
-- FIX 14: 벤더 프로필 저장에 필요한 컬럼 추가
--
-- VendorDashboard 의 프로필 저장 payload 가 참조하는 컬럼이 없어
-- update 가 42703 으로 실패한다. 화면에는 로컬 state 로 반영되므로
-- 저장된 것처럼 보이지만 DB 는 그대로다 (새로고침하면 되돌아간다).
--
-- 의상 대시보드:  website, intro, directions, tags
-- 장소 대시보드:  venue_* 전 필드 (한 레코드에서 두 대시보드를 관리)
-- ============================================================

alter table public.dress_vendors add column if not exists website     text;
alter table public.dress_vendors add column if not exists intro       text;
alter table public.dress_vendors add column if not exists directions  text;
alter table public.dress_vendors add column if not exists tags        text[] default '{}';
alter table public.dress_vendors add column if not exists custom_tags text[] default '{}';

-- 장소 대여 대시보드용 (같은 벤더가 의상/장소를 함께 운영)
alter table public.dress_vendors add column if not exists venue_name_ko    text;
alter table public.dress_vendors add column if not exists venue_name_en    text;
alter table public.dress_vendors add column if not exists venue_location   text;
alter table public.dress_vendors add column if not exists venue_phone      text;
alter table public.dress_vendors add column if not exists venue_email      text;
alter table public.dress_vendors add column if not exists venue_website    text;
alter table public.dress_vendors add column if not exists venue_intro      text;
alter table public.dress_vendors add column if not exists venue_directions text;
alter table public.dress_vendors add column if not exists venue_tags       text[] default '{}';

-- ============================================================
-- 검증
-- ============================================================
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'dress_vendors'
order by ordinal_position;
