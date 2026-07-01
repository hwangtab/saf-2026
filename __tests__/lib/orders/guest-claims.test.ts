function buildGuestClaimsSupabaseMock(options: {
  claimedOrders?: Array<{ id: string }> | null;
  updateError?: unknown;
}) {
  const select = jest.fn(async () => ({
    data: options.claimedOrders ?? [],
    error: options.updateError ?? null,
  }));
  const eq = jest.fn(() => ({ select }));
  const is = jest.fn(() => ({ eq }));
  const update = jest.fn(() => ({ is }));

  const supabase = {
    from: jest.fn((table: string) => {
      if (table !== 'orders') throw new Error(`Unexpected table: ${table}`);
      return { update };
    }),
  };

  return { supabase, update, is, eq, select };
}

const verifiedUser = {
  id: 'user-1',
  email: ' Buyer@Example.COM ',
  email_confirmed_at: '2026-06-30T05:00:00.000Z',
};

describe('guest order claims mutation', () => {
  it('does not touch orders when there is no signed-in user', async () => {
    const { claimGuestOrdersMutation } = await import('@/lib/orders/guest-claims');
    const { supabase } = buildGuestClaimsSupabaseMock({});

    const result = await claimGuestOrdersMutation(supabase as never, null);

    expect(result).toEqual({ claimed: 0 });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('does not touch orders when the user email is unverified', async () => {
    const { claimGuestOrdersMutation } = await import('@/lib/orders/guest-claims');
    const { supabase } = buildGuestClaimsSupabaseMock({});

    const result = await claimGuestOrdersMutation(supabase as never, {
      ...verifiedUser,
      email_confirmed_at: null,
    });

    expect(result).toEqual({ claimed: 0 });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('claims only guest orders matching the normalized verified email', async () => {
    const { claimGuestOrdersMutation } = await import('@/lib/orders/guest-claims');
    const { supabase, update, is, eq } = buildGuestClaimsSupabaseMock({
      claimedOrders: [{ id: 'ord-1' }, { id: 'ord-2' }],
    });

    const result = await claimGuestOrdersMutation(supabase as never, verifiedUser);

    expect(result).toEqual({ claimed: 2 });
    expect(update).toHaveBeenCalledWith({ buyer_user_id: 'user-1' });
    expect(is).toHaveBeenCalledWith('buyer_user_id', null);
    expect(eq).toHaveBeenCalledWith('buyer_email', 'buyer@example.com');
  });

  it('returns a structured update error without throwing', async () => {
    const { claimGuestOrdersMutation } = await import('@/lib/orders/guest-claims');
    const updateError = { message: 'update failed' };
    const { supabase } = buildGuestClaimsSupabaseMock({ updateError });

    const result = await claimGuestOrdersMutation(supabase as never, verifiedUser);

    expect(result).toEqual({ claimed: 0, updateError });
  });
});
