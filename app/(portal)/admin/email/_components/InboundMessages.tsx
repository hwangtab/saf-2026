'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { AdminBadge } from '@/app/(portal)/admin/_components/admin-ui';
import { replyToInboundMessage, type InboundEmailRow } from '@/app/actions/admin-email-inbound';

type BadgeTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  new: { label: '새 회신', tone: 'info' },
  read: { label: '확인됨', tone: 'default' },
  replied: { label: '답장 완료', tone: 'success' },
  archived: { label: '보관됨', tone: 'default' },
};

function formatKst(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

function attachmentCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function MessageBody({ row }: { row: InboundEmailRow }) {
  if (row.text_body) {
    return <pre className="whitespace-pre-wrap break-words text-sm leading-6">{row.text_body}</pre>;
  }
  if (row.html_body) {
    return (
      <div className="max-h-80 overflow-auto rounded-lg border border-gray-200 bg-canvas-soft p-3 text-xs text-charcoal-muted">
        HTML 본문만 있는 메일입니다. 원문 HTML은 보안상 텍스트로 표시합니다.
        <pre className="mt-2 whitespace-pre-wrap break-words">{row.html_body}</pre>
      </div>
    );
  }
  return <p className="text-sm text-charcoal-muted">본문이 비어 있습니다.</p>;
}

function ReplyForm({ row }: { row: InboundEmailRow }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await replyToInboundMessage({ inboundId: row.id, body });
      if (result.error) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      setBody('');
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <label htmlFor={`reply-${row.id}`} className="block text-sm font-medium text-charcoal">
        답장
      </label>
      <textarea
        id={`reply-${row.id}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-strong focus:outline-none focus:ring-2 focus:ring-primary/20"
        placeholder="앱에서 같은 이메일 스레드로 답장합니다."
      />
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs">
          {error && <span className="text-danger-a11y">{error}</span>}
          {message && <span className="text-success-a11y">{message}</span>}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={isPending || !body.trim()}
          className="rounded-lg bg-primary-strong px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? '발송 중...' : '답장 보내기'}
        </button>
      </div>
    </div>
  );
}

export function InboundMessages({ initial }: { initial: InboundEmailRow[] }) {
  const [openId, setOpenId] = useState<string | null>(initial[0]?.id ?? null);

  if (initial.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-charcoal-muted">
        받은 회신이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <ul className="divide-y divide-gallery-divider">
          {initial.map((row) => {
            const meta = STATUS_META[row.status] ?? { label: row.status, tone: 'default' as const };
            const active = row.id === openId;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(row.id)}
                  className={`block w-full px-4 py-3 text-left transition-colors ${
                    active ? 'bg-primary/5' : 'bg-white hover:bg-canvas-soft'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-charcoal-deep">
                        {row.subject ?? '(제목 없음)'}
                      </p>
                      <p className="truncate text-xs text-charcoal-muted">
                        {row.from_email ?? '보낸 사람 확인 중'}
                      </p>
                    </div>
                    <AdminBadge tone={meta.tone}>{meta.label}</AdminBadge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-charcoal-soft">
                    <span>{formatKst(row.received_at)}</span>
                    {row.matched_broadcast_recipient_id ? <span>매칭됨</span> : <span>미매칭</span>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {initial
        .filter((row) => row.id === openId)
        .map((row) => {
          const meta = STATUS_META[row.status] ?? { label: row.status, tone: 'default' as const };
          const attachments = attachmentCount(row.attachments);
          return (
            <article
              key={row.id}
              className="space-y-4 rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <AdminBadge tone={meta.tone}>{meta.label}</AdminBadge>
                  {row.matched_broadcast_recipient_id && (
                    <AdminBadge tone="success">발송 이력 매칭</AdminBadge>
                  )}
                  {attachments > 0 && <AdminBadge tone="warning">첨부 {attachments}개</AdminBadge>}
                </div>
                <h3 className="text-lg font-semibold text-charcoal-deep">
                  {row.subject ?? '(제목 없음)'}
                </h3>
                <dl className="grid grid-cols-1 gap-2 text-xs text-charcoal-muted sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-charcoal">보낸 사람</dt>
                    <dd className="break-all">{row.from_email ?? '-'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-charcoal">받은 시각</dt>
                    <dd>{formatKst(row.received_at)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-charcoal">받은 주소</dt>
                    <dd className="break-all">{row.to_emails.join(', ') || '-'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-charcoal">Message-ID</dt>
                    <dd className="break-all">{row.message_id ?? '-'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border border-gray-200 bg-canvas-soft p-4">
                <MessageBody row={row} />
              </div>

              {attachments > 0 && (
                <details className="rounded-lg border border-gray-200 p-3 text-sm">
                  <summary className="cursor-pointer font-medium text-charcoal">
                    첨부 메타데이터
                  </summary>
                  <pre className="mt-2 overflow-auto text-xs text-charcoal-muted">
                    {JSON.stringify(row.attachments, null, 2)}
                  </pre>
                </details>
              )}

              <ReplyForm row={row} />
            </article>
          );
        })}
    </div>
  );
}
