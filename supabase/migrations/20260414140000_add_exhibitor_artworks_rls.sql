-- exhibitor가 자신이 소유한 artist의 artworks에 접근할 수 있도록 RLS 정책 추가
-- exhibitor-artworks.ts를 admin client → server client로 전환함에 따라 필요
-- artists 테이블은 owner_id 기반 exhibitor 정책이 이미 존재함

-- SELECT: 공개 artworks + exhibitor 소유 artist의 artworks
-- 기존 "Public viewable artworks" 정책에 exhibitor 조건 추가하는 방식 대신
-- 별도 PERMISSIVE 정책으로 추가 (OR로 합산)
CREATE POLICY "Exhibitors select own artworks"
  ON artworks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = artworks.artist_id
        AND a.owner_id = auth.uid()
    )
    AND get_my_role() = 'exhibitor'
  );

-- INSERT: exhibitor 소유 artist에게 artwork 추가
CREATE POLICY "Exhibitors insert own artworks"
  ON artworks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = artworks.artist_id
        AND a.owner_id = auth.uid()
    )
    AND get_my_role() = 'exhibitor'
  );

-- UPDATE: exhibitor 소유 artist의 artwork 수정
CREATE POLICY "Exhibitors update own artworks"
  ON artworks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = artworks.artist_id
        AND a.owner_id = auth.uid()
    )
    AND get_my_role() = 'exhibitor'
  );

-- DELETE: exhibitor 소유 artist의 artwork 삭제
CREATE POLICY "Exhibitors delete own artworks"
  ON artworks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = artworks.artist_id
        AND a.owner_id = auth.uid()
    )
    AND get_my_role() = 'exhibitor'
  );
