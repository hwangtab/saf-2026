-- Storage bucket에 MIME type 허용 목록과 파일 크기 제한을 설정한다.
-- 원격 DB 확인 결과 모든 버킷이 allowed_mime_types: null, file_size_limit: null 상태였음.
-- 클라이언트 측 검증만으로는 우회 가능하므로 Storage 레벨에서 강제한다.

-- 작품/프로필 이미지 버킷: 이미지 파일만 허용, 최대 10MB
UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ],
  file_size_limit = 10485760 -- 10MB
WHERE id IN ('artworks', 'profiles');

-- 에셋 버킷: 이미지 외 SVG/PDF도 허용, 최대 20MB
UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf'
  ],
  file_size_limit = 20971520 -- 20MB
WHERE id = 'assets';
