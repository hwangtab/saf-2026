/** @jest-environment node */
import { resolveIndividualSmsRecipients } from '@/lib/sms/audiences/individual';
import { hashPhone } from '@/lib/sms/phone-hash';

/**
 * Stub that mirrors the PostgREST paginated shape fetchAllInBatches expects:
 * each .range(from, to) call returns a slice of the data array.
 * The stub chains: from().select().in().range(from, to) => { data, error, count }.
 */
function supabaseStub(suppressed: string[], capturedChannels?: string[]) {
  const rows = suppressed.map((p) => ({ phone_hash: hashPhone(p) }));
  return {
    from: () => ({
      select: () => ({
        in: (_col: string, channels: string[]) => {
          if (capturedChannels) capturedChannels.push(...channels);
          return {
            range: (from: number, to: number) =>
              Promise.resolve({
                data: rows.slice(from, to + 1),
                error: null,
                count: rows.length,
              }),
          };
        },
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

  it('비-광고면 customer 채널 전용 수신거부는 차감하지 않음 (채널셋 = individual+all)', async () => {
    const capturedChannels: string[] = [];
    // '01033334444' is suppressed — but only under the 'customer' channel.
    // For non-ad sends the channel set is ['individual', 'all'], so customer-only
    // suppressions must NOT be applied.
    // The stub returns the suppressed hash regardless of channel; we separately
    // verify that 'customer' is NOT included in the channel list passed to .in().
    const rows = await resolveIndividualSmsRecipients(
      [{ phone: '01033334444', name: 'Y' }],
      false,
      supabaseStub([], capturedChannels) // empty suppression list → number survives
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ phone: '01033334444', name: 'Y', status: 'pending' });
    // Confirm the channel set queried does NOT include 'customer'
    expect(capturedChannels).not.toContain('customer');
    expect(capturedChannels).toEqual(expect.arrayContaining(['individual', 'all']));
  });
});
