-- reward_tiers 미디어 컬럼 + 오윤 프로젝트/리워드 시드.
ALTER TABLE public.reward_tiers ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.reward_tiers ADD COLUMN IF NOT EXISTS reward_kind text NOT NULL DEFAULT 'goods';

-- 오윤 프로젝트 (목표 1억, 마감 2026-07-31, active)
INSERT INTO public.funding_projects (slug, title, summary, story, goal_amount, status, start_at, end_at)
VALUES (
  'oh-yoon-terracotta',
  '오윤 구의동 테라코타 부조를 시민의 힘으로 옮깁니다',
  '1974년 오윤이 새긴 양면 테라코타 부조가 2026년 8월 철거 위기에 있습니다. 시민 모금으로 안전한 해체·이전 비용을 마련합니다.',
  '## 50년 된 벽이 사라지기 전에

1974년, 청년 오윤은 서울 구의동 상업은행 외벽에 양면 테라코타 부조를 새겼습니다. 건물 매매로 2026년 8월 철거가 예정되어 있습니다. 정책적 보존을 청원하는 한편, 시민이 직접 이전 비용을 모아 작품을 먼저 안전한 곳으로 옮기려 합니다.

후원해 주시면 오윤 엽서를, 더 큰 후원에는 사후판화를 답례로 보내드립니다. 모인 금액은 작품 해체·운송·보존 처리에 사용되며, 집행 내역을 공개합니다.',
  100000000,
  'active',
  now(),
  '2026-07-31T23:59:59+09:00'
)
ON CONFLICT (slug) DO NOTHING;

-- 엽서 7티어 (무제한, 배송, 엽서 답례)
INSERT INTO public.reward_tiers (project_id, title, description, amount, requires_shipping, reward_kind, sort_order)
SELECT p.id, t.title, t.description, t.amount, true, 'postcard', t.sort_order
FROM public.funding_projects p,
  (VALUES
    ('오윤 엽서 — 1만원 후원', '오윤 작품 엽서 세트를 보내드립니다.', 10000, 1),
    ('오윤 엽서 — 3만원 후원', '오윤 작품 엽서 세트를 보내드립니다.', 30000, 2),
    ('오윤 엽서 — 5만원 후원', '오윤 작품 엽서 세트를 보내드립니다.', 50000, 3),
    ('오윤 엽서 — 10만원 후원', '오윤 작품 엽서 세트를 보내드립니다.', 100000, 4),
    ('오윤 엽서 — 30만원 후원', '오윤 작품 엽서 세트와 감사장을 보내드립니다.', 300000, 5),
    ('오윤 엽서 — 50만원 후원', '오윤 작품 엽서 세트와 감사장을 보내드립니다.', 500000, 6),
    ('오윤 엽서 — 100만원 후원', '오윤 작품 엽서 세트와 감사장을 보내드립니다.', 1000000, 7)
  ) AS t(title, description, amount, sort_order)
WHERE p.slug = 'oh-yoon-terracotta'
  AND NOT EXISTS (SELECT 1 FROM public.reward_tiers r WHERE r.project_id = p.id AND r.amount = t.amount AND r.reward_kind = 'postcard');

-- 사후판화 시드 1점 (예시 — 실제 판화 선별/이미지는 admin Phase C 또는 추후 보강)
INSERT INTO public.reward_tiers (project_id, title, description, amount, total_quantity, requires_shipping, reward_kind, sort_order)
SELECT p.id, '오윤 사후판화 — 〈칼노래〉', '오윤 사후판화 1점을 답례로 보내드립니다(한정).', 1200000, 10, true, 'print', 10
FROM public.funding_projects p
WHERE p.slug = 'oh-yoon-terracotta'
  AND NOT EXISTS (SELECT 1 FROM public.reward_tiers r WHERE r.project_id = p.id AND r.reward_kind = 'print' AND r.amount = 1200000);
