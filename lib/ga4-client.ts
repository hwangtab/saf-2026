/**
 * GA4 Data API server-side helper.
 *
 * 인증: hwangtab@gmail.com OAuth client + refresh token (메모리 `project_ga4_oauth_workflow`).
 * service account는 GA4 Property Access UI에서 등록 거부됨 — 사용 금지.
 *
 * 호출부 안전성:
 * - 환경변수 미설정 시 isConfigured()=false → 호출자가 빈 결과 fallback 가능
 * - access token 1시간 만료 시 모듈 module-level 캐시로 재사용. expires-60s safety margin
 * - 모든 외부 호출은 try/catch로 감싸 admin 페이지가 GA4 일시 장애로 깨지지 않도록
 *
 * docs: https://developers.google.com/analytics/devguides/reporting/data/v1
 */

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const CLIENT_ID = process.env.GA4_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GA4_OAUTH_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GA4_OAUTH_REFRESH_TOKEN;

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

export function isGa4Configured(): boolean {
  return Boolean(PROPERTY_ID && CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);
}

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error('GA4 OAuth env not configured');
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
    throw new Error(`GA4 token refresh failed: ${res.status}`);
  }

  cachedAccessToken = data.access_token;
  // expires_in: 초 단위. 60초 safety margin.
  tokenExpiresAt = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
  return cachedAccessToken;
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
