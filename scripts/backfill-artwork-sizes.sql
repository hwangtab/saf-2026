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

-- 구간 분류: 2D는 면적 경계 (lib/artwork-size.ts와 동일 유지)
update artworks set size_bucket = case
    when width_cm*height_cm <= 2721  then 'small'
    when width_cm*height_cm <= 7319  then 'medium'
    when width_cm*height_cm <= 23200 then 'large'
    else 'xlarge'
  end
where depth_cm is null and width_cm is not null;
