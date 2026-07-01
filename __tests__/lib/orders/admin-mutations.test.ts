function buildTrackingSupabaseMock(order: Record<string, unknown> | null) {
  const updates: Array<Record<string, unknown>> = [];
  const statusInMock = jest.fn(async () => ({ error: null }));
  const supabase = {
    from: jest.fn((table: string) => {
      if (table !== 'orders') throw new Error(`Unexpected table: ${table}`);
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(async () => ({
              data: order,
              error: order ? null : { code: 'PGRST116' },
            })),
          })),
        })),
        update: jest.fn((patch: Record<string, unknown>) => {
          updates.push(patch);
          return {
            eq: jest.fn(() => ({
              in: statusInMock,
            })),
          };
        }),
      };
    }),
  };
  return { supabase, updates, statusInMock };
}

function buildPauseSupabaseMock(options: {
  order: Record<string, unknown> | null;
  updatedRows: Array<Record<string, unknown>> | null;
  updateError?: unknown;
}) {
  const updates: Array<Record<string, unknown>> = [];
  const supabase = {
    from: jest.fn((table: string) => {
      if (table !== 'orders') throw new Error(`Unexpected table: ${table}`);
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(async () => ({
              data: options.order,
              error: options.order ? null : { code: 'PGRST116' },
            })),
          })),
        })),
        update: jest.fn((patch: Record<string, unknown>) => {
          updates.push(patch);
          return {
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn(async () => ({
                  data: options.updatedRows,
                  error: options.updateError ?? null,
                })),
              })),
            })),
          };
        }),
      };
    }),
  };
  return { supabase, updates };
}

function buildEscalationSupabaseMock(options: {
  orderNoRow: Record<string, unknown> | null;
  updateError?: unknown;
}) {
  const orderUpdates: Array<Record<string, unknown>> = [];
  const noteUpserts: Array<Record<string, unknown>> = [];
  const noteDeletes: string[] = [];

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'orders') {
        return {
          update: jest.fn((patch: Record<string, unknown>) => {
            orderUpdates.push(patch);
            const query = {
              eq: jest.fn(() => query),
              is: jest.fn(() => query),
              select: jest.fn(() => ({
                maybeSingle: jest.fn(async () => ({
                  data: options.orderNoRow,
                  error: options.updateError ?? null,
                })),
              })),
            };
            return query;
          }),
        };
      }

      if (table === 'order_admin_notes') {
        return {
          upsert: jest.fn(async (payload: Record<string, unknown>) => {
            noteUpserts.push(payload);
            return { error: null };
          }),
          delete: jest.fn(() => ({
            eq: jest.fn(async (_column: string, orderId: string) => {
              noteDeletes.push(orderId);
              return { error: null };
            }),
          })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { supabase, orderUpdates, noteUpserts, noteDeletes };
}

describe('admin order mutations', () => {
  it('updates tracking info only for shipped or delivered orders', async () => {
    const { updateTrackingInfoMutation } = await import('@/lib/orders/admin-mutations');
    const { supabase, updates, statusInMock } = buildTrackingSupabaseMock({
      id: 'ord-1',
      order_no: 'SAF-001',
      status: 'shipped',
    });

    const result = await updateTrackingInfoMutation(supabase as never, {
      orderId: 'ord-1',
      carrier: 'CJ',
      trackingNumber: '1234',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(updates[0]).toEqual({
      shipping_carrier: 'CJ',
      tracking_number: '1234',
      updated_at: '2026-06-30T05:00:00.000Z',
    });
    expect(statusInMock).toHaveBeenCalledWith('status', ['shipped', 'delivered']);
    expect(result.order).toEqual(expect.objectContaining({ order_no: 'SAF-001' }));
  });

  it('rejects tracking updates for non-shipping orders before issuing an update', async () => {
    const { updateTrackingInfoMutation } = await import('@/lib/orders/admin-mutations');
    const { supabase, updates } = buildTrackingSupabaseMock({
      id: 'ord-1',
      order_no: 'SAF-001',
      status: 'paid',
    });

    await expect(
      updateTrackingInfoMutation(supabase as never, {
        orderId: 'ord-1',
        carrier: 'CJ',
        trackingNumber: '1234',
        now: '2026-06-30T05:00:00.000Z',
      })
    ).rejects.toThrow('배송 중 또는 배송 완료 상태인 주문만 운송장 정보를 수정할 수 있습니다.');
    expect(updates).toHaveLength(0);
  });

  it('toggles deposit auto-cancel pause with awaiting_deposit optimistic locking', async () => {
    const { setDepositAutoCancelPausedMutation } = await import('@/lib/orders/admin-mutations');
    const { supabase, updates } = buildPauseSupabaseMock({
      order: {
        id: 'ord-1',
        order_no: 'SAF-001',
        status: 'awaiting_deposit',
        buyer_name: '홍길동',
        total_amount: 500000,
      },
      updatedRows: [{ id: 'ord-1' }],
    });

    const result = await setDepositAutoCancelPausedMutation(supabase as never, {
      orderId: 'ord-1',
      paused: true,
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(updates[0]).toEqual({
      deposit_auto_cancel_paused: true,
      updated_at: '2026-06-30T05:00:00.000Z',
    });
    expect(result.order).toEqual(expect.objectContaining({ order_no: 'SAF-001' }));
  });

  it('fails deposit pause when the optimistic status update touches no rows', async () => {
    const { setDepositAutoCancelPausedMutation } = await import('@/lib/orders/admin-mutations');
    const { supabase } = buildPauseSupabaseMock({
      order: {
        id: 'ord-1',
        order_no: 'SAF-001',
        status: 'awaiting_deposit',
      },
      updatedRows: [],
    });

    await expect(
      setDepositAutoCancelPausedMutation(supabase as never, {
        orderId: 'ord-1',
        paused: false,
        now: '2026-06-30T05:00:00.000Z',
      })
    ).rejects.toThrow('주문 상태가 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.');
  });

  it('sets escalation with optimistic locking and upserts an admin note', async () => {
    const { setOrderEscalationMutation } = await import('@/lib/orders/admin-mutations');
    const { supabase, orderUpdates, noteUpserts } = buildEscalationSupabaseMock({
      orderNoRow: { order_no: 'SAF-001' },
    });

    const result = await setOrderEscalationMutation(supabase as never, {
      orderId: 'ord-1',
      note: '확인 필요',
      expectedEscalatedAt: null,
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(orderUpdates[0]).toEqual({ escalated_at: '2026-06-30T05:00:00.000Z' });
    expect(noteUpserts[0]).toEqual({
      order_id: 'ord-1',
      note: '확인 필요',
      updated_at: '2026-06-30T05:00:00.000Z',
    });
    expect(result).toEqual({
      orderNo: 'SAF-001',
      escalatedAt: '2026-06-30T05:00:00.000Z',
    });
  });

  it('clears escalation and deletes its admin note', async () => {
    const { setOrderEscalationMutation } = await import('@/lib/orders/admin-mutations');
    const { supabase, orderUpdates, noteDeletes } = buildEscalationSupabaseMock({
      orderNoRow: { order_no: 'SAF-001' },
    });

    const result = await setOrderEscalationMutation(supabase as never, {
      orderId: 'ord-1',
      note: null,
      expectedEscalatedAt: '2026-06-29T05:00:00.000Z',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(orderUpdates[0]).toEqual({ escalated_at: null });
    expect(noteDeletes).toEqual(['ord-1']);
    expect(result).toEqual({ orderNo: 'SAF-001', escalatedAt: null });
  });
});
