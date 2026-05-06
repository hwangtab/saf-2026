-- 작가 페이지 + 작품 상세 페이지 공지 시스템
-- 단일 공지 모델: artists 테이블에 notice 관련 컬럼 추가
-- enabled 플래그로 메시지 보존하면서 끄기 가능 (재사용 용이)

ALTER TABLE artists
  ADD COLUMN notice_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN notice_type text CHECK (notice_type IN ('info', 'warning', 'urgent')),
  ADD COLUMN notice_message text,
  ADD COLUMN notice_message_en text,
  ADD COLUMN notice_active_until timestamptz,
  ADD COLUMN notice_updated_at timestamptz,
  ADD COLUMN notice_updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN artists.notice_enabled IS '공지 노출 토글 — false로 두면 메시지 보존하면서 미노출';
COMMENT ON COLUMN artists.notice_type IS 'info(안내) / warning(주의) / urgent(중요)';
COMMENT ON COLUMN artists.notice_message IS '한국어 공지 메시지 (필수)';
COMMENT ON COLUMN artists.notice_message_en IS '영문 공지 메시지 (선택, 비우면 영어 페이지에 미노출)';
COMMENT ON COLUMN artists.notice_active_until IS 'NULL이면 무기한, 값 있으면 그 시각 이후 자동 미노출';
COMMENT ON COLUMN artists.notice_updated_at IS '공지 마지막 수정 시각';
COMMENT ON COLUMN artists.notice_updated_by IS '공지 마지막 수정한 관리자 profile id';

-- 활성 공지 빠른 조회용 부분 인덱스 (admin/artists 목록 필터, /admin 대시보드 등)
CREATE INDEX idx_artists_notice_enabled ON artists(notice_enabled) WHERE notice_enabled = true;
