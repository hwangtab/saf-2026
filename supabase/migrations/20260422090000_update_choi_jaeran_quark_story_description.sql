-- 매거진 'art-for-business-openings-by-industry' 본문에서 최재란 〈쿼크의 시간#113〉
-- 작품 설명을 작가 노트(쿼크 = 보이지 않는 시간 은유, 검은 배경 위 정물 + 별자리·칠보무늬
-- 드로잉)에 맞게 갱신한다. KO/EN 본문 동시 적용.

update public.stories
set
  body = replace(
    body,
    '[최재란의 〈쿼크의 시간#113〉](/artworks/901c56cd-cbae-4b3a-9302-afa2169879f2) — 100×100cm의 정방형 아카이벌 피그먼트 프린트. 입자와 빛의 궤적이 사유하는 공간과 맞는다.',
    '[최재란의 〈쿼크의 시간#113〉](/artworks/901c56cd-cbae-4b3a-9302-afa2169879f2) — 100×100cm 정방형 아카이벌 피그먼트 프린트. 산책에서 모은 시든 꽃잎·씨앗·열매를 검은 배경 위에 정물로 매달고, 그 위에 별자리와 전통 칠보무늬를 드로잉했다. 물리학의 기본입자 ''쿼크''를 빌려 보이지 않는 시간을 가장 사소한 사물에서 응시하는 작업이라, 개념 위에서 일하는 공간과 맞는다.'
  ),
  body_en = replace(
    body_en,
    '[Choe Jaeran''s *The Time of Quarks #113*](/en/artworks/901c56cd-cbae-4b3a-9302-afa2169879f2) — 100×100 cm archival pigment print. Particles and light trajectories for a thinking space.',
    '[Choe Jaeran''s *The Time of Quarks #113*](/en/artworks/901c56cd-cbae-4b3a-9302-afa2169879f2) — 100×100 cm archival pigment print. The artist suspends withered petals, seeds, and dried fruits gathered on daily walks against a black ground, then draws constellations and the traditional Korean *chilbo* motif over the still life. Borrowing "quark" from physics as a metaphor for the invisible time that pervades the smallest things — a match for spaces built on ideas.'
  ),
  updated_at = now()
where slug = 'art-for-business-openings-by-industry';
