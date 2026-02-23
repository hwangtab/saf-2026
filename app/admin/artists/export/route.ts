import { logAdminAction } from '@/app/actions/admin-logs';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { formatKoreanPhoneNumber } from '@/lib/utils/phone';

type ArtistRow = {
  id: string;
  user_id: string | null;
  name_ko: string | null;
  name_en: string | null;
  bio: string | null;
  history: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  instagram: string | null;
  homepage: string | null;
  created_at: string;
  updated_at: string;
  artworks?: Array<{ count: number }>;
};

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
};

type ArtistApplicationRow = {
  user_id: string;
  artist_name: string | null;
  contact: string | null;
  bio: string | null;
  referrer: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ParsedApplicationContact = {
  extractedEmail: string;
  extractedPhone: string;
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

function extractEmailFromText(value: string | null | undefined): string {
  const source = (value || '').trim();
  if (!source) return '';
  const matched = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return matched?.[0]?.trim() || '';
}

function extractPhoneFromText(value: string | null | undefined): string {
  const source = (value || '').trim();
  if (!source) return '';

  const withoutEmail = source.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, ' ');
  const matched = withoutEmail.match(/(?:\+?\d[\d\s()-]{5,}\d)/);
  return matched?.[0]?.trim() || '';
}

function parseApplicationContact(value: string | null | undefined): ParsedApplicationContact {
  const extractedEmail = extractEmailFromText(value);
  const extractedPhoneRaw = extractPhoneFromText(value);
  const extractedPhone = formatKoreanPhoneNumber(extractedPhoneRaw);
  return { extractedEmail, extractedPhone };
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

  const { data: artists, error: artistsError } = await supabase
    .from('artists')
    .select('*, artworks(count)')
    .order('name_ko');

  if (artistsError) {
    return new Response('Failed to load artists', { status: 500 });
  }

  const artistRows = (artists || []) as ArtistRow[];
  const userIds = Array.from(
    new Set(artistRows.map((artist) => artist.user_id).filter((id): id is string => Boolean(id)))
  );

  let profileRows: ProfileRow[] = [];
  let applicationRows: ArtistApplicationRow[] = [];

  if (userIds.length > 0) {
    const [
      { data: profiles, error: profilesError },
      { data: applications, error: applicationsError },
    ] = await Promise.all([
      supabase.from('profiles').select('id, name, email, role, status').in('id', userIds),
      supabase
        .from('artist_applications')
        .select('user_id, artist_name, contact, bio, referrer, created_at, updated_at')
        .in('user_id', userIds),
    ]);

    if (profilesError) {
      return new Response('Failed to load linked profiles', { status: 500 });
    }
    if (applicationsError) {
      return new Response('Failed to load artist applications', { status: 500 });
    }

    profileRows = (profiles || []) as ProfileRow[];
    applicationRows = (applications || []) as ArtistApplicationRow[];
  }

  const profileById = new Map(profileRows.map((item) => [item.id, item]));
  const applicationByUserId = new Map(applicationRows.map((item) => [item.user_id, item]));

  const header = [
    '작가ID',
    '작가명(한글)',
    '작가명(영문)',
    '전화번호',
    '이메일',
    '인스타그램',
    '홈페이지',
    '작가 소개(등록)',
    '작가 이력(등록)',
    '연결 사용자ID',
    '연결 사용자명',
    '연결 사용자 이메일',
    '연결 사용자 권한',
    '연결 사용자 상태',
    '신청 작가명',
    '신청 연락처 원문',
    '신청 전화번호(정규화)',
    '신청 이메일(추출)',
    '신청 소개',
    '추천인',
    '작품 수',
    '계정 연결 여부',
    '작가 생성일',
    '작가 수정일',
    '신청 생성일',
    '신청 수정일',
  ];

  const rows = artistRows.map((artist) => {
    const linkedProfile = artist.user_id ? profileById.get(artist.user_id) : undefined;
    const application = artist.user_id ? applicationByUserId.get(artist.user_id) : undefined;
    const parsedApplicationContact = parseApplicationContact(application?.contact);

    const normalizedPhone =
      formatKoreanPhoneNumber(artist.contact_phone) || parsedApplicationContact.extractedPhone;
    const normalizedEmail =
      (artist.contact_email || '').trim() ||
      parsedApplicationContact.extractedEmail ||
      (linkedProfile?.email || '').trim();

    return [
      artist.id,
      artist.name_ko || '',
      artist.name_en || '',
      normalizedPhone,
      normalizedEmail,
      artist.instagram || '',
      artist.homepage || '',
      artist.bio || '',
      artist.history || '',
      artist.user_id || '',
      linkedProfile?.name || '',
      linkedProfile?.email || '',
      linkedProfile?.role || '',
      linkedProfile?.status || '',
      application?.artist_name || '',
      application?.contact || '',
      parsedApplicationContact.extractedPhone,
      parsedApplicationContact.extractedEmail,
      application?.bio || '',
      application?.referrer || '',
      artist.artworks?.[0]?.count || 0,
      artist.user_id ? '연결됨' : '미연결',
      artist.created_at || '',
      artist.updated_at || '',
      application?.created_at || '',
      application?.updated_at || '',
    ];
  });

  const csvBody =
    '\uFEFF' +
    [header, ...rows].map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\r\n');

  const withPhoneCount = rows.filter((row) => String(row[3] || '').trim().length > 0).length;
  const withoutPhoneCount = rows.length - withPhoneCount;

  try {
    await logAdminAction(
      'artist_contacts_exported',
      'artist',
      'all',
      {
        total_count: rows.length,
        with_phone_count: withPhoneCount,
        without_phone_count: withoutPhoneCount,
      },
      user.id,
      {
        summary: `작가 전체 연락처 다운로드 (${rows.length}명)`,
        reversible: false,
      }
    );
  } catch (error) {
    console.error('Failed to log artist contact export:', error);
  }

  const fileName = `artists-contacts-${getKstDateToken()}.csv`;

  return new Response(csvBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
