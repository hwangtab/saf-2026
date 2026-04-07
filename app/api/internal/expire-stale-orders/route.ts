import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Cancels pending_payment orders older than 30 minutes.
 * Called every 10 minutes by Vercel Cron (vercel.json).
 * Requires Bearer CRON_SECRET authorization.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !adminKey) {
    return NextResponse.json({ error: 'Supabase admin credentials are missing.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${adminKey}` } },
  });

  // Expire orders that have been pending_payment for more than 30 minutes
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data: expiredOrders, error: fetchError } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'pending_payment')
    .lt('created_at', cutoff);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!expiredOrders || expiredOrders.length === 0) {
    return NextResponse.json({ cancelled: 0 });
  }

  const ids = expiredOrders.map((o: { id: string }) => o.id);

  // Optimistic lock: only update rows still in pending_payment state
  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({ status: 'cancelled', cancelled_at: now })
    .in('id', ids)
    .eq('status', 'pending_payment')
    .select('id');

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const cancelled = updated?.length ?? 0;
  console.error(`[expire-stale-orders] cancelled ${cancelled} orders`);

  return NextResponse.json({ cancelled, total_found: ids.length });
}
