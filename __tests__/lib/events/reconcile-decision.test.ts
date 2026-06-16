import { planEventReconcile, interpretConfirmCode } from '@/lib/events/reconcile-decision';

describe('planEventReconcile', () => {
  it('pending + Toss DONE → confirm', () => {
    expect(planEventReconcile('pending', 'DONE')).toBe('confirm');
  });

  it('expired + Toss DONE → refund (confirm RPC가 expired는 처리 못 하므로 환불)', () => {
    expect(planEventReconcile('expired', 'DONE')).toBe('refund');
  });

  it('이미 종결된 상태(confirmed/cancelled)는 DONE이어도 skip', () => {
    expect(planEventReconcile('confirmed', 'DONE')).toBe('skip');
    expect(planEventReconcile('cancelled', 'DONE')).toBe('skip');
    expect(planEventReconcile('waitlist', 'DONE')).toBe('skip');
  });

  it('Toss가 DONE이 아니면(미캡처/이미환불) 무조건 skip — 자가 치유', () => {
    expect(planEventReconcile('pending', null)).toBe('skip');
    expect(planEventReconcile('pending', 'CANCELED')).toBe('skip');
    expect(planEventReconcile('expired', 'WAITING_FOR_DEPOSIT')).toBe('skip');
    expect(planEventReconcile('expired', 'ABORTED')).toBe('skip');
  });
});

describe('interpretConfirmCode', () => {
  it('CONFIRMED → confirmed', () => {
    expect(interpretConfirmCode('CONFIRMED')).toBe('confirmed');
  });

  it('ALREADY_CONFIRMED → noop (경합 멱등)', () => {
    expect(interpretConfirmCode('ALREADY_CONFIRMED')).toBe('noop');
  });

  it('SOLD_OUT → refund', () => {
    expect(interpretConfirmCode('SOLD_OUT')).toBe('refund');
  });

  it('비정상 코드·undefined → alert (자동 처리 금지)', () => {
    expect(interpretConfirmCode('NOT_FOUND')).toBe('alert');
    expect(interpretConfirmCode('AMOUNT_MISMATCH')).toBe('alert');
    expect(interpretConfirmCode('INVALID_STATE')).toBe('alert');
    expect(interpretConfirmCode(undefined)).toBe('alert');
  });
});
