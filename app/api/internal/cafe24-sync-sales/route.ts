import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
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

    // Cafe24 주문 동기화로 판매 상태가 바뀌면 공개 목록/상세 캐시를 즉시 갱신한다.
    if (result.ok && result.inserted > 0) {
      revalidatePath('/');
      revalidatePath('/artworks');
      revalidatePath('/artworks/[id]', 'page');
      revalidatePath('/artworks/artist/[artist]', 'page');
    }

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
