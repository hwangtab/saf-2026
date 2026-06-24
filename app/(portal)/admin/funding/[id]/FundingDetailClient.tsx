'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import {
  updateFundingProject,
  createRewardTier,
  updateRewardTier,
  deleteRewardTier,
  refundFundingPledge,
  updateFulfillment,
} from '@/app/actions/admin-funding';

// ─── Prop types (explicit — mirrors selected DB columns) ───────────────────

export interface FundingProject {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  story: string | null;
  cover_image: string | null;
  goal_amount: number;
  status: string;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RewardTier {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  amount: number;
  total_quantity: number | null;
  requires_shipping: boolean;
  reward_kind: string;
  image_url: string | null;
  estimated_delivery: string | null;
  sort_order: number;
}

export interface FundingPledge {
  id: string;
  order_no: string | null;
  backer_name: string | null;
  backer_email: string | null;
  backer_phone: string | null;
  total_amount: number;
  status: string;
  fulfillment_status: string | null;
  tracking_company: string | null;
  tracking_number: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_postal_code: string | null;
  shipping_memo: string | null;
  is_anonymous: boolean;
  supporter_message: string | null;
  paid_at: string | null;
  created_at: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function won(n: number) {
  return n.toLocaleString('ko-KR');
}

const FULFILLMENT_LABEL: Record<string, string> = {
  none: '미발송',
  preparing: '준비중',
  shipped: '발송완료',
  delivered: '배달완료',
};

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  active: '모집중',
  closed: '마감',
  settled: '정산완료',
};

const PLEDGE_STATUS_LABEL: Record<string, string> = {
  pending: '결제대기',
  paid: '결제완료',
  refunded: '환불완료',
  cancelled: '취소',
};

const INPUT_CLASS =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary';
const LABEL_CLASS = 'mb-1 block text-sm font-semibold text-charcoal-deep';

// ─── Section 1: 프로젝트 수정 ──────────────────────────────────────────────

function ProjectEditSection({ project }: { project: FundingProject }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const [title, setTitle] = useState(project.title);
  const [summary, setSummary] = useState(project.summary ?? '');
  const [story, setStory] = useState(project.story ?? '');
  const [goalAmount, setGoalAmount] = useState(String(project.goal_amount));
  const [coverImage, setCoverImage] = useState(project.cover_image ?? '');
  const [startAt, setStartAt] = useState(project.start_at ? project.start_at.slice(0, 16) : '');
  const [endAt, setEndAt] = useState(project.end_at ? project.end_at.slice(0, 16) : '');
  const [status, setStatus] = useState(project.status);

  function handleSave() {
    startTransition(async () => {
      const res = await updateFundingProject(project.id, {
        title: title.trim(),
        summary: summary.trim() || undefined,
        story: story.trim() || undefined,
        goal_amount: Number(goalAmount),
        cover_image: coverImage.trim() || undefined,
        start_at: startAt || undefined,
        end_at: endAt || undefined,
        status,
      });
      if (res.ok) {
        setIsError(false);
        setNotice('저장되었습니다.');
        router.refresh();
      } else {
        setIsError(true);
        if (res.error === 'STATUS_REGRESSION') {
          setNotice('상태는 뒤로 되돌릴 수 없습니다 (초안 → 모집중 → 마감 → 정산완료).');
        } else {
          setNotice(`오류: ${res.error ?? '알 수 없는 오류'}`);
        }
      }
    });
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-bold text-charcoal-deep">프로젝트 수정</h2>
      {notice && (
        <output
          className={`mb-4 block rounded-lg px-4 py-2 text-sm ${isError ? 'bg-danger/10 text-danger' : 'bg-canvas text-charcoal'}`}
        >
          {notice}
        </output>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="proj-title" className={LABEL_CLASS}>
            제목
          </label>
          <input
            id="proj-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${INPUT_CLASS} w-full`}
          />
        </div>
        <div>
          <label htmlFor="proj-status" className={LABEL_CLASS}>
            상태
          </label>
          <select
            id="proj-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${INPUT_CLASS} w-full`}
          >
            {(['draft', 'active', 'closed', 'settled'] as const).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="proj-goal" className={LABEL_CLASS}>
            목표 금액 (원)
          </label>
          <input
            id="proj-goal"
            type="number"
            min={0}
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value)}
            className={`${INPUT_CLASS} w-full`}
          />
        </div>
        <div>
          <label htmlFor="proj-cover" className={LABEL_CLASS}>
            커버 이미지 URL
          </label>
          <input
            id="proj-cover"
            type="text"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            className={`${INPUT_CLASS} w-full`}
          />
        </div>
        <div>
          <label htmlFor="proj-start" className={LABEL_CLASS}>
            시작일시
          </label>
          <input
            id="proj-start"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className={`${INPUT_CLASS} w-full`}
          />
        </div>
        <div>
          <label htmlFor="proj-end" className={LABEL_CLASS}>
            종료일시
          </label>
          <input
            id="proj-end"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className={`${INPUT_CLASS} w-full`}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="proj-summary" className={LABEL_CLASS}>
            한줄 요약
          </label>
          <input
            id="proj-summary"
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className={`${INPUT_CLASS} w-full`}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="proj-story" className={LABEL_CLASS}>
            스토리 (마크다운)
          </label>
          <textarea
            id="proj-story"
            rows={6}
            value={story}
            onChange={(e) => setStory(e.target.value)}
            className={`${INPUT_CLASS} w-full`}
          />
        </div>
      </div>
      <div className="mt-4">
        <Button variant="primary" disabled={pending} onClick={handleSave}>
          {pending ? '저장 중…' : '저장'}
        </Button>
      </div>
    </section>
  );
}

// ─── Section 2: 리워드 티어 ────────────────────────────────────────────────

interface TierRowProps {
  tier: RewardTier;
  onRefresh: () => void;
}

function TierRow({ tier, onRefresh }: TierRowProps) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  // editable state
  const [title, setTitle] = useState(tier.title);
  const [amount, setAmount] = useState(String(tier.amount));
  const [totalQty, setTotalQty] = useState(
    tier.total_quantity != null ? String(tier.total_quantity) : ''
  );
  const [requiresShipping, setRequiresShipping] = useState(tier.requires_shipping);
  const [rewardKind, setRewardKind] = useState(tier.reward_kind);
  const [sortOrder, setSortOrder] = useState(String(tier.sort_order));

  function handleSave() {
    startTransition(async () => {
      const res = await updateRewardTier(tier.id, {
        title: title.trim(),
        amount: Number(amount),
        total_quantity: totalQty ? Number(totalQty) : null,
        requires_shipping: requiresShipping,
        reward_kind: rewardKind,
        sort_order: Number(sortOrder),
      });
      if (res.ok) {
        setIsError(false);
        setNotice('저장되었습니다.');
        setEditing(false);
        onRefresh();
      } else {
        setIsError(true);
        setNotice(`오류: ${res.error ?? '알 수 없는 오류'}`);
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`"${tier.title}" 티어를 삭제할까요?`)) return;
    startTransition(async () => {
      const res = await deleteRewardTier(tier.id);
      if (res.ok) {
        onRefresh();
      } else if (res.error === 'TIER_HAS_PLEDGES') {
        setIsError(true);
        setNotice('결제된 후원이 있어 삭제할 수 없습니다.');
      } else {
        setIsError(true);
        setNotice(`오류: ${res.error ?? '알 수 없는 오류'}`);
      }
    });
  }

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4">
      {notice && (
        <output
          className={`mb-3 block rounded-lg px-3 py-1.5 text-sm ${isError ? 'bg-danger/10 text-danger' : 'bg-canvas text-charcoal'}`}
        >
          {notice}
        </output>
      )}
      {editing ? (
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label htmlFor={`tier-title-${tier.id}`} className={LABEL_CLASS}>
              티어명
            </label>
            <input
              id={`tier-title-${tier.id}`}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${INPUT_CLASS} w-full`}
            />
          </div>
          <div>
            <label htmlFor={`tier-amount-${tier.id}`} className={LABEL_CLASS}>
              금액 (원)
            </label>
            <input
              id={`tier-amount-${tier.id}`}
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${INPUT_CLASS} w-full`}
            />
          </div>
          <div>
            <label htmlFor={`tier-qty-${tier.id}`} className={LABEL_CLASS}>
              수량 한도
            </label>
            <input
              id={`tier-qty-${tier.id}`}
              type="number"
              min={0}
              value={totalQty}
              onChange={(e) => setTotalQty(e.target.value)}
              placeholder="무제한"
              className={`${INPUT_CLASS} w-full`}
            />
          </div>
          <div>
            <label htmlFor={`tier-kind-${tier.id}`} className={LABEL_CLASS}>
              리워드 종류
            </label>
            <input
              id={`tier-kind-${tier.id}`}
              type="text"
              value={rewardKind}
              onChange={(e) => setRewardKind(e.target.value)}
              className={`${INPUT_CLASS} w-full`}
            />
          </div>
          <div>
            <label htmlFor={`tier-sort-${tier.id}`} className={LABEL_CLASS}>
              정렬 순서
            </label>
            <input
              id={`tier-sort-${tier.id}`}
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className={`${INPUT_CLASS} w-full`}
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-charcoal">
              <input
                type="checkbox"
                checked={requiresShipping}
                onChange={(e) => setRequiresShipping(e.target.checked)}
                className="h-4 w-4"
              />
              배송 필요
            </label>
          </div>
          <div className="flex items-end gap-2 md:col-span-3">
            <Button variant="primary" disabled={pending} onClick={handleSave}>
              저장
            </Button>
            <button
              type="button"
              disabled={pending}
              className="text-sm text-charcoal-muted underline"
              onClick={() => {
                setEditing(false);
                setNotice(null);
              }}
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-charcoal-deep">{tier.title}</p>
            <p className="text-sm text-charcoal-muted">
              {won(tier.amount)}원
              {tier.total_quantity != null ? ` · 한도 ${tier.total_quantity}개` : ' · 무제한'}
              {tier.requires_shipping ? ' · 배송' : ''} · 순서 {tier.sort_order}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="text-sm text-primary-strong underline"
              onClick={() => setEditing(true)}
            >
              수정
            </button>
            <button
              type="button"
              disabled={pending}
              className="text-sm text-danger underline"
              onClick={handleDelete}
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function TierSection({ projectId, tiers }: { projectId: string; tiers: RewardTier[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newTotalQty, setNewTotalQty] = useState('');
  const [newRequiresShipping, setNewRequiresShipping] = useState(false);
  const [newRewardKind, setNewRewardKind] = useState('goods');
  const [newSortOrder, setNewSortOrder] = useState('0');

  function handleCreate() {
    if (!newTitle.trim() || !newAmount) return;
    startTransition(async () => {
      const res = await createRewardTier({
        project_id: projectId,
        title: newTitle.trim(),
        amount: Number(newAmount),
        total_quantity: newTotalQty ? Number(newTotalQty) : null,
        requires_shipping: newRequiresShipping,
        reward_kind: newRewardKind,
        sort_order: Number(newSortOrder),
      });
      if (res.ok) {
        setIsError(false);
        setNotice('티어가 추가되었습니다.');
        setNewTitle('');
        setNewAmount('');
        setNewTotalQty('');
        setNewRequiresShipping(false);
        setNewRewardKind('goods');
        setNewSortOrder('0');
        router.refresh();
      } else {
        setIsError(true);
        setNotice(`오류: ${res.error ?? '알 수 없는 오류'}`);
      }
    });
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-bold text-charcoal-deep">리워드 티어</h2>
      <ul className="mb-6 space-y-3">
        {tiers.map((tier) => (
          <TierRow key={tier.id} tier={tier} onRefresh={() => router.refresh()} />
        ))}
        {tiers.length === 0 && (
          <li className="rounded-lg border border-gray-200 px-4 py-6 text-center text-sm text-charcoal-muted">
            등록된 티어가 없습니다.
          </li>
        )}
      </ul>

      {/* 새 티어 추가 */}
      <div className="rounded-lg border border-gray-200 bg-canvas p-4">
        <h3 className="mb-3 text-sm font-bold text-charcoal-deep">새 티어 추가</h3>
        {notice && (
          <output
            className={`mb-3 block rounded-lg px-3 py-1.5 text-sm ${isError ? 'bg-danger/10 text-danger' : 'bg-white text-charcoal'}`}
          >
            {notice}
          </output>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label htmlFor="new-tier-title" className={LABEL_CLASS}>
              티어명 *
            </label>
            <input
              id="new-tier-title"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className={`${INPUT_CLASS} w-full`}
            />
          </div>
          <div>
            <label htmlFor="new-tier-amount" className={LABEL_CLASS}>
              금액 (원) *
            </label>
            <input
              id="new-tier-amount"
              type="number"
              min={0}
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className={`${INPUT_CLASS} w-full`}
            />
          </div>
          <div>
            <label htmlFor="new-tier-qty" className={LABEL_CLASS}>
              수량 한도
            </label>
            <input
              id="new-tier-qty"
              type="number"
              min={0}
              value={newTotalQty}
              onChange={(e) => setNewTotalQty(e.target.value)}
              placeholder="무제한"
              className={`${INPUT_CLASS} w-full`}
            />
          </div>
          <div>
            <label htmlFor="new-tier-kind" className={LABEL_CLASS}>
              리워드 종류
            </label>
            <input
              id="new-tier-kind"
              type="text"
              value={newRewardKind}
              onChange={(e) => setNewRewardKind(e.target.value)}
              className={`${INPUT_CLASS} w-full`}
            />
          </div>
          <div>
            <label htmlFor="new-tier-sort" className={LABEL_CLASS}>
              정렬 순서
            </label>
            <input
              id="new-tier-sort"
              type="number"
              value={newSortOrder}
              onChange={(e) => setNewSortOrder(e.target.value)}
              className={`${INPUT_CLASS} w-full`}
            />
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-charcoal">
              <input
                type="checkbox"
                checked={newRequiresShipping}
                onChange={(e) => setNewRequiresShipping(e.target.checked)}
                className="h-4 w-4"
              />
              배송 필요
            </label>
          </div>
        </div>
        <div className="mt-3">
          <Button
            variant="primary"
            disabled={pending || !newTitle.trim() || !newAmount}
            onClick={handleCreate}
          >
            {pending ? '추가 중…' : '티어 추가'}
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── Section 3: 후원자 명단 ────────────────────────────────────────────────

interface PledgeRowProps {
  pledge: FundingPledge;
  onRefresh: () => void;
}

function PledgeRow({ pledge, onRefresh }: PledgeRowProps) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [fulfillStatus, setFulfillStatus] = useState(pledge.fulfillment_status ?? 'none');
  const [trackingCompany, setTrackingCompany] = useState(pledge.tracking_company ?? '');
  const [trackingNumber, setTrackingNumber] = useState(pledge.tracking_number ?? '');

  function handleRefund() {
    if (
      !window.confirm(
        `${pledge.backer_name ?? '(익명)'}님의 후원을 환불할까요? 이 작업은 되돌릴 수 없습니다.`
      )
    )
      return;
    startTransition(async () => {
      const res = await refundFundingPledge(pledge.id);
      if (res.ok) {
        setIsError(false);
        setNotice('환불되었습니다.');
        onRefresh();
      } else {
        setIsError(true);
        setNotice(`환불 실패: ${res.error ?? '알 수 없는 오류'}`);
      }
    });
  }

  function handleFulfillment() {
    startTransition(async () => {
      const res = await updateFulfillment(
        pledge.id,
        fulfillStatus,
        trackingCompany.trim() || undefined,
        trackingNumber.trim() || undefined
      );
      if (res.ok) {
        setIsError(false);
        setNotice('발송 상태가 저장되었습니다.');
        onRefresh();
      } else {
        setIsError(true);
        setNotice(`오류: ${res.error ?? '알 수 없는 오류'}`);
      }
    });
  }

  const shippingText = [pledge.shipping_name, pledge.shipping_address, pledge.shipping_postal_code]
    .filter(Boolean)
    .join(' · ');

  return (
    <tr className="border-t border-gray-100">
      <td className="px-3 py-2 text-sm">
        <p className="font-medium text-charcoal-deep">
          {pledge.is_anonymous ? '(익명)' : (pledge.backer_name ?? '-')}
        </p>
        <p className="text-charcoal-muted">{pledge.backer_email ?? ''}</p>
        <p className="text-charcoal-muted">{pledge.backer_phone ?? ''}</p>
      </td>
      <td className="px-3 py-2 text-sm text-charcoal">{won(pledge.total_amount)}원</td>
      <td className="px-3 py-2 text-sm">
        <span className={pledge.status === 'paid' ? 'text-success-a11y' : 'text-charcoal-muted'}>
          {PLEDGE_STATUS_LABEL[pledge.status] ?? pledge.status}
        </span>
      </td>
      <td className="max-w-[180px] px-3 py-2 text-xs text-charcoal-muted">
        {shippingText || '-'}
        {pledge.shipping_memo ? <span className="block">{pledge.shipping_memo}</span> : null}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="발송 상태"
            value={fulfillStatus}
            onChange={(e) => setFulfillStatus(e.target.value)}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-charcoal focus:outline-none"
          >
            {(['none', 'preparing', 'shipped', 'delivered'] as const).map((s) => (
              <option key={s} value={s}>
                {FULFILLMENT_LABEL[s]}
              </option>
            ))}
          </select>
          <input
            type="text"
            aria-label="택배사"
            value={trackingCompany}
            onChange={(e) => setTrackingCompany(e.target.value)}
            placeholder="택배사"
            className="w-20 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-charcoal focus:outline-none"
          />
          <input
            type="text"
            aria-label="송장번호"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="송장번호"
            className="w-28 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-charcoal focus:outline-none"
          />
          <button
            type="button"
            disabled={pending}
            className="text-xs text-primary-strong underline"
            onClick={handleFulfillment}
          >
            저장
          </button>
        </div>
        {notice && (
          <output className={`mt-1 block text-xs ${isError ? 'text-danger' : 'text-success-a11y'}`}>
            {notice}
          </output>
        )}
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          disabled={pending || pledge.status !== 'paid'}
          className={`text-sm underline ${pledge.status === 'paid' ? 'text-danger' : 'cursor-not-allowed text-charcoal-soft'}`}
          onClick={handleRefund}
        >
          환불
        </button>
      </td>
    </tr>
  );
}

function BackersSection({ pledges }: { pledges: FundingPledge[] }) {
  const router = useRouter();

  function downloadCsv() {
    const headers = ['이름', '이메일', '전화', '금액', '상태', '배송지', '발송상태', '송장'];
    const rows = pledges.map((p) => [
      p.is_anonymous ? '(익명)' : (p.backer_name ?? ''),
      p.backer_email ?? '',
      p.backer_phone ?? '',
      String(p.total_amount),
      PLEDGE_STATUS_LABEL[p.status] ?? p.status,
      [p.shipping_name, p.shipping_address, p.shipping_postal_code].filter(Boolean).join(' '),
      FULFILLMENT_LABEL[p.fulfillment_status ?? 'none'] ?? p.fulfillment_status ?? '',
      [p.tracking_company, p.tracking_number].filter(Boolean).join(' '),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'funding-backers.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-charcoal-deep">후원자 명단 ({pledges.length})</h2>
        <Button variant="secondary" onClick={downloadCsv}>
          CSV 내보내기
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-left text-charcoal-muted">
            <tr>
              <th className="px-3 py-2">이름 / 연락처</th>
              <th className="px-3 py-2">금액</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">배송지</th>
              <th className="px-3 py-2">발송 상태 / 송장</th>
              <th className="px-3 py-2">액션</th>
            </tr>
          </thead>
          <tbody>
            {pledges.map((pledge) => (
              <PledgeRow key={pledge.id} pledge={pledge} onRefresh={() => router.refresh()} />
            ))}
            {pledges.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-charcoal-muted">
                  후원자가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Root Client Component ─────────────────────────────────────────────────

export default function FundingDetailClient({
  project,
  tiers,
  pledges,
}: {
  project: FundingProject;
  tiers: RewardTier[];
  pledges: FundingPledge[];
}) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-charcoal-deep">{project.title}</h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          상태: {STATUS_LABEL[project.status] ?? project.status} · 목표: {won(project.goal_amount)}
          원
        </p>
      </header>
      <ProjectEditSection project={project} />
      <TierSection projectId={project.id} tiers={tiers} />
      <BackersSection pledges={pledges} />
    </div>
  );
}
