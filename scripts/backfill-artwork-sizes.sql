-- 작품 치수 백필 (기존 행 → width/height/depth/size_bucket).
-- 1회성 DML. 재현/감사용 보존. 경계는 lib/artwork-size.ts와 동일(호수 사이 중간값).
-- spec: docs/superpowers/specs/2026-05-30-artwork-size-db-design.md §5
-- 적용: MCP execute_sql로 4개 UPDATE 순차 실행 (사용자 컨펌 필수).

-- 2D: WxHcm
update artworks set
  width_cm  = split_part(regexp_replace(size,'cm$',''),'x',1)::numeric,
  height_cm = split_part(regexp_replace(size,'cm$',''),'x',2)::numeric,
  depth_cm  = null
where size ~ '^[0-9]+(\.[0-9]+)?x[0-9]+(\.[0-9]+)?cm$';

-- 3D: WxHxDcm
update artworks set
  width_cm  = split_part(regexp_replace(size,'cm$',''),'x',1)::numeric,
  height_cm = split_part(regexp_replace(size,'cm$',''),'x',2)::numeric,
  depth_cm  = split_part(regexp_replace(size,'cm$',''),'x',3)::numeric
where size ~ '^[0-9]+(\.[0-9]+)?x[0-9]+(\.[0-9]+)?x[0-9]+(\.[0-9]+)?cm$';

-- 구간 분류: 3D는 object
update artworks set size_bucket = 'object' where depth_cm is not null;

-- 구간 분류: 2D는 호수(긴 변) 경계 (lib/artwork-size.ts classifyBucket과 동일 결과).
-- 경계 = 인접 호수 긴 변 중간점: 10|12호=56.8, 30|40호=95.45, 100|120호=178.05.
-- 면적 기준이던 과거엔 정사각·좁은 직사각이 호수와 한 칸 어긋남 → 긴 변으로 통일. spec §4.4.
update artworks set size_bucket = case
    when greatest(width_cm, height_cm) <= 56.8   then 'small'
    when greatest(width_cm, height_cm) <= 95.45  then 'medium'
    when greatest(width_cm, height_cm) <= 178.05 then 'large'
    else 'xlarge'
  end
where depth_cm is null and width_cm is not null and height_cm is not null;
