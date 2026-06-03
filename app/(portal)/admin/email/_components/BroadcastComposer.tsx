'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  enqueueBroadcast,
  enqueueIndividualBroadcast,
  getPetitionOptions,
  sendTestEmail,
} from '@/app/actions/admin-broadcast';
import {
  buildGroupInput,
  defaultSegment,
  deriveIsAdvertisement,
  isDirectSegment,
  segmentBlockReason,
  type RecipientSegment,
} from '@/lib/email/broadcast-segment';
import type { BroadcastTemplate } from '@/lib/email/templates';
import { RecipientTypePicker, type PetitionOption } from './RecipientTypePicker';
import { TemplatePicker } from './TemplatePicker';
import { LiveAudienceCount } from './LiveAudienceCount';
import { SendSummaryCard } from './SendSummaryCard';
import { EmailPreviewCard } from './EmailPreviewCard';
import { useResolvedAudience } from './useResolvedAudience';
import { FIELD_FOCUS } from './field-styles';

function StepHeading({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-strong text-xs font-semibold text-white">
        {step}
      </span>
      <h3 className="text-sm font-semibold text-charcoal-deep">{title}</h3>
      {hint && <span className="text-xs text-charcoal-muted">{hint}</span>}
    </div>
  );
}

export function BroadcastComposer() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isTestPending, startTestTransition] = useTransition();

  const [segment, setSegment] = useState<RecipientSegment>(defaultSegment('member'));
  const [subject, setSubject] = useState('');
  const [bodyMd, setBodyMd] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [manualPending, setManualPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [petitions, setPetitions] = useState<PetitionOption[]>([]);
  const [petitionsLoaded, setPetitionsLoaded] = useState(false);
  useEffect(() => {
    getPetitionOptions().then((rows) => {
      setPetitions(rows.map((p) => ({ slug: p.slug, title: p.title, isActive: p.isActive })));
      setPetitionsLoaded(true);
    });
  }, []);

  const audience = useResolvedAudience(segment);
  const isAdvertisement = deriveIsAdvertisement(segment);
  const blockReason = segmentBlockReason(segment, manualPending);
  const content = { subject, bodyMd, ctaLabel: ctaLabel || undefined, ctaUrl: ctaUrl || undefined };

  // 종류를 바꾸면 확인 체크는 초기화(다른 대상으로 보내는데 확인이 남아있지 않도록).
  const handleSegmentChange = (next: RecipientSegment) => {
    setSegment(next);
    setConfirmed(false);
  };

  // 제목·본문이 바뀌면 "내용 확인" 체크를 리셋한다(확인 후 내용 변경으로 미확인 발송 방지).
  const handleSubjectChange = (v: string) => {
    setSubject(v);
    setConfirmed(false);
  };
  const handleBodyChange = (v: string) => {
    setBodyMd(v);
    setConfirmed(false);
  };

  const applyTemplate = (t: BroadcastTemplate) => {
    if (
      (subject.trim() || bodyMd.trim()) &&
      !window.confirm('이미 입력한 제목·본문이 있습니다. 템플릿 내용으로 덮어쓸까요?')
    ) {
      return;
    }
    setSubject(t.subject);
    setBodyMd(t.bodyMd);
    setCtaLabel(t.ctaLabel ?? '');
    setCtaUrl(t.ctaUrl ?? '');
    setConfirmed(false);
  };

  const resetForm = () => {
    setSubject('');
    setBodyMd('');
    setCtaLabel('');
    setCtaUrl('');
    setConfirmed(false);
    setManualPending(false);
    setSegment(defaultSegment('member'));
  };

  const handleSend = () => {
    if (blockReason) {
      setError(blockReason);
      return;
    }
    if (!confirmed) {
      setError('발송 확인 체크박스를 선택해주세요.');
      return;
    }
    setError(null);
    setNotice(null);
    setSuccess(null);

    startTransition(async () => {
      const result = isDirectSegment(segment)
        ? await enqueueIndividualBroadcast({
            recipients: segment.contacts,
            subject,
            bodyMd,
            ctaLabel: ctaLabel || undefined,
            ctaUrl: ctaUrl || undefined,
            isAdvertisement,
          })
        : await enqueueBroadcast(buildGroupInput(segment, content));

      if (result.error) {
        setError(result.message);
      } else if (result.deduped) {
        // 멱등 단락 — 새로 발송되지 않음. 성공으로 오인하지 않도록 경고 톤 + 폼 유지(수정 후 재시도 가능).
        setNotice(result.message);
        router.refresh();
      } else {
        setSuccess(result.message);
        resetForm();
        router.refresh();
      }
    });
  };

  const handleTest = useCallback(() => {
    setError(null);
    setNotice(null);
    setSuccess(null);
    startTestTransition(async () => {
      // 테스트 발송도 실제 발송과 동일한 광고 플래그를 사용 — "테스트 OK ≠ 실제"였던 불일치 제거.
      const r = await sendTestEmail({
        subject,
        bodyMd,
        ctaLabel: ctaLabel || undefined,
        ctaUrl: ctaUrl || undefined,
        isAdvertisement,
      });
      if (r.error) setError(r.message);
      else setSuccess(r.message);
    });
  }, [subject, bodyMd, ctaLabel, ctaUrl, isAdvertisement]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* 좌측: 작성 */}
      <div className="space-y-6">
        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <StepHeading step={1} title="받는 사람" hint="누구에게 보낼지 먼저 정합니다" />
          <RecipientTypePicker
            segment={segment}
            onSegmentChange={handleSegmentChange}
            petitions={petitions}
            petitionsLoaded={petitionsLoaded}
            onManualPendingChange={setManualPending}
          />
          <LiveAudienceCount audience={audience} />
        </section>

        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <StepHeading step={2} title="메일 내용" />
          <TemplatePicker kind={segment.kind} onSelect={applyTemplate} />

          <div>
            <label
              htmlFor="broadcast-subject"
              className="mb-1 block text-sm font-medium text-charcoal"
            >
              제목
              {isAdvertisement && (
                <span className="ml-1 font-normal text-charcoal-muted">
                  (발송 시 &quot;(광고)&quot; 접두어 자동 추가)
                </span>
              )}
            </label>
            <input
              id="broadcast-subject"
              type="text"
              value={subject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              required
              placeholder="이메일 제목"
              className={`block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${FIELD_FOCUS}`}
            />
          </div>

          <div>
            <label
              htmlFor="broadcast-body"
              className="mb-1 block text-sm font-medium text-charcoal"
            >
              본문 (마크다운)
            </label>
            <textarea
              id="broadcast-body"
              value={bodyMd}
              onChange={(e) => handleBodyChange(e.target.value)}
              required
              rows={8}
              placeholder="이메일 본문을 입력하세요. 빈 줄로 문단을 구분합니다."
              className={`block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm ${FIELD_FOCUS}`}
            />
            <p className="mt-1 text-xs text-charcoal-muted">
              본문에서 <code className="font-mono">{'{{name}}'}</code>은 수신자 이름으로 치환됩니다
              (이름이 없으면 “회원”). 제목에는 적용되지 않습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="broadcast-cta-label"
                className="mb-1 block text-sm font-medium text-charcoal"
              >
                CTA 버튼 텍스트 (선택)
              </label>
              <input
                id="broadcast-cta-label"
                type="text"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="자세히 보기"
                className={`block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${FIELD_FOCUS}`}
              />
            </div>
            <div>
              <label
                htmlFor="broadcast-cta-url"
                className="mb-1 block text-sm font-medium text-charcoal"
              >
                CTA URL (선택)
              </label>
              <input
                id="broadcast-cta-url"
                type="url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://www.saf2026.com/..."
                className={`block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${FIELD_FOCUS}`}
              />
            </div>
          </div>
        </section>
      </div>

      {/* 우측: sticky 요약 + 미리보기 */}
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <SendSummaryCard
          segment={segment}
          audience={audience}
          isAdvertisement={isAdvertisement}
          subject={subject}
          confirmed={confirmed}
          onConfirmedChange={setConfirmed}
          blockReason={blockReason}
          error={error}
          notice={notice}
          success={success}
          isPending={isPending}
          isTestPending={isTestPending}
          onSend={handleSend}
          onTest={handleTest}
        />
        <EmailPreviewCard
          subject={subject}
          bodyMd={bodyMd}
          ctaLabel={ctaLabel || undefined}
          ctaUrl={ctaUrl || undefined}
          isAdvertisement={isAdvertisement}
        />
      </div>
    </div>
  );
}
