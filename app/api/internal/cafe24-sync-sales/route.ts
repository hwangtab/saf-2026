import { NextRequest, NextResponse } from 'next/server';
import { syncCafe24SalesFromOrders } from '@/lib/integrations/cafe24/sync-sales';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const forceWindowFromIso = request.nextUrl.searchParams.get('from');
    const forceWindowToIso = request.nextUrl.searchParams.get('to');
    const result = await syncCafe24SalesFromOrders({
      forceWindowFromIso,
      forceWindowToIso,
    });
    return NextResponse.json(result, {
      status: result.ok ? 200 : 500,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
