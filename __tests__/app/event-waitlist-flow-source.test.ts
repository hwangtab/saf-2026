import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('event waitlist and locale payment flow source guards', () => {
  it('대기자 안내는 기존 행을 pending으로 승격하고 eventOrderNo 링크를 발송한다', () => {
    const action = read('app/actions/event-admin.ts');
    const migration = read('supabase/migrations/20260614160000_event_waitlist_promotion.sql');

    expect(action).toContain("'promote_waitlist_event_registration'");
    expect(action).toContain('eventOrderNo=');
    expect(action).toContain('resumeEventPayment');
    expect(action).toContain('const smsResult = await sendEventSms');
    expect(action).toContain("status: 'waitlist'");
    expect(action).toContain('order_no: null');
    expect(migration).toContain("v_reg.status <> 'waitlist'");
    expect(migration).toContain("SET status = 'pending'");
  });

  it('행사 결제 URL은 현재 locale을 반영한다', () => {
    const form = read('app/[locale]/event/oh-yoon-memorial/_components/RegistrationForm.tsx');

    expect(form).toContain("const localePrefix = locale === 'en' ? '/en' : ''");
    expect(form).toContain('${localePrefix}/event/oh-yoon-memorial/success');
    expect(form).toContain('${localePrefix}/event/oh-yoon-memorial/fail');
  });

  it('행사 결제 성공 랜딩은 자동환불과 수동확인 상태를 구분한다', () => {
    const successClient = read('app/[locale]/event/oh-yoon-memorial/success/SuccessClient.tsx');

    expect(successClient).toContain("data.error === 'sold_out_refunded'");
    expect(successClient).toContain("data.error === 'confirm_failed_refunded'");
    expect(successClient).toContain("data.error === 'auto_refund_failed'");
    expect(successClient).toContain("state === 'manualReview'");
  });

  it('행사 결제 실패 랜딩은 pending 좌석 hold를 정리한다', () => {
    const failClient = read('app/[locale]/event/oh-yoon-memorial/fail/FailClient.tsx');
    const action = read('app/actions/event-admin.ts');

    expect(failClient).toContain('new URLSearchParams(window.location.search)');
    expect(failClient).toContain("sp.get('orderId')");
    expect(failClient).toContain("sp.get('code')");
    expect(failClient).toContain('cancelEventPendingPayment(orderId, code)');
    expect(action).toContain('export async function cancelEventPendingPayment');
    expect(action).toContain(".eq('status', 'pending')");
    expect(action).toContain('hold_expires_at: null');
  });

  it('공개 신청 서버 액션은 타입 이름을 런타임 export 표면에 노출하지 않는다', () => {
    const action = read('app/actions/event-registration.ts');

    expect(action).not.toContain('export type { RegisterEventInput }');
    expect(action).not.toContain('registerEvent(input: RegisterEventInput)');
    expect(action).toContain('export async function registerEvent(input: unknown)');
    expect(action).toContain('normalizeRegisterEventInput');
  });

  it('대기자 결제 재개 액션은 공개 호출 실패를 응답으로 처리한다', () => {
    const action = read('app/actions/event-admin.ts');

    expect(action).not.toContain('export interface EventAdminResult');
    expect(action).toContain('export async function resumeEventPayment');
    expect(action).toContain("console.error('[event-admin] resume payment error:', e)");
    expect(action).toContain("message: '결제 정보를 확인할 수 없습니다.'");
  });

  it('확정자는 단순 취소가 아니라 환불 취소 액션을 사용한다', () => {
    const adminClient = read(
      'app/(portal)/admin/event/oh-yoon-memorial/_components/EventAdminClient.tsx'
    );
    const action = read('app/actions/event-admin.ts');

    expect(adminClient).toContain('refundConfirmedRegistration');
    expect(adminClient).toContain('환불취소');
    expect(adminClient).toContain("setNotice('요청 처리 중 오류가 발생했습니다.')");
    expect(action).toContain("in('status', ['pending', 'waitlist'])");
    expect(action).toContain('cancelPayment(');
    expect(action).toContain("console.error('[event-admin] refund toss cancel error:', e)");
  });
});
