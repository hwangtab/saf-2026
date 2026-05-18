/**
 * Google Search Console API client.
 *
 * 인증 우선순위:
 *  1. GSC_SERVICE_ACCOUNT_KEY (JSON string) — googleapis JWT, 만료·취소 불가능
 *     GA4_SERVICE_ACCOUNT_KEY와 동일한 SA JSON 재사용 가능 (스코프만 webmasters.readonly)
 *     GSC Search Console → Settings → Users and permissions에 SA 이메일을 "Restricted user"로 추가 필요
 *  2. GSC_OAUTH_CLIENT_ID + CLIENT_SECRET + REFRESH_TOKEN — OAuth fallback
 *     (OAuth consent screen을 "In Production"으로 publish하면 7일 만료 정책 비적용)
 *
 * 환경변수:
 * - GSC_SERVICE_ACCOUNT_KEY: SA JSON 1줄 문자열 (권장)
 * - GSC_OAUTH_CLIENT_ID, GSC_OAUTH_CLIENT_SECRET, GSC_OAUTH_REFRESH_TOKEN: fallback
 * - GSC_SITE_URL: GSC에 등록된 정확한 site identifier
 *   · Domain property(권장): 'sc-domain:saf2026.com' — www·non-www·http·https 모두 포함
 *   · URL prefix property: 'https://www.saf2026.com/' — trailing slash 정확히 일치 필요
 *   현재 운영: 'sc-domain:saf2026.com' (Domain property — hwangtab@gmail.com siteOwner 권한)
 *
 * 사용: 매일 한 번 cron에서 fetchGscDataForDate(date)을 호출해 Supabase에 캐시.
 * GSC API는 약 2일 lag — 어제·오늘 데이터는 보통 미반영.
 */

import { google } from 'googleapis';
import type { webmasters_v3 } from 'googleapis';

const SA_KEY_JSON = process.env.GSC_SERVICE_ACCOUNT_KEY;
const CLIENT_ID = process.env.GSC_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GSC_OAUTH_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GSC_OAUTH_REFRESH_TOKEN;

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
let saJwtClient: InstanceType<typeof google.auth.JWT> | null = null;

function getSaJwtClient(): InstanceType<typeof google.auth.JWT> | null {
  if (saJwtClient) return saJwtClient;
  if (!SA_KEY_JSON) return null;
  try {
    const key = JSON.parse(SA_KEY_JSON) as { client_email: string; private_key: string };
    saJwtClient = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    return saJwtClient;
  } catch {
    return null;
  }
}

function getWebmastersClient(): webmasters_v3.Webmasters {
  if (cachedClient) return cachedClient;

  // Priority 1: Service Account JWT
  const sa = getSaJwtClient();
  if (sa) {
    cachedClient = google.webmasters({ version: 'v3', auth: sa });
    return cachedClient;
  }

  // Priority 2: OAuth refresh token
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error(
      'GSC 인증 미설정. GSC_SERVICE_ACCOUNT_KEY 또는 GSC_OAUTH_* 환경변수가 필요합니다.'
    );
  }
  const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: REFRESH_TOKEN });
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
      // 한 날짜 실패해도 나머지 진행. quota·permission 에러 등은 caller가 로그 확인.
      console.error(`[gsc-client] fetch failed for ${dateStr}:`, err);
    }
  }
  return results;
}
