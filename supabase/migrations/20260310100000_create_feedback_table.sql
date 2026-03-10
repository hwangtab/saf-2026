-- User feedback / bug report table
CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('bug', 'improvement', 'question', 'other')),
  page_url text,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'closed')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Indexes
CREATE INDEX idx_feedback_user_id ON feedback (user_id);
CREATE INDEX idx_feedback_status ON feedback (status);
CREATE INDEX idx_feedback_created_at ON feedback (created_at DESC);

-- RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all feedback
CREATE POLICY "Admins can read all feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update feedback (status, admin_note)
CREATE POLICY "Admins can update feedback"
  ON feedback FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
