'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

interface ShareTemplatesProps {
  url: string;
}

// Kakao SDK 글로벌 타입은 types/kakao.d.ts에서 이미 정의됨.
function ensureKakaoInit(): boolean {
  if (typeof window === 'undefined') return false;
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key || typeof window.Kakao === 'undefined') return false;
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(key);
  }
  return window.Kakao.isInitialized();
}

export default function ShareTemplates({ url }: ShareTemplatesProps) {
  const t = useTranslations('petition.ohYoon');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  type Channel = 'kakao' | 'sms' | 'sns';
  const templates: { key: Channel; label: string; text: string; share: () => void }[] = [
    {
      key: 'kakao',
      label: t('shareTemplateKakaoLabel'),
      text: t('shareTemplateKakao', { url }),
      share: () => {
        const text = t('shareTemplateKakao', { url });
        if (!ensureKakaoInit() || !window.Kakao?.Share) {
          // fallback — sms
          window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
          return;
        }
        const ogImageUrl = `${url.split('/petition')[0]}/petition/oh-yoon/opengraph-image`;
        window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: t('statementLine1') + ' ' + t('statementLine2') + ' ' + t('statementLine3'),
            description: text,
            imageUrl: ogImageUrl,
            link: { mobileWebUrl: url, webUrl: url },
          },
          buttons: [{ title: t('heroCta'), link: { mobileWebUrl: url, webUrl: url } }],
        });
      },
    },
    {
      key: 'sms',
      label: t('shareTemplateSmsLabel'),
      text: t('shareTemplateSms', { url }),
      share: () => {
        window.location.href = `sms:?&body=${encodeURIComponent(t('shareTemplateSms', { url }))}`;
      },
    },
    {
      key: 'sns',
      label: t('shareTemplateSnsLabel'),
      text: t('shareTemplateSns', { url }),
      share: () => {
        const text = t('shareTemplateSns', { url });
        const u = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(u, '_blank', 'noopener,noreferrer');
      },
    },
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
          <li key={tpl.key} className="rounded-md border border-gray-200 bg-canvas p-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-muted">
                {tpl.label}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => copy(tpl.key, tpl.text)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-charcoal-deep hover:bg-gray-50"
                >
                  {copiedKey === tpl.key ? t('shareCopied') : t('copyTemplate')}
                </button>
                <button
                  type="button"
                  onClick={tpl.share}
                  className="rounded-md bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-white hover:bg-primary-strong"
                >
                  <span className="inline-flex items-center gap-1">
                    {t('shareTemplateOpen')}
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                </button>
              </div>
            </div>
            <p className="text-xs text-charcoal break-keep whitespace-pre-wrap">{tpl.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
