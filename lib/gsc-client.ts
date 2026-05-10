/**
 * Google Search Console API client.
 *
 * 인증 방식: OAuth 2.0 refresh token (hwangtab@gmail.com 계정).
 * service account가 아닌 이유는 GA4 워크플로와 동일 — Google Properties Access UI에서
 * service account 등록이 거부됨. 같은 패턴 재활용.
 *
 * 환경변수 (Vercel·local 모두 등록):
 * - GSC_OAUTH_CLIENT_ID, GSC_OAUTH_CLIENT_SECRET, GSC_OAUTH_REFRESH_TOKEN
 * - GSC_SITE_URL: GSC에 등록된 정확한 site identifier
 *   · Domain property(권장): 'sc-domain:saf2026.com' — www·non-www·http·https 모두 포함
 *   · URL prefix property: 'https://www.saf2026.com/' — 등록한 URL과 trailing slash 정확히 일치 필요
 *   사용자 OAuth 권한이 GSC에 등록된 정확한 식별자에 매핑되어야 작동 (잘못된 값은 403 forbidden).
 *   현재 운영: 'sc-domain:saf2026.com' (Domain property — hwangtab@gmail.com siteOwner 권한)
 *
 * 사용: 매일 한 번 cron에서 fetchGscDataForDate(date)을 호출해 Supabase에 캐시.
 * GSC API는 약 2일 lag — 어제·오늘 데이터는 보통 미반영.
 */

import { google } from 'googleapis';
import type { webmasters_v3 } from 'googleapis';

interface GscRow {
  query?: string | null;
  page?: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

interface GscFetchResult {
  date: string;
  rows: GscRow[];
  rawCount: number;
}

function requireEnv(key: string): string {
  const v = process.env[key]?.trim();
  if (!v) throw new Error(`[gsc-client] missing env: ${key}`);
  return v;
}

let cachedClient: webmasters_v3.Webmasters | null = null;

/**
 * OAuth refresh token 기반 webmasters client 빌드.
 * googleapis 라이브러리가 access token 자동 갱신 — refresh token만 유효하면 영구 동작.
 */
function getWebmastersClient(): webmasters_v3.Webmasters {
  if (cachedClient) return cachedClient;

  const clientId = requireEnv('GSC_OAUTH_CLIENT_ID');
  const clientSecret = requireEnv('GSC_OAUTH_CLIENT_SECRET');
  const refreshToken = requireEnv('GSC_OAUTH_REFRESH_TOKEN');

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });

  cachedClient = google.webmasters({ version: 'v3', auth: oauth2 });
  return cachedClient;
}

/**
 * 특정 날짜(YYYY-MM-DD)의 GSC 데이터를 query × page 단위로 수집.
 *
 * Search Analytics API는 한 번에 query/page/device/country/searchAppearance 등 여러
 * dimension 조합 가능. 여기선 (query, page) 조합으로 5000행까지. 그 이상 거의 없음.
 *
 * GSC가 그 날짜 데이터를 아직 처리 안 했으면 빈 결과 반환 — caller가 무시.
 */
export async function fetchGscDataForDate(date: string): Promise<GscFetchResult> {
  const siteUrl = requireEnv('GSC_SITE_URL');
  const wm = getWebmastersClient();

  const res = await wm.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: date,
      endDate: date,
      dimensions: ['query', 'page'],
      rowLimit: 5000,
      // 데이터 정합성: dataState 'final'은 lag 큼, 'all'은 빠르지만 미확정. final 권장.
      dataState: 'final',
    },
  });

  const rawRows = res.data.rows ?? [];
  const rows: GscRow[] = rawRows.map((r) => ({
    query: r.keys?.[0] ?? null,
    page: r.keys?.[1] ?? null,
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
    ctr: Number(r.ctr ?? 0),
    position: Number(r.position ?? 0),
  }));

  return { date, rows, rawCount: rawRows.length };
}

/**
 * GSC 데이터를 N일치 일괄 fetch.
 * GSC는 보통 2일 lag — 오늘부터 startOffset일 만큼 거슬러 가서 daysBack일치 fetch.
 * 예: startOffset=2, daysBack=7 → 오늘 -2일 ~ 오늘 -8일.
 */
export async function fetchGscDataRange(options: {
  daysBack: number;
  startOffset?: number;
}): Promise<GscFetchResult[]> {
  const { daysBack, startOffset = 2 } = options;
  const results: GscFetchResult[] = [];
  for (let i = 0; i < daysBack; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (startOffset + i));
    const dateStr = d.toISOString().slice(0, 10);
    try {
      const res = await fetchGscDataForDate(dateStr);
      results.push(res);
    } catch (err) {
      // 한 날짜 실패해도 나머지 진행. 자세한 진단 정보 stringify 추가 (truncation 방어용 short message)
      const e = err as { message?: string; code?: number; response?: { data?: unknown } };
      const detail =
        `code=${e.code ?? '?'} msg=${(e.message ?? '').slice(0, 200)} ` +
        `resp=${JSON.stringify(e.response?.data ?? {}).slice(0, 300)}`;
      console.error(`[gsc-client] fetch failed for ${dateStr}: ${detail}`);
    }
  }
  return results;
}
