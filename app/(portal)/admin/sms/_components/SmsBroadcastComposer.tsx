'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  enqueueSmsBroadcast,
  enqueueIndividualSmsBroadcast,
  sendTestSms,
} from '@/app/actions/admin-sms-broadcast';
import {
  buildGroupInput,
  defaultSegment,
  deriveIsAdvertisement,
  isDirectSegment,
  segmentBlockReason,
  SMS_RECIPIENT_KIND_META,
  SMS_RECIPIENT_KINDS,
  type SmsRecipientSegment,
} from '@/lib/sms/broadcast-segment';
import { smsByteLength, smsSegment } from '@/lib/sms/broadcast-body';
import { AdminTextarea } from '@/app/(portal)/admin/_components/admin-ui';

export function SmsBroadcastComposer() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isTestPending, startTestTransition] = useTransition();

  const [segment, setSegment] = useState<SmsRecipientSegment>(defaultSegment('member'));
  const [bodyText, setBodyText] = useState('');
  const [directInput, setDirectInput] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdvertisement = deriveIsAdvertisement(segment);
  const manualPending = isDirectSegment(segment) && directInput.trim().length > 0;
  const blockReason = segmentBlockReason(segment, manualPending);
  const bytes = smsByteLength(bodyText);
  const seg = smsSegment(bodyText);

  const handleKindChange = (kind: (typeof SMS_RECIPIENT_KINDS)[number]) => {
    setSegment(defaultSegment(kind));
    setConfirmed(false);
  };

  const addDirectNumber = () => {
    if (!isDirectSegment(segment)) return;
    const phone = directInput.trim();
    if (!phone) return;
    setSegment({
      ...segment,
      contacts: [...segment.contacts, { phone, name: null }],
    });
    setDirectInput('');
  };

  const resetForm = () => {
    setBodyText('');
    setDirectInput('');
    setConfirmed(false);
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
        ? await enqueueIndividualSmsBroadcast({
            contacts: segment.contacts,
            bodyText,
            isAdvertisement,
          })
        : await enqueueSmsBroadcast(buildGroupInput(segment, { bodyText }));

      if (result.error) {
        setError(result.message);
      } else if (result.deduped) {
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
      const r = await sendTestSms({ bodyText, isAdvertisement });
      if (r.error) setError(r.message);
      else setSuccess(r.message);
    });
  }, [bodyText, isAdvertisement]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-charcoal-deep">1. 받는 사람</h3>
          <div className="flex flex-wrap gap-2">
            {SMS_RECIPIENT_KINDS.map((kind) => {
              const meta = SMS_RECIPIENT_KIND_META[kind];
              const active = segment.kind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => handleKindChange(kind)}
                  className={
                    active
                      ? 'rounded-lg bg-primary-strong px-3 py-2 text-sm font-semibold text-white'
                      : 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-charcoal-deep hover:bg-gray-50'
                  }
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-charcoal-muted">
            {SMS_RECIPIENT_KIND_META[segment.kind].description}
          </p>

          {segment.kind === 'member' && (
            <select
              value={segment.subset}
              onChange={(e) =>
                setSegment({
                  kind: 'member',
                  subset: e.target.value as 'all' | 'artist' | 'exhibitor',
                })
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">작가·출품자 전체</option>
              <option value="artist">작가만</option>
              <option value="exhibitor">출품자만</option>
            </select>
          )}

          {isDirectSegment(segment) && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={directInput}
                  onChange={(e) => setDirectInput(e.target.value)}
                  placeholder="010-0000-0000"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={addDirectNumber}
                  className="shrink-0 rounded-lg bg-primary-strong px-3 py-2 text-sm font-semibold text-white"
                >
                  입력한 번호 추가
                </button>
              </div>
              <p className="text-xs text-charcoal-muted">
                추가됨: {segment.contacts.length.toLocaleString('ko-KR')}명 (최대 500)
              </p>
              <label className="flex items-center gap-2 text-xs text-charcoal">
                <input
                  type="checkbox"
                  checked={segment.advertising}
                  onChange={(e) => setSegment({ ...segment, advertising: e.target.checked })}
                />
                광고성 문자 (체크 시 (광고) 표기·무료수신거부·야간 차단 적용)
              </label>
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-charcoal-deep">
            2. 문자 내용
            {isAdvertisement && (
              <span className="ml-1 font-normal text-charcoal-muted">
                (발송 시 &quot;(광고)&quot; 표기·무료수신거부·야간 차단 자동 적용)
              </span>
            )}
          </h3>
          <AdminTextarea
            value={bodyText}
            onChange={(e) => {
              setBodyText(e.target.value);
              setConfirmed(false);
            }}
            rows={5}
            placeholder="문자 본문 ({{name}}은 수신자 이름으로 치환, 없으면 회원)"
          />
          <p className="text-xs tabular-nums text-charcoal-muted">
            {bytes}바이트 · {seg}
            {seg === 'LMS' && ' (90바이트 초과 → 장문)'}
          </p>
        </section>
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-charcoal-deep">발송</h3>
          {blockReason && <p className="text-xs text-danger-a11y">{blockReason}</p>}
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            내용을 확인했고 발송에 동의합니다
          </label>
          {error && <p className="text-xs text-danger-a11y">{error}</p>}
          {notice && <p className="text-xs text-charcoal-muted">{notice}</p>}
          {success && <p className="text-xs text-success-a11y">{success}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTestPending || !bodyText.trim()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-deep hover:bg-gray-50 disabled:opacity-40"
            >
              {isTestPending ? '발송 중...' : '내게 테스트'}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isPending || !bodyText.trim()}
              className="rounded-lg bg-primary-strong px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {isPending ? '발송 중...' : '발송'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
