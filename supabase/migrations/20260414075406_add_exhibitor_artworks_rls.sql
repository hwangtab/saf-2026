
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
;
