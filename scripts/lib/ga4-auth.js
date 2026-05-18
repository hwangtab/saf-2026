/**
 * GA4 인증 공유 모듈 (CommonJS — scripts/* 전용).
 *
 * 인증 우선순위:
 *  1. GA4_SERVICE_ACCOUNT_KEY (JSON string) — googleapis JWT, 영구 동작
 *  2. GA4_OAUTH_CLIENT_ID + SECRET + REFRESH_TOKEN — OAuth fallback
 *  3. GA4_ACCESS_TOKEN — local dev 즉석 (1시간 만료)
 *
 * 사용:
 *   const { PROPERTY_ID, runReport, apiCall } = require('./lib/ga4-auth');
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');

// .env.local 자동 로드 (scripts/* 위치 기준 → 프로젝트 루트)
const envPath = path.join(__dirname, '..', '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    });
}

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const DATA_API_URL = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`;

let _saClient = null;
let _oauthToken = null;
let _oauthExpiresAt = 0;

function _getSaClient() {
  if (_saClient) return _saClient;
  const keyJson = process.env.GA4_SERVICE_ACCOUNT_KEY;
  if (!keyJson) return null;
  try {
    const key = JSON.parse(keyJson);
    _saClient = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });
    return _saClient;
  } catch {
    return null;
  }
}

async function getAccessToken() {
  // 1. Service Account
  const sa = _getSaClient();
  if (sa) {
    const result = await sa.getAccessToken();
    if (result.token) return result.token;
  }

  // 2. OAuth refresh
  if (process.env.GA4_OAUTH_CLIENT_ID && process.env.GA4_OAUTH_REFRESH_TOKEN) {
    if (_oauthToken && Date.now() < _oauthExpiresAt) return _oauthToken;
    const params = new URLSearchParams({
      client_id: process.env.GA4_OAUTH_CLIENT_ID,
      client_secret: process.env.GA4_OAUTH_CLIENT_SECRET,
      refresh_token: process.env.GA4_OAUTH_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    });
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      throw new Error(
        `GA4 OAuth refresh 실패 (${res.status}). ` +
          `GA4_SERVICE_ACCOUNT_KEY 설정을 권장합니다.\n` +
          `  응답: ${JSON.stringify(data)}`
      );
    }
    _oauthToken = data.access_token;
    _oauthExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return _oauthToken;
  }

  // 3. Dev manual token (1시간 만료, 로컬 전용)
  if (process.env.GA4_ACCESS_TOKEN) return process.env.GA4_ACCESS_TOKEN;

  throw new Error(
    'GA4 인증 미설정.\n' +
      '  영구: GA4_SERVICE_ACCOUNT_KEY=<service-account-json-string>\n' +
      '  임시: GA4_OAUTH_CLIENT_ID + GA4_OAUTH_CLIENT_SECRET + GA4_OAUTH_REFRESH_TOKEN\n' +
      '  개발: GA4_ACCESS_TOKEN=<1시간짜리 토큰>'
  );
}

async function runReport(body) {
  if (!PROPERTY_ID) throw new Error('GA4_PROPERTY_ID 미설정');
  const token = await getAccessToken();
  const res = await fetch(DATA_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GA4 runReport ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// Admin API·기타 엔드포인트 호출용 (ga4-property-diag.js 등)
async function apiCall(url, body) {
  const token = await getAccessToken();
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { rawTextPreview: text.slice(0, 200) };
  }
  return { ok: res.ok, status: res.status, data };
}

module.exports = { PROPERTY_ID, getAccessToken, runReport, apiCall };
