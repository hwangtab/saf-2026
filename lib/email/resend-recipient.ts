const ASCII_EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

export function validateResendRecipientEmail(email: string): { valid: true } | { valid: false; reason: string } {
  const value = email.trim();
  const [localPart, domain, ...extraParts] = value.split('@');

  if (!value) return { valid: false, reason: 'recipient email is blank' };
  if (value !== email) return { valid: false, reason: 'recipient email has surrounding whitespace' };
  if (extraParts.length > 0 || !localPart || !domain) {
    return { valid: false, reason: 'recipient email must contain one @' };
  }
  if (!/^[\x00-\x7F]+$/.test(value)) {
    return { valid: false, reason: 'recipient email contains non-ASCII characters' };
  }
  if (!ASCII_EMAIL_PATTERN.test(value)) {
    return { valid: false, reason: 'recipient email format is invalid' };
  }
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { valid: false, reason: 'recipient local part dot placement is invalid' };
  }
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return { valid: false, reason: 'recipient domain dot placement is invalid' };
  }
  if (domain.split('.').some((label) => label.startsWith('-') || label.endsWith('-'))) {
    return { valid: false, reason: 'recipient domain label hyphen placement is invalid' };
  }
  if (!/[A-Za-z]{2,}$/.test(domain)) {
    return { valid: false, reason: 'recipient domain suffix is invalid' };
  }

  return { valid: true };
}
