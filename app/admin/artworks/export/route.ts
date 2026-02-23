import { logAdminAction } from '@/app/actions/admin-logs';
import { createSupabaseServerClient } from '@/lib/auth/server';

type ArtworkArtistRow = {
  name_ko: string | null;
  name_en: string | null;
};

type ArtworkRow = {
  id: string;
  artist_id: string | null;
  title: string | null;
  description: string | null;
  size: string | null;
  material: string | null;
  year: string | null;
  edition: string | null;
  edition_type: 'unique' | 'limited' | 'open' | null;
  edition_limit: number | null;
  price: string | number | null;
  status: 'available' | 'reserved' | 'sold' | null;
  sold_at: string | null;
  is_hidden: boolean | null;
  images: string[] | null;
  shop_url: string | null;
  cafe24_product_no: number | null;
  created_at: string | null;
  updated_at: string | null;
  artists: ArtworkArtistRow | ArtworkArtistRow[] | null;
};

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  const escaped = raw.replace(/"/g, '""');
  if (/[",\n\r]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}

function normalizeArtist(artist: ArtworkArtistRow | ArtworkArtistRow[] | null): ArtworkArtistRow {
  if (!artist) {
    return { name_ko: null, name_en: null };
  }
  if (Array.isArray(artist)) {
    return artist[0] || { name_ko: null, name_en: null };
  }
  return artist;
}

function getKstDateToken() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function GET() {
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

  const { data: artworks, error: artworksError } = await supabase
    .from('artworks')
    .select(
      'id, artist_id, title, description, size, material, year, edition, edition_type, edition_limit, price, status, sold_at, is_hidden, images, shop_url, cafe24_product_no, created_at, updated_at, artists(name_ko, name_en)'
    )
    .order('created_at', { ascending: false });

  if (artworksError) {
    return new Response('Failed to load artworks', { status: 500 });
  }

  const artworkRows = (artworks || []) as ArtworkRow[];

  const header = [
    '작품ID',
    '작가ID',
    '작가명(한글)',
    '작가명(영문)',
    '작품명',
    '작품 설명',
    '재료',
    '년도',
    '가격',
    '사이즈',
    '에디션 표기',
    '에디션 타입',
    '에디션 수량 제한',
    '상태',
    '노출 여부',
    '판매일시',
    '대표 이미지 URL',
    '전체 이미지 URL 목록',
    '이미지 개수',
    '구매 링크',
    'Cafe24 상품번호',
    '등록일시',
    '수정일시',
  ];

  const rows = artworkRows.map((artwork) => {
    const artist = normalizeArtist(artwork.artists);
    const imageUrls = Array.isArray(artwork.images) ? artwork.images : [];
    const firstImageUrl = imageUrls[0] || '';
    const imageList = imageUrls.join(' | ');

    return [
      artwork.id,
      artwork.artist_id || '',
      artist.name_ko || '',
      artist.name_en || '',
      artwork.title || '',
      artwork.description || '',
      artwork.material || '',
      artwork.year || '',
      artwork.price ?? '',
      artwork.size || '',
      artwork.edition || '',
      artwork.edition_type || '',
      artwork.edition_limit ?? '',
      artwork.status || '',
      artwork.is_hidden ? '숨김' : '노출',
      artwork.sold_at || '',
      firstImageUrl,
      imageList,
      imageUrls.length,
      artwork.shop_url || '',
      artwork.cafe24_product_no || '',
      artwork.created_at || '',
      artwork.updated_at || '',
    ];
  });

  const csvBody =
    '\uFEFF' +
    [header, ...rows].map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\r\n');

  const hiddenCount = artworkRows.filter((artwork) => Boolean(artwork.is_hidden)).length;

  try {
    await logAdminAction(
      'artworks_exported',
      'artwork',
      'all',
      {
        total_count: rows.length,
        hidden_count: hiddenCount,
      },
      user.id,
      {
        summary: `작품 전체 데이터 다운로드 (${rows.length}건)`,
        reversible: false,
      }
    );
  } catch (error) {
    console.error('Failed to log artwork export:', error);
  }

  const fileName = `artworks-data-${getKstDateToken()}.csv`;

  return new Response(csvBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
