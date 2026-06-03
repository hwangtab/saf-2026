import { BROADCAST_TEMPLATES } from '@/lib/email/templates';

describe('BROADCAST_TEMPLATES', () => {
  it('id가 고유하다', () => {
    const ids = BROADCAST_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('모든 템플릿이 필수 필드(subject·bodyMd·label)를 가진다', () => {
    for (const t of BROADCAST_TEMPLATES) {
      expect(t.subject.trim().length).toBeGreaterThan(0);
      expect(t.bodyMd.trim().length).toBeGreaterThan(0);
      expect(t.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('customer 채널 템플릿은 isAdvertisement=true다(법적)', () => {
    for (const t of BROADCAST_TEMPLATES.filter((t) => t.channel === 'customer')) {
      expect(t.isAdvertisement).toBe(true);
    }
  });

  it('각 채널(member·customer·petition·individual)에 최소 1개씩 있다', () => {
    for (const ch of ['member', 'customer', 'petition', 'individual'] as const) {
      expect(BROADCAST_TEMPLATES.some((t) => t.channel === ch)).toBe(true);
    }
  });

  it('CTA URL이 있으면 http(s)다', () => {
    for (const t of BROADCAST_TEMPLATES.filter((t) => t.ctaUrl)) {
      expect(t.ctaUrl).toMatch(/^https?:\/\//);
    }
  });
});
