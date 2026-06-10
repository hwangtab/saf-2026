'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  enqueueSmsBroadcast,
  enqueueIndividualSmsBroadcast,
  previewSmsAudience,
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
import { useDebounce } from '@/lib/hooks/useDebounce';
import { AdminTextarea } from '@/app/(portal)/admin/_components/admin-ui';

// 세그먼트에서 previewSmsAudience 호출 인자 키를 생성. direct는 서버 조회 불필요.
function segmentPreviewKey(seg: SmsRecipientSegment): string | null {
  if (seg.kind === 'direct') return null;
  if (seg.kind === 'member') return JSON.stringify({ kind: 'member', subset: seg.subset });
  return JSON.stringify({ kind: 'customer' });
}

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

  // Live audience count for group segments.
  // Loading is derived from key mismatch (no synchronous setState in effect — cascading render 방지).
  const argsKey = segmentPreviewKey(segment) ?? '';
  const debouncedKey = useDebounce(argsKey, 400);
  const [serverPreview, setServerPreview] = useState<{ key: string; total: number } | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!debouncedKey) return; // direct segment — no server call
    const reqId = ++reqIdRef.current;
    const parsed = JSON.parse(debouncedKey) as {
      kind: 'member' | 'customer';
      subset?: 'all' | 'artist' | 'exhibitor';
    };
    const filter =
      parsed.kind === 'member' && parsed.subset ? { subset: parsed.subset } : undefined;
    previewSmsAudience(parsed.kind, filter)
      .then((r) => {
        if (reqId !== reqIdRef.current) return;
        setServerPreview({ key: debouncedKey, total: r.total });
      })
      .catch(() => {
        if (reqId !== reqIdRef.current) return;
        setServerPreview({ key: debouncedKey, total: 0 });
      });
  }, [debouncedKey]);

  // Resolved count + loading state derived from key matching (not from imperative setState).
  const isDirect = isDirectSegment(segment);
  const directCount = isDirect ? segment.contacts.length : 0;
  const groupLoading = !isDirect && (serverPreview?.key !== argsKey || argsKey !== debouncedKey);
  const groupCount = serverPreview?.total ?? 0;
  const audienceCount = isDirect ? directCount : groupCount;
  const audienceLoading = !isDirect && groupLoading;

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

          {/* Live audience count */}
          <p className="text-xs text-charcoal-muted">
            대상{' '}
            {audienceLoading ? (
              <span className="text-charcoal-soft">계산 중…</span>
            ) : (
              <span
                className={
                  audienceCount === 0
                    ? 'font-semibold text-danger-a11y'
                    : 'font-semibold text-charcoal'
                }
              >
                {audienceCount.toLocaleString('ko-KR')}명
              </span>
            )}
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
                  onChange={(e) => {
                    setSegment({ ...segment, advertising: e.target.checked });
                    setConfirmed(false);
                  }}
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
