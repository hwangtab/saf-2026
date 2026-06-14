'use client';

import { useMemo, useState, useTransition } from 'react';
import Button from '@/components/ui/Button';
import {
  cancelRegistration,
  refundConfirmedRegistration,
  sendWaitlistPaymentLink,
  updateCapacity,
  exportConfirmedCsv,
} from '@/app/actions/event-admin';

export interface SeatStatus {
  found: boolean;
  capacity: number;
  occupied: number;
  remaining: number;
  is_open: boolean;
  fee_per_person: number;
}

export interface EventRegistrationRow {
  id: string;
  applicant_name: string;
  phone: string;
  email: string | null;
  party_size: number;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: '결제대기',
  confirmed: '확정',
  waitlist: '대기',
  cancelled: '취소',
  expired: '만료',
};

function won(n: number) {
  return n.toLocaleString('ko-KR');
}

export default function EventAdminClient({
  seat,
  registrations,
  capacity,
}: {
  seat: SeatStatus | null;
  registrations: EventRegistrationRow[];
  capacity: number;
}) {
  const [pending, startTransition] = useTransition();
  const [capacityInput, setCapacityInput] = useState(String(capacity));
  const [notice, setNotice] = useState<string | null>(null);

  const confirmed = useMemo(
    () => registrations.filter((r) => r.status === 'confirmed'),
    [registrations]
  );
  const waitlist = useMemo(
    () => registrations.filter((r) => r.status === 'waitlist'),
    [registrations]
  );
  const confirmedSeats = confirmed.reduce((s, r) => s + r.party_size, 0);
  const totalFee = confirmed.reduce((s, r) => s + r.amount, 0);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>, okMsg: string) {
    startTransition(async () => {
      try {
        const res = await fn();
        setNotice(res.ok ? okMsg : (res.message ?? '실패'));
      } catch {
        setNotice('요청 처리 중 오류가 발생했습니다.');
      }
    });
  }

  function downloadCsv() {
    startTransition(async () => {
      const res = await exportConfirmedCsv();
      if (!res.ok || !res.csv) {
        setNotice('CSV 생성 실패');
        return;
      }
      const blob = new Blob(['﻿' + res.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'oh-yoon-memorial-confirmed.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-bold text-charcoal-deep">오윤 40주기 추도식 신청 운영</h1>
        {notice && (
          <output className="mt-2 block rounded-lg bg-canvas px-4 py-2 text-sm text-charcoal">
            {notice}
          </output>
        )}
      </header>

      {/* 개요 */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="정원" value={`${seat?.capacity ?? capacity}석`} />
        <Stat label="확정 좌석" value={`${confirmedSeats}석`} />
        <Stat label="잔여석" value={`${seat?.remaining ?? 0}석`} />
        <Stat label="총 회비" value={`${won(totalFee)}원`} />
      </section>

      {/* 정원 조정 + CSV */}
      <section className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label htmlFor="cap" className="mb-1 block text-sm font-semibold text-charcoal-deep">
            정원 조정
          </label>
          <input
            id="cap"
            type="number"
            min={0}
            value={capacityInput}
            onChange={(e) => setCapacityInput(e.target.value)}
            className="w-28 rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <Button
          variant="primary"
          disabled={pending}
          onClick={() => run(() => updateCapacity(Number(capacityInput)), '정원이 변경되었습니다')}
        >
          정원 저장
        </Button>
        <Button variant="secondary" disabled={pending} onClick={downloadCsv}>
          확정자 CSV 내려받기
        </Button>
      </section>

      {/* 참가자 */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-charcoal-deep">
          참가자 ({registrations.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-canvas text-left text-charcoal-muted">
              <tr>
                <th className="px-3 py-2">이름</th>
                <th className="px-3 py-2">연락처</th>
                <th className="px-3 py-2">인원</th>
                <th className="px-3 py-2">회비</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">작업</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{r.applicant_name}</td>
                  <td className="px-3 py-2">
                    {r.phone}
                    {r.email ? <span className="block text-charcoal-muted">{r.email}</span> : null}
                  </td>
                  <td className="px-3 py-2">{r.party_size}</td>
                  <td className="px-3 py-2">{won(r.amount)}</td>
                  <td className="px-3 py-2">{STATUS_LABEL[r.status] ?? r.status}</td>
                  <td className="px-3 py-2">
                    {r.status === 'waitlist' && (
                      <button
                        type="button"
                        disabled={pending}
                        className="mr-2 text-primary-strong underline"
                        onClick={() =>
                          run(
                            () => sendWaitlistPaymentLink(r.id, '15분 이내'),
                            '결제 안내를 발송했습니다'
                          )
                        }
                      >
                        결제안내
                      </button>
                    )}
                    {r.status === 'confirmed' && (
                      <button
                        type="button"
                        disabled={pending}
                        className="text-danger underline"
                        onClick={() => {
                          if (!window.confirm('토스 환불 후 참가 신청을 취소할까요?')) return;
                          run(() => refundConfirmedRegistration(r.id), '환불 취소되었습니다');
                        }}
                      >
                        환불취소
                      </button>
                    )}
                    {(r.status === 'waitlist' || r.status === 'pending') && (
                      <button
                        type="button"
                        disabled={pending}
                        className="text-danger underline"
                        onClick={() => run(() => cancelRegistration(r.id), '취소되었습니다')}
                      >
                        취소
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {registrations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-charcoal-muted">
                    아직 신청자가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-charcoal-muted">
          대기 {waitlist.length}명 · 확정 {confirmed.length}건
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-charcoal-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-charcoal-deep">{value}</p>
    </div>
  );
}
