/**
 * GA4 Data API server-side helper.
 *
 * 인증 우선순위:
 *  1. GA4_SERVICE_ACCOUNT_KEY (JSON string) — googleapis JWT, 만료·취소 불가능
 *  2. GA4_OAUTH_CLIENT_ID + CLIENT_SECRET + REFRESH_TOKEN — OAuth fallback
 *     (OAuth consent screen을 "In Production"으로 publish하면 7일 만료 정책 비적용)
 *  3. GA4_ACCESS_TOKEN — local dev 즉석 (1시간 만료, 수동)
 *
 * 호출부 안전성:
 * - 환경변수 미설정 시 isGa4Configured()=false → 호출자가 빈 결과 fallback 가능
 * - 모든 외부 호출은 try/catch로 감싸 admin 페이지가 GA4 장애로 깨지지 않도록
 */

import { google } from 'googleapis';

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const SA_KEY_JSON = process.env.GA4_SERVICE_ACCOUNT_KEY;
const CLIENT_ID = process.env.GA4_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GA4_OAUTH_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GA4_OAUTH_REFRESH_TOKEN;

// Module-level caches
let saJwtClient: InstanceType<typeof google.auth.JWT> | null = null;
let oauthAccessToken: string | null = null;
let oauthTokenExpiresAt = 0;

function getSaJwtClient(): InstanceType<typeof google.auth.JWT> | null {
  if (saJwtClient) return saJwtClient;
  if (!SA_KEY_JSON) return null;
  try {
    const key = JSON.parse(SA_KEY_JSON) as { client_email: string; private_key: string };
    saJwtClient = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });
    return saJwtClient;
  } catch {
    return null;
  }
}

export function isGa4Configured(): boolean {
  return Boolean(
    PROPERTY_ID &&
      (SA_KEY_JSON || (CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN) || process.env.GA4_ACCESS_TOKEN)
  );
}

async function getAccessToken(): Promise<string> {
  // Priority 1: Service Account JWT — googleapis가 자동으로 token 발급·갱신
  const sa = getSaJwtClient();
  if (sa) {
    const result = await sa.getAccessToken();
    if (result.token) return result.token;
  }

  // Priority 2: OAuth refresh token
  if (CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN) {
    if (oauthAccessToken && Date.now() < oauthTokenExpiresAt) {
      return oauthAccessToken;
    }
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    });
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!res.ok || !data.access_token) {
      throw new Error(
        `GA4 OAuth refresh 실패 (${res.status}). GA4_SERVICE_ACCOUNT_KEY 설정을 권장합니다.`
      );
    }
    oauthAccessToken = data.access_token;
    oauthTokenExpiresAt = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
    return oauthAccessToken;
  }

  // Priority 3: Manual access token (local dev only)
  const devToken = process.env.GA4_ACCESS_TOKEN;
  if (devToken) return devToken;

  throw new Error(
    'GA4 인증 미설정. GA4_SERVICE_ACCOUNT_KEY, GA4_OAUTH_* 또는 GA4_ACCESS_TOKEN 필요.'
  );
}

export type Ga4ReportRequest = {
  /** ISO date strings or 'NdaysAgo'/'today'. */
  startDate: string;
  endDate: string;
  dimensions: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  orderBys?: Array<{ metric?: { metricName: string }; desc?: boolean }>;
  limit?: number;
};

export type Ga4Row = {
  dimensionValues: Array<{ value: string }>;
  metricValues: Array<{ value: string }>;
};

export type Ga4Report = {
  rows: Ga4Row[];
  rowCount: number;
};

/**
 * GA4 Data API runReport 호출.
 * 실패 시 throw — 호출자가 try/catch로 처리해 admin 페이지 graceful fallback.
 */
export async function runGa4Report(req: Ga4ReportRequest): Promise<Ga4Report> {
  if (!isGa4Configured()) {
    throw new Error('GA4 not configured');
  }

  const token = await getAccessToken();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: req.startDate, endDate: req.endDate }],
      dimensions: req.dimensions,
      metrics: req.metrics,
      orderBys: req.orderBys,
      limit: req.limit ?? 30,
    }),
  });

  const data = (await res.json()) as {
    rows?: Ga4Row[];
    rowCount?: number;
    error?: { message: string };
  };
  if (!res.ok) {
    throw new Error(`GA4 runReport failed (${res.status}): ${data.error?.message ?? 'unknown'}`);
  }

  return {
    rows: data.rows ?? [],
    rowCount: data.rowCount ?? 0,
  };
}
