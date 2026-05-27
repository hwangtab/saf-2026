import crypto from 'crypto';

// petition_signatures 테이블의 email_hash 컬럼과 동일한 방식으로 해싱.
// DB: extensions.digest(salt || lower(btrim(email)), 'sha256'), hex 인코딩.
// (supabase/migrations/20260427034000_petition_signatures.sql hash_email 함수 참조)
const PETITION_SALT = 'f37333df3ab307ea26b31c1e600d5dfa60134e4c9724b043fed489345e8beec9';

export function hashEmail(email: string, salt: string = PETITION_SALT): string {
  const normalized = email.toLowerCase().trim();
  return crypto
    .createHash('sha256')
    .update(salt + normalized)
    .digest('hex');
}
