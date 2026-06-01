export const DEFAULT_ADMIN_TAG_COLOR = '#6b7280';

export type AdminTagInput = {
  name: string;
  color?: string | null;
  description?: string | null;
};

export function normalizeAdminTagName(name: string) {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function toAdminTagSlug(name: string) {
  const normalized = normalizeAdminTagName(name)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return normalized || 'internal-tag';
}

export function normalizeAdminTagColor(color: string | null | undefined) {
  const normalized = color?.trim().toLowerCase();
  return normalized && /^#[0-9a-f]{6}$/.test(normalized) ? normalized : DEFAULT_ADMIN_TAG_COLOR;
}

export function normalizeAdminTagInput(input: AdminTagInput) {
  const name = normalizeAdminTagName(input.name);
  if (!name) {
    throw new Error('태그 이름을 입력해주세요.');
  }

  return {
    name,
    slug: toAdminTagSlug(name),
    color: normalizeAdminTagColor(input.color),
    description: input.description?.trim() || null,
  };
}
