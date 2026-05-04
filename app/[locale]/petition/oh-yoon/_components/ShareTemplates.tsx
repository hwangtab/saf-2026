'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { useKakaoShareSDK } from '@/lib/hooks/useKakaoSDK';
import { formatPetitionDeadline } from '@/lib/petition/format';

interface ShareTemplatesProps {
  url: string;
}

export default function ShareTemplates({ url }: ShareTemplatesProps) {
  const t = useTranslations('petition.ohYoon');
  const locale = useLocale() === 'en' ? 'en' : 'ko';
  const deadline = formatPetitionDeadline(locale);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  // 카카오 SDK는 페이지 로드 시 자동으로 안 붙어 있음 — 공유 버튼 클릭 시 동적 로드.
  // 이전 버전은 typeof window.Kakao === 'undefined' 시 즉시 SMS fallback이라
  // 버튼 누르면 항상 문자 메시지가 떴던 회귀(ShareButtons.tsx의 정상 패턴 미적용).
  const { hasAppKey, ensureLoaded } = useKakaoShareSDK();

  type Channel = 'kakao' | 'sms' | 'sns';
  const templates: { key: Channel; label: string; text: string; share: () => void }[] = [
    {
      key: 'kakao',
      label: t('shareTemplateKakaoLabel'),
      text: t('shareTemplateKakao', { url }),
      share: async () => {
        const text = t('shareTemplateKakao', { url });
        // App key 미설정이거나 SDK 로드/초기화 실패 시에만 SMS fallback.
        if (!hasAppKey) {
          window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
          return;
        }
        const loaded = await ensureLoaded();
        if (!loaded || !window.Kakao?.Share) {
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
      text: t('shareTemplateSns', { url, deadlineShort: deadline.short }),
      share: () => {
        const text = t('shareTemplateSns', { url, deadlineShort: deadline.short });
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
