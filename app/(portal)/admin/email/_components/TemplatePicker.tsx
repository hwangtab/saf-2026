'use client';

import { BROADCAST_TEMPLATES, type BroadcastTemplate } from '@/lib/email/templates';

interface Props {
  mode?: 'segment' | 'search';
  onSelect: (template: BroadcastTemplate) => void;
}

export function TemplatePicker({ mode = 'segment', onSelect }: Props) {
  const templates = BROADCAST_TEMPLATES.filter((t) =>
    mode === 'search' ? t.channel === 'individual' : t.channel !== 'individual'
  );
  return (
    <div>
      <label htmlFor="broadcast-template" className="mb-1 block text-sm font-medium text-charcoal">
        템플릿 선택
      </label>
      <select
        id="broadcast-template"
        defaultValue=""
        onChange={(e) => {
          const t = templates.find((x) => x.id === e.target.value);
          if (t) onSelect(t);
        }}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
