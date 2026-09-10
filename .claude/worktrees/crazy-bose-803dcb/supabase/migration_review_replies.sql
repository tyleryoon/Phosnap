-- ═══ Review Replies (작가 답글) ═══
-- 작가가 고객 리뷰에 답글을 남길 수 있는 테이블
-- package_reviews, photographer_reviews 모두 지원

CREATE TABLE IF NOT EXISTS review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('package', 'photographer')),
  photographer_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (review_id, review_type)  -- 리뷰당 답글 1개
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_review_replies_review ON review_replies(review_id, review_type);
CREATE INDEX IF NOT EXISTS idx_review_replies_photographer ON review_replies(photographer_id);

-- RLS
ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read review replies"
  ON review_replies FOR SELECT USING (true);

CREATE POLICY "Photographer can insert own replies"
  ON review_replies FOR INSERT
  WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographer can update own replies"
  ON review_replies FOR UPDATE
  USING (auth.uid() = photographer_id);
