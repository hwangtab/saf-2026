import type { AdminCounts } from './types';

interface MailTabProps {
  counts: AdminCounts;
}

/**
 * v1에서는 영수증 메일만 자동 발송 (서명 직후, fire-and-forget).
 * 일괄 발송 UI(D-1 안내·결과 통지·추진위원 안내)는 v2에서 구현.
 * 그 전까지 운영자는 Resend 대시보드 또는 ad-hoc 스크립트로 발송한다.
 */
export default function MailTab({ counts }: MailTabProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="font-semibold text-charcoal-deep mb-2">자동 발송 (v1)</h2>
        <ul className="space-y-1 text-sm text-charcoal break-keep">
          <li>
            · <strong>서명 직후 영수증</strong> — 본인에게 즉시 1통 (Resend, fire-and-forget)
          </li>
          <li>
            · <strong>마일스톤 알림</strong> — 추후 운영자 메일/Slack 자동 발송 (이상 신호 탐지
            §10.7.10)
          </li>
        </ul>
      </section>

      <section className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <h2 className="font-semibold text-charcoal-deep mb-2">일괄 발송 — v2 예정</h2>
        <p className="text-sm text-charcoal-muted break-keep mb-3">
          PRD §10.7.6에 정의된 일괄 발송 UI(미리보기·테스트 발송·발송 큐)는 v2에서 구현됩니다. v1
          운영 동안에는 Resend 대시보드 또는 ad-hoc 스크립트로 발송합니다.
        </p>
        <ul className="space-y-1 text-sm text-charcoal-muted break-keep">
          <li>
            · 마감 D-1 안내 — 전체 서명자 대상 (예상 {counts.total.toLocaleString('ko-KR')}명)
          </li>
          <li>· 결과 발표 통지 — 전체 서명자 대상</li>
          <li>
            · 추진위 발족식 안내 — 추진위원 한정 ({counts.committee_total.toLocaleString('ko-KR')}
            명)
          </li>
        </ul>
      </section>

      <p className="text-xs text-charcoal-muted break-keep">
        모든 일괄 발송은 v2 구현 시 감사 로그 액션
        <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 text-[10px]">mail_send_*</code>에 자동
        기록됩니다.
      </p>
    </div>
  );
}
