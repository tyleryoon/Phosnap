-- ============================================================
-- FIX 3: profiles 테이블 누락 컬럼 보강
-- 원인: 회원가입에서 수집하는 값들이 저장될 컬럼이 없어
--       upsertProfile이 조용히 실패 → 실명/전화/주소 등 유실
-- ============================================================

alter table public.profiles add column if not exists real_name      text;
alter table public.profiles add column if not exists phone          text;
alter table public.profiles add column if not exists birthdate      date;
alter table public.profiles add column if not exists address        text;
alter table public.profiles add column if not exists portfolio_urls jsonb  default '[]';
alter table public.profiles add column if not exists instagram      text;
alter table public.profiles add column if not exists website        text;

-- 작가 유형 관련 (photographers 에만 있고 profiles 엔 없던 것들)
alter table public.profiles add column if not exists hmk_self             boolean default false;
alter table public.profiles add column if not exists hmk_external_connect boolean default false;
alter table public.profiles add column if not exists hmk_options          jsonb   default '[]';
alter table public.profiles add column if not exists dress_self           boolean default false;

-- 관리자 승인 워크플로 (요청사항 3번 기반)
alter table public.profiles add column if not exists approval_status text default 'pending'
  check (approval_status in ('pending','approved','rejected'));
alter table public.profiles add column if not exists approval_note   text;
alter table public.profiles add column if not exists approved_at     timestamptz;

-- 휴대폰/이메일 인증 상태 (요청사항 1·2번 기반)
alter table public.profiles add column if not exists phone_verified boolean default false;
alter table public.profiles add column if not exists email_verified boolean default false;

-- role 제약: 코드에서 쓰는 모든 역할 허용
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('customer','artist','photographer','videographer',
                  'stylist','hmk','dress_vendor','venue_vendor','vendor','admin'));

-- 기존 계정은 승인된 것으로 처리(테스트 편의)
update public.profiles set approval_status = 'approved' where approval_status is null;

-- ============================================================
-- FIX 4: photographers / stylists 자기 레코드 조회용 인덱스
-- ============================================================
create index if not exists idx_photographers_user_id on public.photographers(user_id);
create index if not exists idx_stylists_user_id      on public.stylists(user_id);

-- ============================================================
-- 검증
-- ============================================================
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by ordinal_position;
