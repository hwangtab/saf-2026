export type RequestPasswordResetResult =
  | { status: 'sent' }
  | { status: 'not_found' }
  | { status: 'social_only'; provider: string }
  | { status: 'rate_limited' }
  | { status: 'error' };
