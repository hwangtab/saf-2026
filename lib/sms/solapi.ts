import crypto from 'crypto';

const SOLAPI_ENDPOINT = 'https://api.solapi.com/messages/v4/send';
const SOLAPI_LIST_ENDPOINT = 'https://api.solapi.com/messages/v4/list';

/** HMAC-SHA256 Authorization 헤더를 생성한다 (send·list 공용). */
function makeSolapiAuthHeader(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString('hex');
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex');
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export interface SolapiMessageStatus {
  status: string; // PENDING | SENDING | COMPLETE | FAILED
  statusCode: string; // '4000' = 수신완료, '1042' = 템플릿미승인, etc.
  reason?: string;
}

/**
 * Solapi 메시지 상태 일괄 조회 (DLR 재조정용).
 *
 * 전략: 단건 N 요청 대신, 최근 3일 range query + startKey 페이지네이션으로 전체 맵을 빌드한 뒤
 * 요청한 messageIds를 pick. 이유: Solapi API에 bulk messageId filter가 없고, 단건 조회는
 * N개 직렬/병렬 요청이 필요해 rate-limit 위험 — range 1~2 페이지로 수백 건을 한 번에 커버.
 *
 * - env 미설정 시 no-op ({} 반환).
 * - 5초 타임아웃, 1회 재시도.
 * - 오류 시 throw 없이 partial 맵 반환.
 */
export async function fetchSolapiMessageStatuses(
  messageIds: string[]
): Promise<Record<string, SolapiMessageStatus>> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  if (!apiKey || !apiSecret || messageIds.length === 0) return {};

  const result: Record<string, SolapiMessageStatus> = {};
  const targetSet = new Set(messageIds);

  // 최근 3일 범위 조회. Solapi list API는 startDate/endDate + limit + startKey 페이지네이션.
  const startDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const PAGE_LIMIT = 500; // 한 페이지 최대 (Solapi 최대 500)
  let startKey: string | undefined;

  try {
    for (let page = 0; page < 10; page++) {
      // 안전장치: 최대 10 페이지 (5,000건) — 그 이상이면 range를 좁혀야 함
      const params = new URLSearchParams({
        startDate,
        limit: String(PAGE_LIMIT),
      });
      if (startKey) params.set('startKey', startKey);

      let raw: string | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const res = await fetch(`${SOLAPI_LIST_ENDPOINT}?${params.toString()}`, {
            headers: {
              Authorization: makeSolapiAuthHeader(apiKey, apiSecret),
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (res.ok) {
            raw = await res.text();
            break;
          }
          if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
            console.error(`[solapi:dlr] list ${res.status}, retrying in 1s`);
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          console.error(`[solapi:dlr] list returned ${res.status}`);
          return result; // 부분 결과 반환
        } catch (err) {
          clearTimeout(timeout);
          if (attempt === 0) {
            console.error('[solapi:dlr] list fetch failed, retrying in 1s:', err);
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          console.error('[solapi:dlr] list fetch failed after retry:', err);
          return result;
        }
      }

      if (!raw) return result;

      let parsed: {
        messageList?: Record<string, { status?: string; statusCode?: string; reason?: string }>;
        nextKey?: string;
      } = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.error('[solapi:dlr] list response parse error');
        return result;
      }

      const messageListObj = parsed.messageList ?? {};
      for (const [msgId, msg] of Object.entries(messageListObj)) {
        if (targetSet.has(msgId)) {
          result[msgId] = {
            status: msg.status ?? '',
            statusCode: msg.statusCode ?? '',
            reason: msg.reason,
          };
        }
      }

      // 이미 모든 요청 messageId를 찾았으면 조기 종료
      if (Object.keys(result).length >= targetSet.size) break;

      // 다음 페이지 있으면 계속, 없으면 종료
      if (parsed.nextKey) {
        startKey = parsed.nextKey;
      } else {
        break;
      }
    }
  } catch (err) {
    console.error('[solapi:dlr] fetchSolapiMessageStatuses unexpected error:', err);
  }

  return result;
}

export interface SolapiResult {
  ok: boolean;
  messageId?: string;
  segment?: 'SMS' | 'LMS' | 'MMS' | 'ATA';
  error?: string;
}

/**
 * Solapi 단건 SMS 발송. resendFetch와 동일 철학:
 * env 미설정 시 no-op, never throw, 5초 타임아웃, 429/5xx 1회 재시도.
 * SMS/LMS 구분은 Solapi가 본문 byte 길이로 자동 판별.
 */
export async function sendSolapiSms(opts: { to: string; text: string }): Promise<SolapiResult> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER;
  if (!apiKey || !apiSecret || !from) return { ok: false, error: 'not-configured' };

  const body = JSON.stringify({ message: { to: opts.to, from, text: opts.text } });

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(SOLAPI_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: makeSolapiAuthHeader(apiKey, apiSecret),
          'Content-Type': 'application/json',
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const raw = await res.text();
      if (res.ok) {
        let parsed: { statusCode?: string; messageId?: string; type?: string } = {};
        try {
          parsed = JSON.parse(raw);
        } catch {
          /* 비-JSON 응답이라도 200이면 성공 취급 */
        }
        // 단건 응답 statusCode '2000' = 정상 접수. 미존재 시 200만으로 성공 취급.
        if (parsed.statusCode && parsed.statusCode !== '2000') {
          console.error(`[solapi] non-2000 statusCode: ${raw.slice(0, 300)}`);
          return { ok: false, error: parsed.statusCode };
        }
        return {
          ok: true,
          messageId: parsed.messageId,
          segment: parsed.type as SolapiResult['segment'],
        };
      }

      if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
        console.error(`[solapi] ${res.status}, retrying in 1s: ${raw.slice(0, 200)}`);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.error(`[solapi] returned ${res.status}: ${raw.slice(0, 500)}`);
      return { ok: false, error: `http_${res.status}` };
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === 0) {
        console.error('[solapi] failed, retrying in 1s:', err);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.error('[solapi] send failed after retry:', err);
      return { ok: false, error: 'network' };
    }
  }
  return { ok: false, error: 'unknown' };
}

