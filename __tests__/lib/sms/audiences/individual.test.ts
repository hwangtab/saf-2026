/** @jest-environment node */
import { resolveIndividualSmsRecipients } from '@/lib/sms/audiences/individual';
import { hashPhone } from '@/lib/sms/phone-hash';

function supabaseStub(suppressed: string[]) {
  return {
    from: () => ({
      select: () => ({
        in: () =>
          Promise.resolve({
            data: suppressed.map((p) => ({ phone_hash: hashPhone(p) })),
            error: null,
          }),
      }),
    }),
  } as unknown as Parameters<typeof resolveIndividualSmsRecipients>[2];
}

describe('resolveIndividualSmsRecipients', () => {
  it('정규화·중복제거하고 비-010은 제외', async () => {
    const rows = await resolveIndividualSmsRecipients(
      [
        { phone: '010-1234-5678', name: 'A' },
        { phone: '01012345678', name: 'A-dup' }, // 동일 번호 중복
        { phone: '02-123-4567', name: 'B' }, // 비-010
      ],
      false,
      supabaseStub([])
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ phone: '01012345678', name: 'A', status: 'pending' });
  });

  it('광고면 customer 채널 수신거부도 차감', async () => {
    const rows = await resolveIndividualSmsRecipients(
      [{ phone: '01011112222', name: 'X' }],
      true,
      supabaseStub(['01011112222'])
    );
    expect(rows).toHaveLength(0);
  });
});
