'use client';

import { BROADCAST_TEMPLATES, type BroadcastTemplate } from '@/lib/email/templates';
import type { BroadcastChannel } from '@/lib/email/audiences/types';
import type { RecipientKind } from '@/lib/email/broadcast-segment';
import { FIELD_FOCUS } from './field-styles';

interface Props {
  kind: RecipientKind;
  onSelect: (template: BroadcastTemplate) => void;
}

// 받는 사람 종류에 맞는 템플릿만 노출한다. 적용은 제목·본문·CTA만 채우고 수신자 종류는 바꾸지 않는다
// (기존엔 individual 템플릿이 발송 모드를 몰래 전환했음 — 부작용 제거).
function allowedChannels(kind: RecipientKind): BroadcastChannel[] {
  switch (kind) {
    case 'member':
      return ['member'];
    case 'customer':
      return ['customer'];
    case 'petition':
      return ['petition'];
    case 'artwork-buyer':
      return ['customer', 'individual'];
    case 'direct':
      return ['individual'];
  }
}

export function TemplatePicker({ kind, onSelect }: Props) {
  const allowed = allowedChannels(kind);
  const templates = BROADCAST_TEMPLATES.filter((t) => allowed.includes(t.channel));

  return (
    <div>
      <label htmlFor="broadcast-template" className="mb-1 block text-sm font-medium text-charcoal">
        템플릿으로 시작{' '}
        <span className="font-normal text-charcoal-muted">(제목·본문을 자동으로 채웁니다)</span>
      </label>
      <select
        id="broadcast-template"
        value=""
        onChange={(e) => {
          const t = templates.find((x) => x.id === e.target.value);
          if (t) onSelect(t);
        }}
        className={`block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${FIELD_FOCUS}`}
      >
        <option value="">직접 작성 (빈 양식)</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label} — {t.description}
          </option>
        ))}
      </select>
    </div>
  );
}