/**
 * 카카오 알림톡 버튼. WL=웹링크, AL=앱링크, DS=배송조회, BK=봇키워드, MD=메시지전달.
 * 트랜잭션 템플릿은 대부분 버튼 없음 — 옵셔널.
 */
export interface KakaoButton {
  buttonName: string;
  buttonType: 'WL' | 'AL' | 'DS' | 'BK' | 'MD';
  linkMo?: string;
  linkPc?: string;
  linkAnd?: string;
  linkIos?: string;
}

/**
 * Solapi 카카오 알림톡 단건 발송 (알림톡 우선 → 실패 시 SMS/LMS 자동대체).
 * sendSolapiSms와 동일 철학: env 미설정 시 no-op, never throw, 5초 타임아웃, 429/5xx 1회 재시도.
 *
 * - 같은 엔드포인트·HMAC 인증. message에 kakaoOptions만 추가.
 * - disableSms:false(기본) → 알림톡 실패 시 Solapi가 message.text를 SMS/LMS로 자동 재발송.
 * - SOLAPI_KAKAO_PF_ID 또는 templateId 미설정 → sendSolapiSms({ to, text })로 graceful degrade.
 * - variables 키는 #{name} 형태로 #{} 포함, 값은 문자열.
 */
export async function sendSolapiAlimTalk(opts: {
  to: string;
  text: string;
  templateId: string;
  variables?: Record<string, string>;
  buttons?: KakaoButton[];
}): Promise<SolapiResult> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER;
  if (!apiKey || !apiSecret || !from) return { ok: false, error: 'not-configured' };

  const pfId = process.env.SOLAPI_KAKAO_PF_ID;
  // 발신프로필 또는 템플릿 미등록 → 기존 SMS-only 동작으로 degrade (심사 완료 전 안전)
  if (!pfId || !opts.templateId) {
    return sendSolapiSms({ to: opts.to, text: opts.text });
  }

  const kakaoOptions: {
    pfId: string;
    templateId: string;
    disableSms: boolean;
    variables?: Record<string, string>;
    buttons?: KakaoButton[];
  } = {
    pfId,
    templateId: opts.templateId,
    disableSms: false, // 알림톡 실패 시 message.text를 SMS/LMS로 자동대체
  };
  if (opts.variables) kakaoOptions.variables = opts.variables;
  if (opts.buttons) kakaoOptions.buttons = opts.buttons;

  const body = JSON.stringify({
    message: { to: opts.to, from, text: opts.text, kakaoOptions },
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(SOLAPI_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: makeSolapiAuthHeader(apiKey, apiSecret),
          'Content-Type': 'application/json',
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const raw = await res.text();
      if (res.ok) {
        let parsed: { statusCode?: string; messageId?: string; type?: string } = {};
        try {
          parsed = JSON.parse(raw);
        } catch {
          /* 비-JSON 응답이라도 200이면 성공 취급 */
        }
        if (parsed.statusCode && parsed.statusCode !== '2000') {
          console.error(`[solapi:alimtalk] non-2000 statusCode: ${raw.slice(0, 300)}`);
          return { ok: false, error: parsed.statusCode };
        }
        return {
          ok: true,
          messageId: parsed.messageId,
          segment: parsed.type as SolapiResult['segment'],
        };
      }

      if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
        console.error(`[solapi:alimtalk] ${res.status}, retrying in 1s: ${raw.slice(0, 200)}`);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.error(`[solapi:alimtalk] returned ${res.status}: ${raw.slice(0, 500)}`);
      return { ok: false, error: `http_${res.status}` };
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === 0) {
        console.error('[solapi:alimtalk] failed, retrying in 1s:', err);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.error('[solapi:alimtalk] send failed after retry:', err);
      return { ok: false, error: 'network' };
    }
  }
  return { ok: false, error: 'unknown' };
}
