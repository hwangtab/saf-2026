import { enqueueIndividualBroadcast } from '@/app/actions/admin-broadcast';
import { createSupabaseQueryMock } from '@/lib/test-utils/email-audience-mock';

const mockFrom = jest.fn();
const insertedRecipients: unknown[] = [];
let emailBroadcastsCalls = 0;

jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: jest.fn(async () => ({ id: 'admin-1' })),
  requireAdminClient: jest.fn(async () => ({ from: mockFrom })),
}));
jest.mock('@/app/actions/activity-log-writer', () => ({ logAdminAction: jest.fn(async () => {}) }));

describe('enqueueIndividualBroadcast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    insertedRecipients.length = 0;
    emailBroadcastsCalls = 0;
  });

  it('individual+all suppression 수신자를 제외하고 큐에 등록한다', async () => {
    const { hashEmail } = jest.requireActual('@/lib/email/email-hash') as {
      hashEmail: (e: string) => string;
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'email_suppressions')
        return createSupabaseQueryMock({
          data: [{ email_hash: hashEmail('block@x.com') }],
          error: null,
        });
      if (table === 'email_broadcasts') {
        emailBroadcastsCalls += 1;
        // 1st call = idempotency .maybeSingle() lookup → no existing row; 2nd = insert().select().single() → new id
        return createSupabaseQueryMock({
          data: emailBroadcastsCalls === 1 ? null : { id: 'bc-1' },
          error: null,
        }) as never;
      }
      if (table === 'email_broadcast_recipients') {
        return {
          insert: (rows: unknown[]) => {
            insertedRecipients.push(...rows);
            return Promise.resolve({ error: null });
          },
        } as never;
      }
      return createSupabaseQueryMock({ data: [], error: null });
    });

    const result = await enqueueIndividualBroadcast({
      recipients: [
        { email: 'block@x.com', name: '차단' },
        { email: 'ok@x.com', name: '정상' },
      ],
      subject: '안내',
      bodyMd: '본문',
      isAdvertisement: false,
    });

    expect(result.error).toBeFalsy();
    expect(insertedRecipients).toHaveLength(1);
    expect((insertedRecipients[0] as { email: string }).email).toBe('ok@x.com');
  });
});
