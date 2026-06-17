/**
 * @jest-environment node
 */

type QueryState = {
  table: string;
  filters: Record<string, unknown>;
};

function makeQuery(table: string) {
  const state: QueryState = { table, filters: {} };
  const query: Record<string, unknown> = {};
  const ret = () => query;
  query.select = jest.fn(ret);
  query.not = jest.fn(ret);
  query.gte = jest.fn(ret);
  query.gt = jest.fn(ret);
  query.lt = jest.fn(ret);
  query.in = jest.fn(ret);
  query.order = jest.fn(ret);
  query.limit = jest.fn(ret);
  query.eq = jest.fn((column: string, value: unknown) => {
    state.filters[column] = value;
    return query;
  });
  query.then = (resolve: (value: unknown) => void) => {
    if (state.table === 'event_registrations' && state.filters.status === 'awaiting_deposit') {
      resolve({
        data: [
          {
            id: 'event-deposit-1',
            applicant_name: '홍길동',
            party_size: 2,
            amount: 60000,
            order_no: 'EVT-001',
            created_at: '2026-06-17T03:00:00.000Z',
          },
        ],
        error: null,
      });
      return;
    }
    resolve({ data: [], count: 0, error: null });
  };
  return query;
}

jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: jest.fn(async () => ({ id: 'admin-1' })),
  requireAdminClient: jest.fn(async () => ({
    from: jest.fn((table: string) => makeQuery(table)),
    rpc: jest.fn(async () => ({ data: null, error: null })),
  })),
}));

describe('getAdminNotifications', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('이벤트 무통장 입금대기 신청을 action_needed 알림으로 노출한다', async () => {
    const { getAdminNotifications } = await import('@/app/actions/admin-notifications');

    const notifications = await getAdminNotifications();

    expect(notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'event-deposit:event-deposit-1',
          category: 'action_needed',
          severity: 'warning',
          title: '추도식 무통장 입금 대기 — 홍길동',
          detail: '2명 · ₩60,000 · #EVT-001',
          href: '/admin/event/oh-yoon-memorial',
        }),
      ])
    );
  });
});
