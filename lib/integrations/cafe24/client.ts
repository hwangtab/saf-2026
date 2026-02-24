import { createSupabaseAdminClient } from '@/lib/auth/server';

const DEFAULT_SCOPE = 'mall.read_product,mall.write_product';
const ACCESS_TOKEN_REFRESH_BUFFER_SECONDS = 90;
const KOREASMARTCOOP_FALLBACK_CATEGORY_NO = 43;
const DEFAULT_HTTP_TIMEOUT_MS = 15_000;
const DEFAULT_HTTP_MAX_RETRIES = 2;
const RETRYABLE_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

type JsonRecord = Record<string, unknown>;

export type Cafe24Config = {
  mallId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  defaultCategoryNo: number | null;
};

export type Cafe24TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  expires_at?: string;
  [key: string]: unknown;
};

type Cafe24TokenRow = {
  mall_id: string;
  access_token: string;
  refresh_token: string;
  token_type: string | null;
  scope: string | null;
  expires_in: number | null;
  expires_at: string;
  raw_response: JsonRecord;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeRetryDelayMs(attempt: number): number {
  // 250ms, 500ms, 1000ms ... capped
  return Math.min(4_000, 250 * 2 ** attempt);
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function resolveHttpTimeoutMs(): number {
  return Math.max(
    3_000,
    parsePositiveInt(process.env.CAFE24_HTTP_TIMEOUT_MS, DEFAULT_HTTP_TIMEOUT_MS)
  );
}

function resolveHttpMaxRetries(): number {
  const parsed = parsePositiveInt(process.env.CAFE24_HTTP_MAX_RETRIES, DEFAULT_HTTP_MAX_RETRIES);
  return Math.min(5, parsed);
}

function isRetryableHttpStatus(status: number): boolean {
  return RETRYABLE_HTTP_STATUS.has(status);
}

function isRetryableNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return true;
  const message = error.message.toLowerCase();
  return (
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('socket') ||
    message.includes('ecconn') ||
    message.includes('econn')
  );
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const parentSignal = init.signal;
  let timeoutTriggered = false;
  let abortListener: (() => void) | null = null;

  const timeout = setTimeout(() => {
    timeoutTriggered = true;
    controller.abort();
  }, timeoutMs);

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      abortListener = () => controller.abort();
      parentSignal.addEventListener('abort', abortListener, { once: true });
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (timeoutTriggered) {
      throw new Error(`Cafe24 API 요청 타임아웃(${timeoutMs}ms)`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    if (parentSignal && abortListener) {
      parentSignal.removeEventListener('abort', abortListener);
    }
  }
}

function parseCategoryNo(raw: string | undefined): number | null {
  if (!raw) return null;
  const parsed = Number(raw.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function resolveDefaultCategoryNo(mallId: string, raw: string | undefined): number | null {
  const parsed = parseCategoryNo(raw);
  if (parsed) return parsed;

  // SAF 운영몰은 작품이 반드시 카테고리 43에 매핑되어야 상세 URL이 안정적으로 동작한다.
  if (mallId === 'koreasmartcoop') {
    return KOREASMARTCOOP_FALLBACK_CATEGORY_NO;
  }

  return null;
}

export function getCafe24Config(): Cafe24Config | null {
  const mallId = process.env.CAFE24_MALL_ID?.trim();
  const clientId = process.env.CAFE24_CLIENT_ID?.trim();
  const clientSecret = process.env.CAFE24_CLIENT_SECRET?.trim();
  const redirectUri = process.env.CAFE24_REDIRECT_URI?.trim();

  if (!mallId || !clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return {
    mallId,
    clientId,
    clientSecret,
    redirectUri,
    scope: process.env.CAFE24_SCOPE?.trim() || DEFAULT_SCOPE,
    defaultCategoryNo: resolveDefaultCategoryNo(mallId, process.env.CAFE24_DEFAULT_CATEGORY_NO),
  };
}

function resolveExpiresAt(payload: Cafe24TokenResponse): string {
  if (payload.expires_at) {
    return payload.expires_at;
  }
  const expiresIn = Number(payload.expires_in || 0);
  const ttl = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 60 * 30;
  return new Date(Date.now() + ttl * 1000).toISOString();
}

function parseErrorMessage(raw: unknown, status: number): string {
  if (typeof raw === 'string' && raw) {
    return raw;
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as JsonRecord;
    const candidates = [
      obj.error_description,
      obj.error,
      obj.message,
      (obj.error as JsonRecord | undefined)?.message,
      (obj.errors as JsonRecord | undefined)?.message,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
  }
  return `Cafe24 API request failed (status=${status})`;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function persistCafe24Token(payload: Cafe24TokenResponse): Promise<void> {
  const config = getCafe24Config();
  if (!config) {
    throw new Error('Cafe24 환경변수가 설정되지 않았습니다.');
  }

  const supabase = createSupabaseAdminClient();
  const expiresAt = resolveExpiresAt(payload);
  const expiresIn = Number(payload.expires_in || 0);

  const { error } = await supabase.from('cafe24_tokens').upsert(
    {
      mall_id: config.mallId,
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      token_type: payload.token_type || null,
      scope: payload.scope || config.scope,
      expires_in: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : null,
      expires_at: expiresAt,
      raw_response: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'mall_id' }
  );

  if (error) {
    throw new Error(`Cafe24 토큰 저장 실패: ${error.message}`);
  }
}

async function loadTokenRow(config: Cafe24Config): Promise<Cafe24TokenRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('cafe24_tokens')
    .select(
      'mall_id, access_token, refresh_token, token_type, scope, expires_in, expires_at, raw_response'
    )
    .eq('mall_id', config.mallId)
    .maybeSingle();

  if (error) {
    throw new Error(`Cafe24 토큰 조회 실패: ${error.message}`);
  }
  return (data as Cafe24TokenRow | null) || null;
}

async function saveTokenRow(config: Cafe24Config, token: Cafe24TokenResponse): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const expiresAt = resolveExpiresAt(token);
  const expiresIn = Number(token.expires_in || 0);

  const { error } = await supabase.from('cafe24_tokens').upsert(
    {
      mall_id: config.mallId,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_type: token.token_type || null,
      scope: token.scope || config.scope,
      expires_in: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : null,
      expires_at: expiresAt,
      raw_response: token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'mall_id' }
  );

  if (error) {
    throw new Error(`Cafe24 토큰 저장 실패: ${error.message}`);
  }
}

async function refreshAccessToken(
  config: Cafe24Config,
  refreshToken: string
): Promise<Cafe24TokenResponse> {
  const tokenEndpoint = `https://${config.mallId}.cafe24api.com/api/v2/oauth/token`;
  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const form = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const maxRetries = resolveHttpMaxRetries();
  const timeoutMs = resolveHttpTimeoutMs();
  let lastMessage = 'Cafe24 토큰 리프레시 요청에 실패했습니다.';

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        tokenEndpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
          body: form.toString(),
          cache: 'no-store',
        },
        timeoutMs
      );
      const payload = (await parseJsonResponse(response)) as unknown;

      if (!response.ok || !payload || typeof payload !== 'object') {
        lastMessage = parseErrorMessage(payload, response.status);
        if (attempt < maxRetries && isRetryableHttpStatus(response.status)) {
          await wait(computeRetryDelayMs(attempt));
          continue;
        }
        throw new Error(lastMessage);
      }

      const token = payload as Cafe24TokenResponse;
      if (!token.access_token || !token.refresh_token) {
        throw new Error('Cafe24 리프레시 응답에 access_token/refresh_token이 없습니다.');
      }
      return token;
    } catch (error) {
      if (attempt < maxRetries && isRetryableNetworkError(error)) {
        await wait(computeRetryDelayMs(attempt));
        continue;
      }
      throw error;
    }
  }

  throw new Error(lastMessage);
}

function isTokenFresh(expiresAt: string): boolean {
  const expiresMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMs)) return false;
  const thresholdMs = Date.now() + ACCESS_TOKEN_REFRESH_BUFFER_SECONDS * 1000;
  return expiresMs > thresholdMs;
}

