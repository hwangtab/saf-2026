import { logAdminAction } from '@/app/actions/activity-log-writer';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { csvSafeCell } from '@/lib/utils/csv';

type OrderArtistRow = {
  name_ko: string | null;
};

type OrderArtworkRow = {
  title: string | null;
  artists: OrderArtistRow | OrderArtistRow[] | null;
};

type OrderItemRow = {
  artworks: OrderArtworkRow | OrderArtworkRow[] | null;
};

type OrderRow = {
  id: string;
  order_no: string | null;
  status: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  quantity: number | null;
  item_amount: number | null;
  shipping_amount: number | null;
  total_amount: number | null;
  note: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_postal_code: string | null;
  shipping_address: string | null;
  shipping_address_detail: string | null;
  shipping_memo: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  metadata: unknown;
  created_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  artworks: OrderArtworkRow | OrderArtworkRow[] | null;
  order_items: OrderItemRow[] | null;
};

// order-list.tsx의 STATUS_LABELS와 동일한 매핑을 복제한다. order-list는 client 컴포넌트라
// 여기서 import하면 client 번들이 route로 딸려오므로 값만 복제한다. 라벨 변경 시 두 곳을 함께 갱신할 것.
const STATUS_LABELS: Record<string, string> = {
  pending_payment: '결제 대기',
  awaiting_deposit: '입금 대기',
  paid: '결제 완료',
  preparing: '준비 중',
  shipped: '배송 중',
  delivered: '배송 완료',
  completed: '거래 완료',
  cancelled: '취소됨',
  refund_requested: '환불 요청',
  refunded: '환불됨',
};

function normalizeArtwork(
  artwork: OrderArtworkRow | OrderArtworkRow[] | null
): OrderArtworkRow | null {
  if (!artwork) return null;
  return Array.isArray(artwork) ? (artwork[0] ?? null) : artwork;
}

function normalizeArtistName(artist: OrderArtistRow | OrderArtistRow[] | null): string {
  if (!artist) return '';
  const first = Array.isArray(artist) ? artist[0] : artist;
  return first?.name_ko || '';
}

/** 단일 artwork_id(레거시)와 다품목 order_items 양쪽에서 작품명·작가를 결합한다. */
function resolveArtworkInfo(order: OrderRow): { titles: string; artists: string } {
  const items = order.order_items ?? [];
  if (items.length > 0) {
    const artworks = items.map((item) => normalizeArtwork(item.artworks)).filter(Boolean);
    const titles = artworks.map((a) => a!.title || '').filter(Boolean);
    const artistNames = artworks.map((a) => normalizeArtistName(a!.artists)).filter(Boolean);
    return {
      titles: titles.join(' | '),
      artists: Array.from(new Set(artistNames)).join(' | '),
    };
  }
  const single = normalizeArtwork(order.artworks);
  return {
    titles: single?.title || '',
    artists: normalizeArtistName(single?.artists ?? null),
  };
}

function getPaymentProvider(metadata: unknown): string {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? ((metadata as { payment_provider?: string | null }).payment_provider ?? '')
    : '';
}

function getKstDateToken() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function GET(request: Request) {
  if (request.headers.get('next-router-prefetch') === '1') {
    return new Response(null, { status: 204 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return new Response('Failed to verify role', { status: 500 });
  }

  if (!profile || profile.role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, buyer_name, buyer_phone, buyer_email, quantity, item_amount, shipping_amount, total_amount, note, shipping_name, shipping_phone, shipping_postal_code, shipping_address, shipping_address_detail, shipping_memo, shipping_carrier, tracking_number, metadata, created_at, paid_at, cancelled_at, refunded_at, artworks(title, artists(name_ko)), order_items(artworks(title, artists(name_ko)))'
    )
    .order('created_at', { ascending: false });

  if (ordersError) {
    return new Response('Failed to load orders', { status: 500 });
  }

  const orderRows = (orders || []) as OrderRow[];

  const header = [
    '주문번호',
    '상태',
    '구매자명',
    '구매자연락처',
    '구매자이메일',
    '작품명',
    '작가',
    '수량',
    '상품금액',
    '배송비',
    '총액',
    '결제수단',
    '수령인',
    '수령연락처',
    '우편번호',
    '주소',
    '상세주소',
    '배송메모',
    '택배사',
    '송장번호',
    '관리자메모',
    '주문일시',
    '결제일시',
    '취소일시',
    '환불일시',
  ];

  const rows = orderRows.map((order) => {
    const { titles, artists } = resolveArtworkInfo(order);
    return [
      order.order_no || '',
      (order.status && STATUS_LABELS[order.status]) || order.status || '',
      order.buyer_name || '',
      order.buyer_phone || '',
      order.buyer_email || '',
      titles,
      artists,
      order.quantity ?? '',
      order.item_amount ?? '',
      order.shipping_amount ?? '',
      order.total_amount ?? '',
      getPaymentProvider(order.metadata),
      order.shipping_name || '',
      order.shipping_phone || '',
      order.shipping_postal_code || '',
      order.shipping_address || '',
      order.shipping_address_detail || '',
      order.shipping_memo || '',
      order.shipping_carrier || '',
      order.tracking_number || '',
      order.note || '',
      order.created_at || '',
      order.paid_at || '',
      order.cancelled_at || '',
      order.refunded_at || '',
    ];
  });

  const csvBody =
    '\uFEFF' +
    [header, ...rows].map((row) => row.map((cell) => csvSafeCell(cell)).join(',')).join('\r\n');

  try {
    await logAdminAction(
      'orders_exported',
      'order',
      'all',
      {
        total_count: rows.length,
      },
      user.id,
      {
        summary: `주문 전체 데이터 다운로드 (${rows.length}건)`,
        reversible: false,
      }
    );
  } catch (error) {
    console.error('Failed to log orders export:', error);
  }

  const fileName = `orders-data-${getKstDateToken()}.csv`;

  return new Response(csvBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
