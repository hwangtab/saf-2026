-- 1. Add 'exhibitor' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'exhibitor';

-- 2. Add owner_id column to artists table
ALTER TABLE artists 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- 3. Create RLS policies for artists table
CREATE POLICY "Users can select their own artists" 
ON artists FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert artists if they have permission" 
ON artists FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own artists" 
ON artists FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own artists" 
ON artists FOR DELETE 
USING (auth.uid() = owner_id);

-- 4. Update profiles role check constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role::text IN ('admin', 'artist', 'user', 'exhibitor'));
