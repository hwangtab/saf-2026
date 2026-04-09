const INVALID_CONTROL_CHARS_REGEX = new RegExp('[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]', 'g');
const SCRIPT_BREAKER_CHARS_REGEX = /[\u2028\u2029]/g;
const INLINE_TEXT_BREAK_REGEX = /[\r\n\t]+/g;

export function sanitizeTextForRscPayload(value: string): string {
  return value.replace(INVALID_CONTROL_CHARS_REGEX, '').replace(SCRIPT_BREAKER_CHARS_REGEX, '\n');
}

export function sanitizeNullableTextForRscPayload(value: string | null | undefined): string | null {
  if (value == null) return null;
  return sanitizeTextForRscPayload(value);
}

export function sanitizeSingleLineTextForRscPayload(value: string): string {
  return sanitizeTextForRscPayload(value).replace(INLINE_TEXT_BREAK_REGEX, '').trim();
}

export function sanitizeNullableSingleLineTextForRscPayload(
  value: string | null | undefined
): string | null {
  if (value == null) return null;
  return sanitizeSingleLineTextForRscPayload(value);
}