export async function getCafe24AccessToken(forceRefresh = false): Promise<string> {
  const config = getCafe24Config();
  if (!config) {
    throw new Error('Cafe24 환경변수가 설정되지 않았습니다.');
  }

  const tokenRow = await loadTokenRow(config);
  if (!tokenRow) {
    throw new Error(
      'Cafe24 OAuth 연결이 필요합니다. /api/integrations/cafe24/authorize 를 먼저 실행하세요.'
    );
  }

  if (!forceRefresh && isTokenFresh(tokenRow.expires_at)) {
    return tokenRow.access_token;
  }

  try {
    const refreshed = await refreshAccessToken(config, tokenRow.refresh_token);
    await saveTokenRow(config, refreshed);
    return refreshed.access_token;
  } catch (refreshError) {
    // 동시 요청에서 다른 워커가 먼저 토큰 갱신을 완료한 경우를 허용한다.
    const reloaded = await loadTokenRow(config);
    if (reloaded && isTokenFresh(reloaded.expires_at)) {
      return reloaded.access_token;
    }
    throw refreshError;
  }
}

export class Cafe24AdminApiClient {
  private readonly config: Cafe24Config;

  constructor(config: Cafe24Config) {
    this.config = config;
  }

  async request(path: string, init?: RequestInit): Promise<unknown> {
    return this.requestWithAuth(path, init, false);
  }

  private async requestWithAuth(
    path: string,
    init: RequestInit | undefined,
    retried: boolean
  ): Promise<unknown> {
    const accessToken = await getCafe24AccessToken(retried);
    const baseUrl = `https://${this.config.mallId}.cafe24api.com/api/v2/admin`;
    const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    const headers = new Headers(init?.headers || {});
    headers.set('Authorization', `Bearer ${accessToken}`);
    if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const timeoutMs = resolveHttpTimeoutMs();
    const maxRetries = resolveHttpMaxRetries();
    let lastMessage = 'Cafe24 API 요청에 실패했습니다.';

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const response = await fetchWithTimeout(
          url,
          {
            ...init,
            headers,
            cache: 'no-store',
          },
          timeoutMs
        );
        const payload = await parseJsonResponse(response);

        if (response.status === 401 && !retried) {
          return this.requestWithAuth(path, init, true);
        }

        if (!response.ok) {
          lastMessage = parseErrorMessage(payload, response.status);
          if (attempt < maxRetries && isRetryableHttpStatus(response.status)) {
            await wait(computeRetryDelayMs(attempt));
            continue;
          }
          throw new Error(lastMessage);
        }

        return payload;
      } catch (error) {
        if (attempt < maxRetries && isRetryableNetworkError(error)) {
          await wait(computeRetryDelayMs(attempt));
          continue;
        }
        throw error;
      }
    }

    throw new Error(lastMessage);
  }
}

export function createCafe24AdminApiClient(): Cafe24AdminApiClient {
  const config = getCafe24Config();
  if (!config) {
    throw new Error('Cafe24 환경변수가 설정되지 않았습니다.');
  }
  return new Cafe24AdminApiClient(config);
}
