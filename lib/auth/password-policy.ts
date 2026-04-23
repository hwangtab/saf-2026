export const MIN_PASSWORD_LENGTH = 8;

export function hasValidPasswordLength(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function isWeakPasswordError(error: { message?: string | null; code?: string | null }) {
  if (error.code === 'weak_password') return true;

  const normalizedMessage = (error.message ?? '').toLowerCase();
  return (
    normalizedMessage.includes('password') &&
    (normalizedMessage.includes('least') ||
      normalizedMessage.includes('minimum') ||
      normalizedMessage.includes('length') ||
      normalizedMessage.includes('weak'))
  );
}
