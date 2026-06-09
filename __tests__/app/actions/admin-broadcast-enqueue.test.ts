import { enqueueIndividualBroadcast, getBroadcasts } from '@/app/actions/admin-broadcast';
import { createSupabaseQueryMock } from '@/lib/test-utils/email-audience-mock';

const mockFrom = jest.fn();
const insertedRecipients: unknown[] = [];
const insertedBroadcasts: unknown[] = [];
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
    insertedBroadcasts.length = 0;
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
        if (emailBroadcastsCalls === 1) {
          return createSupabaseQueryMock({ data: null, error: null }) as never;
        }
        return {
          insert: (row: unknown) => {
            insertedBroadcasts.push(row);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'bc-1' }, error: null }),
              }),
            };
          },
        } as never;
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
      bodyHtml: '<p>본문</p>',
      bodyText: '본문',
      isAdvertisement: false,
    });

    expect(result.error).toBeFalsy();
    expect(insertedBroadcasts[0]).toMatchObject({
      body_html: '<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#555E67">본문</p>',
      body_text: '본문',
    });
    expect(insertedBroadcasts[0]).not.toHaveProperty('body_md');
    expect(insertedRecipients).toHaveLength(1);
    expect((insertedRecipients[0] as { email: string }).email).toBe('ok@x.com');
  });
});

describe('getBroadcasts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a counted page of broadcast history', async () => {
    const query = {
      select: jest.fn(() => query),
      order: jest.fn(() => query),
      range: jest.fn(async () => ({
        data: [
          {
            id: 'broadcast-2',
            channel: 'customer',
            subject: '2페이지',
            status: 'sent',
            recipient_count: 10,
            sent_count: 10,
            failed_count: 0,
            created_at: '2026-06-09T00:00:00.000Z',
            queued_at: '2026-06-09T00:00:00.000Z',
            sent_at: '2026-06-09T00:01:00.000Z',
          },
        ],
        error: null,
        count: 76,
      })),
    };
    mockFrom.mockReturnValue(query);

    const result = await getBroadcasts({ page: 2, pageSize: 25 });

    expect(query.select).toHaveBeenCalledWith(
      'id, channel, subject, status, recipient_count, sent_count, failed_count, created_at, queued_at, sent_at',
      { count: 'exact' }
    );
    expect(query.range).toHaveBeenCalledWith(25, 49);
    expect(result.total).toBe(76);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(25);
    expect(result.rows).toHaveLength(1);
  });
});
