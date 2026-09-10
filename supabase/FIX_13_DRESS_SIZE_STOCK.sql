-- ============================================================
-- FIX 16: dress_items.size_stock 컬럼 추가
--
-- 벤더 아이템 등록이 size_stock(사이즈별 재고)을 함께 저장하는데
-- 컬럼이 없어 insert 가 42703 으로 실패한다.
-- VendorDashboard 는 이 에러를 "silently handled" 로 무시하므로
-- 저장 버튼을 눌러도 아무 일도 일어나지 않는 것처럼 보인다.
-- ============================================================

alter table public.dress_items
  add column if not exists size_stock jsonb default '{}';

-- 테스트로 넣은 행 정리
delete from public.dress_items where name_ko = 'RLS 확인용';

-- ============================================================
-- 검증
-- ============================================================
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'dress_items'
order by ordinal_position;
