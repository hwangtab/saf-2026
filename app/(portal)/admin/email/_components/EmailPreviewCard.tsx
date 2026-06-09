'use client';

import { BRAND_COLORS } from '@/lib/colors';
import { sanitizeRichEmailHtml } from '@/lib/email/rich-content';

interface Props {
  subject: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isAdvertisement: boolean;
}

// 발송 전 본문 구조를 빠르게 확인하는 경량 미리보기. 실제 이메일 디자인(폰트·여백·푸터)은
// "나에게 테스트 보내기"로 확인한다 — 여기서는 제목/문단/CTA 형태만 근사한다.
export function EmailPreviewCard({ subject, bodyHtml, ctaLabel, ctaUrl, isAdvertisement }: Props) {
  const hasBody =
    bodyHtml
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim().length > 0 || /<img\s/i.test(bodyHtml);
  const previewHtml = sanitizeRichEmailHtml(bodyHtml).replace(/\{\{\s*name\s*\}\}/g, '수신자');
  const displaySubject = isAdvertisement ? `(광고) ${subject || '(제목 없음)'}` : subject;
  // 실제 메일은 라벨과 URL이 모두 있어야 CTA 버튼을 렌더한다(broadcast.tsx) — 미리보기도 동일 조건.
  const showCta = Boolean(ctaLabel && ctaUrl);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gallery-divider px-4 py-2.5">
        <p className="text-xs font-medium text-charcoal-muted">이메일 미리보기 (구조 확인용)</p>
      </div>
      <div className="space-y-4 p-4">
        <div
          className="rounded-lg px-4 py-3 text-sm font-semibold text-white"
          style={{
            backgroundColor: isAdvertisement
              ? BRAND_COLORS.primary.strong
              : BRAND_COLORS.primary.DEFAULT,
          }}
        >
          {displaySubject || '제목을 입력하세요'}
        </div>

        <div className="space-y-2 text-sm leading-relaxed text-charcoal">
          {hasBody ? (
            <div className="rich-email-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <p className="text-charcoal-soft">본문을 입력하면 여기에 표시됩니다.</p>
          )}
        </div>

        {showCta && (
          <div>
            <span className="inline-flex rounded-lg bg-primary-strong px-4 py-2 text-sm font-medium text-white">
              {ctaLabel}
            </span>
            <p className="mt-1 truncate font-mono text-xs text-charcoal-soft">{ctaUrl}</p>
          </div>
        )}
        {ctaLabel && !ctaUrl && (
          <p className="text-xs text-charcoal-soft">
            CTA URL이 없어 버튼은 발송되지 않습니다. URL을 입력하세요.
          </p>
        )}

        {isAdvertisement && (
          <p className="border-t border-gallery-divider pt-3 text-xs text-charcoal-soft">
            (광고) 표기와 발송사 정보·수신거부 안내가 푸터에 자동 포함됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
