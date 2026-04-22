-- 후속: 20260422090000 마이그레이션의 EN REPLACE가 매칭에 실패했다.
-- 원인: 기존 stories.body_en에 SQL 이스케이프(''=두 개의 작은따옴표)가 데이터로 저장돼
-- 있어 'Choe Jaeran's'가 실제로는 'Choe Jaeran''s'로 들어 있다. 단일 따옴표 패턴이
-- 매칭되지 않아 EN 본문이 갱신되지 않았다.
--
-- 이 마이그레이션은 (1) 매칭 패턴을 실제 저장 형태(이중 따옴표)에 맞추고
-- (2) 새 본문은 일반 따옴표로 정리해 시각적으로 보이는 ''아티팩트도 함께 제거한다.
-- 이 단락 외의 동일 아티팩트(약 12건 추정)는 이번 변경 범위 밖.

update public.stories
set
  body_en = replace(
    body_en,
    '[Choe Jaeran''''s *The Time of Quarks #113*](/en/artworks/901c56cd-cbae-4b3a-9302-afa2169879f2) — 100×100 cm archival pigment print. Particles and light trajectories for a thinking space.',
    '[Choe Jaeran''s *The Time of Quarks #113*](/en/artworks/901c56cd-cbae-4b3a-9302-afa2169879f2) — 100×100 cm archival pigment print. The artist suspends withered petals, seeds, and dried fruits gathered on daily walks against a black ground, then draws constellations and the traditional Korean *chilbo* motif over the still life. Borrowing "quark" from physics as a metaphor for the invisible time that pervades the smallest things — a match for spaces built on ideas.'
  ),
  updated_at = now()
where slug = 'art-for-business-openings-by-industry';
