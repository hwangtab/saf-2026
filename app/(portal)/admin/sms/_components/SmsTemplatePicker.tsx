'use client';

import { SMS_BROADCAST_TEMPLATES, type SmsBroadcastTemplate } from '@/lib/sms/templates';
import type { SmsBroadcastChannel } from '@/lib/sms/audiences/types';
import type { SmsRecipientKind } from '@/lib/sms/broadcast-segment';

// 받는 사람 종류 → 허용 채널 매핑 (TemplatePicker email mirror)
function allowedChannels(kind: SmsRecipientKind): SmsBroadcastChannel[] {
  switch (kind) {
    case 'member':
      return ['member'];
    case 'customer':
      return ['customer'];
    case 'petition':
      return ['petition'];
    case 'direct':
      return ['individual'];
  }
}

interface Props {
  kind: SmsRecipientKind;
  onSelect: (template: SmsBroadcastTemplate) => void;
}

// 현재 세그먼트에 맞는 SMS 템플릿만 노출. 적용은 bodyText·isAdvertisement만 채우고 수신자 종류는 바꾸지 않는다.
export function SmsTemplatePicker({ kind, onSelect }: Props) {
  const allowed = allowedChannels(kind);
  const templates = SMS_BROADCAST_TEMPLATES.filter(
    (t) => !t.allowedChannels || t.allowedChannels.some((ch) => allowed.includes(ch))
  );

  if (templates.length === 0) return null;

  return (
    <div>
      <label
        htmlFor="sms-broadcast-template"
        className="mb-1 block text-sm font-medium text-charcoal"
      >
        템플릿으로 시작{' '}
        <span className="font-normal text-charcoal-muted">(본문을 자동으로 채웁니다)</span>
      </label>
      <select
        id="sms-broadcast-template"
        value=""
        onChange={(e) => {
          const t = templates.find((x) => x.id === e.target.value);
          if (t) onSelect(t);
        }}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:border-primary-a11y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/30"
      >
        <option value="">직접 작성 (빈 양식)</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} — {t.description}
          </option>
        ))}
      </select>
    </div>
  );
}
