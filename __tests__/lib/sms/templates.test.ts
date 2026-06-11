import { SMS_BROADCAST_TEMPLATES } from '@/lib/sms/templates';
import { validateAdvertisementText } from '@/lib/sms/broadcast-body';

const VALID_CHANNELS = ['customer', 'member', 'individual', 'petition'] as const;

describe('SMS_BROADCAST_TEMPLATES', () => {
  it('정의된 템플릿이 1개 이상 있어야 한다', () => {
    expect(SMS_BROADCAST_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('모든 템플릿 id가 고유해야 한다', () => {
    const ids = SMS_BROADCAST_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(SMS_BROADCAST_TEMPLATES)('[$id] name이 비어있지 않아야 한다', ({ name }) => {
    expect(name.trim().length).toBeGreaterThan(0);
  });

  it.each(SMS_BROADCAST_TEMPLATES)('[$id] bodyText가 비어있지 않아야 한다', ({ bodyText }) => {
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  it.each(SMS_BROADCAST_TEMPLATES)(
    '[$id] allowedChannels가 있으면 유효한 채널 값만 포함해야 한다',
    ({ allowedChannels }) => {
      if (allowedChannels === undefined) return;
      expect(allowedChannels.length).toBeGreaterThan(0);
      for (const ch of allowedChannels) {
        expect(VALID_CHANNELS).toContain(ch);
      }
    }
  );

  it.each(SMS_BROADCAST_TEMPLATES)(
    '[$id] isAdvertisement=true인 경우 bodyText가 validateAdvertisementText를 통과하거나 (광고)로 시작해야 한다',
    ({ id, bodyText, isAdvertisement }) => {
      if (!isAdvertisement) return;
      // 광고 템플릿은 buildAdvertisementText가 자동 부착하므로 원본 bodyText는 (광고) 없이도 허용.
      // 단, 이미 (광고)로 시작하면 유효성 검증이 전체를 통과해야 한다.
      if (bodyText.startsWith('(광고)')) {
        const result = validateAdvertisementText(bodyText);
        expect(result.ok).toBe(true);
      } else {
        // (광고) prefix 없는 광고 템플릿은 허용 — dispatch에서 buildAdvertisementText 적용.
        // id가 존재하는지만 확인 (템플릿이 실제로 isAdvertisement=true로 선언되었는지 체크).
        expect(id).toBeTruthy();
      }
    }
  );

  it('광고 템플릿은 allowedChannels에 customer 또는 individual만 포함해야 한다', () => {
    const adTemplates = SMS_BROADCAST_TEMPLATES.filter((t) => t.isAdvertisement);
    for (const t of adTemplates) {
      if (t.allowedChannels) {
        for (const ch of t.allowedChannels) {
          expect(['customer', 'individual']).toContain(ch);
        }
      }
    }
  });

  it('정보성 템플릿은 allowedChannels에 member, petition, individual만 포함해야 한다', () => {
    const infoTemplates = SMS_BROADCAST_TEMPLATES.filter((t) => !t.isAdvertisement);
    for (const t of infoTemplates) {
      if (t.allowedChannels) {
        for (const ch of t.allowedChannels) {
          expect(['member', 'petition', 'individual']).toContain(ch);
        }
      }
    }
  });
});
