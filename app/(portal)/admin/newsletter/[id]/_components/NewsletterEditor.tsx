'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

import {
  deleteNewsletter,
  updateNewsletter,
  type NewsletterDetail,
} from '@/app/actions/admin-newsletter';
import {
  NEWSLETTER_BLOCK_LABELS,
  parseNewsletterBlocks,
  type NewsletterBlock,
} from '@/lib/newsletter/blocks';
import { BlockEditor, createBlock } from './block-editors';
import { PreviewPane } from './PreviewPane';
import { SendPanel } from './SendPanel';

const STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  scheduled: '예약됨',
  sending: '발송 중',
  sent: '발송 완료',
};

function safeParseBlocks(raw: unknown): NewsletterBlock[] {
  try {
    return parseNewsletterBlocks(raw);
  } catch {
    return [];
  }
}

const INPUT_CLASS =
  'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-canvas-strong disabled:text-charcoal-muted';

export function NewsletterEditor({ initial }: { initial: NewsletterDetail }) {
  const router = useRouter();
  const readOnly = initial.status !== 'draft';

  const [title, setTitle] = useState(initial.title);
  const [preheader, setPreheader] = useState(initial.preheader);
  const [slug, setSlug] = useState(initial.slug);
  const [isAdvertisement, setIsAdvertisement] = useState(initial.is_advertisement);
  const [blocks, setBlocks] = useState<NewsletterBlock[]>(() => safeParseBlocks(initial.blocks));
  const [savedFingerprint, setSavedFingerprint] = useState(() =>
    JSON.stringify({
      title: initial.title,
      preheader: initial.preheader,
      slug: initial.slug,
      isAdvertisement: initial.is_advertisement,
      blocks: safeParseBlocks(initial.blocks),
    })
  );
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  const fingerprint = JSON.stringify({ title, preheader, slug, isAdvertisement, blocks });
  const dirty = fingerprint !== savedFingerprint;

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const save = () =>
    startSaving(async () => {
      const result = await updateNewsletter(initial.id, {
        title,
        preheader,
        slug,
        isAdvertisement,
        blocks,
      });
      setFeedback({ text: result.message, isError: Boolean(result.error) });
      if (!result.error) setSavedFingerprint(fingerprint);
    });

  const remove = () => {
    if (!window.confirm('이 초안을 삭제할까요? 되돌릴 수 없습니다.')) return;
    startDeleting(async () => {
      const result = await deleteNewsletter(initial.id);
      if (result.error) {
        setFeedback({ text: result.message, isError: true });
        return;
      }
      router.push('/admin/newsletter');
    });
  };

  const updateBlock = (index: number, block: NewsletterBlock) =>
    setBlocks((prev) => prev.map((b, i) => (i === index ? block : b)));
  const removeBlock = (index: number) => setBlocks((prev) => prev.filter((_, i) => i !== index));
  const moveBlock = (index: number, dir: -1 | 1) =>
    setBlocks((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const addBlock = (type: NewsletterBlock['type']) =>
    setBlocks((prev) => [...prev, createBlock(type)]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/newsletter" className="text-sm text-charcoal-muted hover:underline">
          ← 뉴스레터 목록
        </Link>
        <h1 className="text-lg font-bold text-charcoal-deep">제{initial.issue_no}호</h1>
        <span className="rounded-full bg-canvas-strong px-2 py-0.5 text-xs font-medium text-charcoal-muted">
          {STATUS_LABELS[initial.status] ?? initial.status}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {feedback && (
            <p
              className={clsx(
                'text-sm',
                feedback.isError ? 'text-danger-a11y' : 'text-success-a11y'
              )}
            >
              {feedback.text}
            </p>
          )}
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={remove}
                disabled={isDeleting}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal-muted hover:bg-canvas-soft disabled:opacity-50"
              >
                삭제
              </button>
              <button
                type="button"
                onClick={save}
                disabled={isSaving || !dirty}
                className="rounded-lg bg-primary-strong px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSaving ? '저장 중…' : dirty ? '저장' : '저장됨'}
              </button>
            </>
          )}
        </div>
      </div>

      {readOnly && (
        <p className="rounded-lg border border-gray-200 bg-canvas-strong px-4 py-3 text-sm text-charcoal-muted">
          {initial.status === 'scheduled'
            ? '예약된 뉴스레터는 편집할 수 없습니다. 수정하려면 아래에서 예약을 취소하세요.'
            : '발송이 시작된 뉴스레터는 편집할 수 없습니다. 복제해서 다음 호를 만드세요.'}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-charcoal-deep">기본 정보</h2>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-charcoal-muted">
                이메일 제목 겸 웹 제목
              </span>
              <input
                type="text"
                value={title}
                disabled={readOnly}
                onChange={(e) => setTitle(e.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-charcoal-muted">
                받은편지함 미리보기 문구 (preheader)
              </span>
              <input
                type="text"
                value={preheader}
                disabled={readOnly}
                onChange={(e) => setPreheader(e.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-charcoal-muted">
                웹 아카이브 주소 (/newsletter/…)
              </span>
              <input
                type="text"
                value={slug}
                disabled={readOnly}
                onChange={(e) => setSlug(e.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-charcoal">
              <input
                type="checkbox"
                checked={isAdvertisement}
                disabled={readOnly}
                onChange={(e) => setIsAdvertisement(e.target.checked)}
              />
              광고성 정보 포함 — 제목 (광고) 표기·발송자 정보 푸터 (작품 판매·이벤트 홍보 포함 시
              필수)
            </label>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-charcoal-deep">블록</h2>
            {blocks.map((block, index) => (
              <div key={block.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-charcoal-muted">
                    {NEWSLETTER_BLOCK_LABELS[block.type]}
                  </span>
                  {!readOnly && (
                    <div className="ml-auto flex items-center gap-1 text-xs">
                      <button
                        type="button"
                        aria-label="위로"
                        onClick={() => moveBlock(index, -1)}
                        disabled={index === 0}
                        className="rounded border border-gray-200 px-2 py-1 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="아래로"
                        onClick={() => moveBlock(index, 1)}
                        disabled={index === blocks.length - 1}
                        className="rounded border border-gray-200 px-2 py-1 disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        aria-label="블록 삭제"
                        onClick={() => removeBlock(index)}
                        className="rounded border border-gray-200 px-2 py-1 text-danger-a11y"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                <BlockEditor
                  block={block}
                  onChange={(b) => updateBlock(index, b)}
                  readOnly={readOnly}
                />
              </div>
            ))}

            {!readOnly && (
              <div className="flex flex-wrap gap-2">
                {(Object.keys(NEWSLETTER_BLOCK_LABELS) as Array<NewsletterBlock['type']>).map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addBlock(type)}
                      className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-charcoal-muted hover:border-primary hover:text-primary-strong"
                    >
                      + {NEWSLETTER_BLOCK_LABELS[type]}
                    </button>
                  )
                )}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <PreviewPane
            issueNo={initial.issue_no}
            title={title}
            preheader={preheader}
            isAdvertisement={isAdvertisement}
            blocks={blocks}
          />
          <SendPanel
            newsletterId={initial.id}
            status={initial.status}
            scheduledAt={initial.scheduled_at}
            slug={initial.slug}
            initialChannels={initial.audience_channels}
            dirty={dirty}
          />
        </div>
      </div>
    </div>
  );
}
