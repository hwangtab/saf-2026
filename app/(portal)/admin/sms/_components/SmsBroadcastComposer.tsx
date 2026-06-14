'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  enqueueSmsBroadcast,
  enqueueIndividualSmsBroadcast,
  previewSmsAudience,
  sendTestSms,
} from '@/app/actions/admin-sms-broadcast';
import { getPetitionOptions } from '@/app/actions/admin-broadcast';
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
import {
  buildAdvertisementText,
  isNightInKst,
  smsByteLength,
  smsSegment,
} from '@/lib/sms/broadcast-body';
import { estimateBroadcastCost, SMS_UNIT_PRICE_KRW } from '@/lib/sms/pricing';
import type { SmsBroadcastTemplate } from '@/lib/sms/templates';
import { SmsPreviewCard } from './SmsPreviewCard';
import { SmsTemplatePicker } from './SmsTemplatePicker';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { AdminTextarea } from '@/app/(portal)/admin/_components/admin-ui';

// 세그먼트에서 previewSmsAudience 호출 인자 키를 생성. direct는 서버 조회 불필요.
// petition은 slug가 없으면 null(조회 안 함).
function segmentPreviewKey(seg: SmsRecipientSegment): string | null {
  if (seg.kind === 'direct') return null;
  if (seg.kind === 'member') return JSON.stringify({ kind: 'member', subset: seg.subset });
  if (seg.kind === 'petition')
    return seg.petitionSlug
      ? JSON.stringify({ kind: 'petition', petitionSlug: seg.petitionSlug })
      : null;
  return JSON.stringify({ kind: 'customer' });
}

interface PetitionOption {
  slug: string;
  title: string;
  isActive: boolean;
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

  const [petitions, setPetitions] = useState<PetitionOption[]>([]);
  const [petitionsLoaded, setPetitionsLoaded] = useState(false);
  useEffect(() => {
    getPetitionOptions().then((rows) => {
      setPetitions(rows.map((p) => ({ slug: p.slug, title: p.title, isActive: p.isActive })));
      setPetitionsLoaded(true);
    });
  }, []);

  const isAdvertisement = deriveIsAdvertisement(segment);
  const manualPending = isDirectSegment(segment) && directInput.trim().length > 0;
  const blockReason = segmentBlockReason(segment, manualPending);
  // 광고 발송의 실제 전송 본문 = buildAdvertisementText 적용 본문. 이 기준으로 바이트·세그먼트·비용 산출.
  const adBody = isAdvertisement ? buildAdvertisementText(bodyText) : bodyText;
  const bytes = smsByteLength(adBody);
  const seg = smsSegment(adBody);
  const isNight = isNightInKst();

  // Live audience count for group segments.
  // Loading is derived from key mismatch (no synchronous setState in effect — cascading render 방지).
  const argsKey = segmentPreviewKey(segment) ?? '';
  const debouncedKey = useDebounce(argsKey, 400);
  const [serverPreview, setServerPreview] = useState<{ key: string; total: number } | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!debouncedKey) return; // direct segment or petition without slug — no server call
    const reqId = ++reqIdRef.current;
    const parsed = JSON.parse(debouncedKey) as {
      kind: 'member' | 'customer' | 'petition';
      subset?: 'all' | 'artist' | 'exhibitor';
      petitionSlug?: string;
    };
    let filter: { subset?: 'all' | 'artist' | 'exhibitor'; petitionSlug?: string } | undefined;
    if (parsed.kind === 'member' && parsed.subset) {
      filter = { subset: parsed.subset };
    } else if (parsed.kind === 'petition' && parsed.petitionSlug) {
      filter = { petitionSlug: parsed.petitionSlug };
    }
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

  // 템플릿 적용: 기존 본문이 있으면 덮어쓰기 확인 (email BroadcastComposer.applyTemplate 미러).
  const applyTemplate = (template: SmsBroadcastTemplate) => {
    if (bodyText.trim().length > 0) {
      if (!window.confirm('현재 작성 중인 본문이 있습니다. 템플릿으로 덮어쓰시겠습니까?')) return;
    }
    setBodyText(template.bodyText);
    // 광고 직접 지정 세그먼트에서만 advertising 플래그 동기화 (다른 세그먼트는 채널이 결정).
    if (isDirectSegment(segment) && template.isAdvertisement !== undefined) {
      setSegment({ ...segment, advertising: template.isAdvertisement });
    }
    setConfirmed(false);
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

          {/* 예상 비용 = 대상 수 × 세그먼트(SMS/LMS) 단가 */}
          {!audienceLoading && audienceCount > 0 && bodyText.trim().length > 0 && (
            <p className="text-xs text-charcoal-muted">
              예상 비용{' '}
              <span className="font-semibold text-charcoal">
                ≈ {estimateBroadcastCost(audienceCount, seg).toLocaleString('ko-KR')}원
              </span>
              <span className="text-charcoal-soft">
                {' '}
                ({seg} {SMS_UNIT_PRICE_KRW[seg].toLocaleString('ko-KR')}원 ×{' '}
                {audienceCount.toLocaleString('ko-KR')}명, 부가세 포함)
              </span>
            </p>
          )}

          {segment.kind === 'member' && (
            <select
              value={segment.subset}
              onChange={(e) => {
                setSegment({
                  kind: 'member',
                  subset: e.target.value as 'all' | 'artist' | 'exhibitor',
                });
                setConfirmed(false); // 대상이 바뀌면 발송 확인 리셋(L4)
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">작가·출품자 전체</option>
              <option value="artist">작가만</option>
              <option value="exhibitor">출품자만</option>
            </select>
          )}

          {segment.kind === 'petition' && (
            <div>
              <label
                htmlFor="sms-seg-petition"
                className="mb-1 block text-xs font-medium text-charcoal"
              >
                청원 선택
              </label>
              <select
                id="sms-seg-petition"
                value={segment.petitionSlug}
                disabled={!petitionsLoaded || petitions.length === 0}
                onChange={(e) => {
                  setSegment({ kind: 'petition', petitionSlug: e.target.value });
                  setConfirmed(false);
                }}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-canvas-strong disabled:text-charcoal-soft"
              >
                <option value="">
                  {!petitionsLoaded
                    ? '청원 목록 불러오는 중…'
                    : petitions.length === 0
                      ? '등록된 청원이 없습니다'
                      : '청원을 선택하세요'}
                </option>
                {petitions.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.isActive ? '[진행] ' : '[종료] '}
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
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
          <SmsTemplatePicker kind={segment.kind} onSelect={applyTemplate} />
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
            {isAdvertisement && (
              <span className="text-charcoal-soft"> — 광고 prefix 포함 실제 발송 기준</span>
            )}
          </p>
        </section>
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        {/* 문자 미리보기 — 실제 전송 본문(광고 prefix 포함) */}
        <SmsPreviewCard bodyText={bodyText} isAdvertisement={isAdvertisement} />

        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-charcoal-deep">발송</h3>
          {blockReason && <p className="text-xs text-danger-a11y">{blockReason}</p>}

          {/* 정보통신망법 야간 광고 경고 배너 */}
          {isAdvertisement && isNight && (
            <div className="rounded-lg bg-charcoal-deep/5 px-3 py-2.5 text-xs text-charcoal-deep">
              ⚠️ 지금은 야간(21시~8시)입니다. 정보통신망법상 야간 광고 문자 발송은 수신자의 사전
              동의가 필요하며 발송이 차단·지연될 수 있습니다. 동의를 확인하지 못했다면{' '}
              <strong>주간에 발송하세요.</strong>
            </div>
          )}

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
