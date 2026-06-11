'use client';

import {
  buildAdvertisementText,
  personalizeSmsText,
  smsByteLength,
  smsSegment,
} from '@/lib/sms/broadcast-body';

interface Props {
  bodyText: string;
  isAdvertisement: boolean;
}

// 발송 전 실제 전송 본문(광고 prefix + 브랜드 + 무료수신거부 라인 포함)을 폰 버블로 미리보기.
// {{name}}은 '회원'으로 치환, 080 번호는 클라이언트에서 env 미설정이라 placeholder 표시 — 실제 발송엔 정상 번호.
export function SmsPreviewCard({ bodyText, isAdvertisement }: Props) {
  const hasBody = bodyText.trim().length > 0;

  // 실제 발송 본문 = 광고 여부에 따라 prefix/opt-out 라인 자동 부착, {{name}} → 회원 치환.
  const adBody = isAdvertisement ? buildAdvertisementText(bodyText) : bodyText;
  const preview = personalizeSmsText(adBody, '회원');

  const bytes = smsByteLength(adBody);
  const seg = smsSegment(adBody);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gallery-divider px-4 py-2.5">
        <p className="text-xs font-medium text-charcoal-muted">문자 미리보기 (실제 전송 본문)</p>
      </div>
      <div className="space-y-4 p-4">
        {/* 폰 버블 */}
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary-strong px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-sm">
            {hasBody ? (
              <span className="whitespace-pre-wrap">{preview}</span>
            ) : (
              <span className="text-white/80">본문을 입력하면 미리보기가 표시됩니다</span>
            )}
          </div>
        </div>

        {/* 바이트 · 세그먼트 */}
        {hasBody && (
          <p className="tabular-nums text-xs text-charcoal-muted">
            <span className="font-semibold text-charcoal">{bytes}바이트</span> ·{' '}
            <span
              className={seg === 'LMS' ? 'font-semibold text-charcoal-deep' : 'text-charcoal-muted'}
            >
              {seg}
            </span>
            {seg === 'LMS' && (
              <span className="text-charcoal-soft"> (90바이트 초과 → 장문문자)</span>
            )}
          </p>
        )}

        {/* 광고 자동 부착 안내 */}
        {isAdvertisement && hasBody && (
          <p className="border-t border-gallery-divider pt-3 text-xs text-charcoal-soft">
            위 미리보기는{' '}
            <span className="font-medium text-charcoal-muted">
              (광고) · [씨앗페] · 무료수신거부
            </span>{' '}
            라인이 자동 부착된 실제 발송 본문입니다. 미리보기의 080 번호는 placeholder이며, 실제
            발송 시 <code>SMS_OPT_OUT_080</code> 환경변수 값으로 대체됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
