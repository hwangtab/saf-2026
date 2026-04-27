'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface ShareTemplatesProps {
  url: string;
}

export default function ShareTemplates({ url }: ShareTemplatesProps) {
  const t = useTranslations('petition.ohYoon');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const templates: { key: string; label: string; text: string }[] = [
    { key: 'kakao', label: t('shareTemplateKakaoLabel'), text: t('shareTemplateKakao', { url }) },
    { key: 'sms', label: t('shareTemplateSmsLabel'), text: t('shareTemplateSms', { url }) },
    { key: 'sns', label: t('shareTemplateSnsLabel'), text: t('shareTemplateSns', { url }) },
  ];

  function copy(key: string, text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-charcoal-deep">{t('shareTemplatesHeading')}</p>
      <ul className="space-y-2">
        {templates.map((tpl) => (
          <li key={tpl.key} className="rounded-md border border-gray-200 bg-canvas-soft p-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">
                {tpl.label}
              </span>
              <button
                type="button"
                onClick={() => copy(tpl.key, tpl.text)}
                className="rounded-md border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-charcoal-deep hover:bg-gray-50"
              >
                {copiedKey === tpl.key ? t('shareCopied') : t('copyTemplate')}
              </button>
            </div>
            <p className="text-xs text-charcoal break-keep whitespace-pre-wrap">{tpl.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
