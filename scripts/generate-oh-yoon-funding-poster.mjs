#!/usr/bin/env node
/**
 * 오윤 테라코타 벽화 이전 모금 — SNS 세로형 펀딩 포스터 (1080×1350)
 *
 * 톤: 추도식 포스터와 같은 다크 갤러리 시리즈 + "사라지기 전에"의 조용한 절박함.
 *     머스터드 옐로(#FDCA40)는 목표액·마감 숫자에만.
 * 메인 비주얼: 1974 구의동 테라코타 인체 부조(흑백 톤) + 오윤 초상 원형 인서트.
 * 서사 중심 — 목표·마감만 살짝, 리워드/진행률은 페이지로 위임.
 *
 * 렌더링: Playwright(chromium)로 HTML → PNG 캡처
 *   (레포 표준: scripts/generate-instagram-carousels.mjs 와 동일 패턴)
 *
 * Usage: node scripts/generate-oh-yoon-funding-poster.mjs
 * Output: output/poster/oh-yoon-funding.png
 */
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'output', 'poster');

const dataUrl = (rel, mime) =>
  `data:${mime};base64,${fs.readFileSync(path.join(ROOT, rel)).toString('base64')}`;
const MURAL = dataUrl('public/images/petition-oh-yoon/mural-1.png', 'image/png');
const OHYOON = dataUrl('public/images/ohyoon.webp', 'image/webp');

const APPLY_URL = 'https://www.saf2026.com/funding/oh-yoon-terracotta';
const QR_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=8&color=1F2428&data=${encodeURIComponent(
  APPLY_URL
)}`;

// ─── 색상 (Aged Hanji — 오래된 한지의 ochre·오렌지 톤) ───
// 오윤이 즐겨 쓰던 한지가 세월에 물든 빛. 텍스트는 한지 위 먹/안료처럼 밝은 아이보리,
// 강조(숫자·CTA)는 페일골드. 전체 웜톤 단색조.
const C = {
  base: '#B5542B', // Aged Hanji Orange (deep)
  baseDeep: '#9A4421', // 가장자리 음영용 더 진한 오렌지
  ink: '#F8F1E2', // Hanji Ivory — 본문/헤딩
  inkSoft: 'rgba(248,241,226,0.74)', // 보조
  inkFaint: 'rgba(248,241,226,0.52)', // 캡션
  gold: '#FCE3A0', // Pale Gold — 숫자 강조 (오렌지 위 가독)
  primary: '#FCE3A0', // CTA 강조 (페일골드)
  primaryDot: '#FCE3A0', // 장식 도트
  hairline: 'rgba(248,241,226,0.26)',
};

async function fetchDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed ${res.status}: ${url}`);
  const mime = res.headers.get('content-type') ?? 'image/png';
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function html(qrDataUrl) {
  return `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700;900&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1080px; height:1350px; }
  body {
    font-family:'Pretendard',sans-serif;
    -webkit-font-smoothing:antialiased;
    color:${C.ink};
    background:${C.base};
    overflow:hidden;
    position:relative;
  }
  .serif { font-family:'Noto Serif KR',serif; }
  .ka { word-break:keep-all; }
  .vignette {
    position:absolute; inset:0; z-index:1; pointer-events:none;
    background:
      radial-gradient(110% 65% at 50% 4%, rgba(255,214,150,0.14) 0%, transparent 56%),
      radial-gradient(130% 80% at 50% 102%, ${C.baseDeep} 0%, transparent 58%);
  }
  .wrap {
    position:relative; z-index:3;
    width:100%; height:100%;
    display:flex; flex-direction:column;
    padding:56px 76px 60px;
  }
  .eyebrow {
    display:flex; align-items:center; gap:14px;
    font-size:23px; font-weight:600; letter-spacing:5px; color:${C.inkSoft};
  }
  .eyebrow .dot { width:9px; height:9px; border-radius:50%; background:${C.primaryDot}; flex-shrink:0; }

  .slogan { margin-top:22px; font-size:74px; font-weight:700; line-height:1.12; letter-spacing:1px; }

  /* 메인 벽화 — 흑백 톤 */
  .mural-area { margin-top:30px; }
  .mural {
    width:100%; height:392px; position:relative;
    border-radius:6px; overflow:hidden;
    box-shadow:0 26px 60px rgba(60,22,8,0.42);
    border:2px solid ${C.hairline};
  }
  .mural img {
    width:100%; height:100%; object-fit:cover; object-position:50% 42%;
    filter:contrast(1.06) saturate(1.06);
  }
  .caption {
    margin-top:13px; font-size:22px; letter-spacing:0.5px; color:${C.inkFaint};
  }

  /* 작가 연결 — 초상 원형 인서트 */
  .artist { margin-top:24px; display:flex; align-items:center; gap:20px; }
  .artist .face {
    width:78px; height:78px; border-radius:50%; overflow:hidden; flex-shrink:0;
    border:1px solid ${C.hairline};
  }
  .artist .face img { width:100%; height:100%; object-fit:cover; object-position:50% 16%; filter:contrast(1.02); }
  .artist .name { font-family:'Noto Serif KR',serif; font-size:30px; font-weight:600; }
  .artist .sub { margin-top:5px; font-size:24px; color:${C.inkSoft}; }

  /* 서사 */
  .story {
    margin-top:26px; font-size:31px; font-weight:500; line-height:1.55; color:${C.ink};
  }

  .rule { height:1px; background:${C.hairline}; margin:26px 0 22px; }

  /* 목표 / 마감 */
  .goal { display:flex; align-items:flex-end; justify-content:space-between; }
  .goal .target { font-size:30px; font-weight:600; }
  .goal .target .num { color:${C.gold}; }
  .goal .target .note { display:block; margin-top:6px; font-size:22px; font-weight:500; color:${C.inkSoft}; }
  .goal .deadline { text-align:right; }
  .goal .deadline .label { font-size:20px; letter-spacing:3px; color:${C.inkFaint}; }
  .goal .deadline .date { margin-top:6px; font-size:30px; font-weight:600; color:${C.gold}; }

  /* CTA + QR */
  .cta { margin-top:26px; display:flex; align-items:center; justify-content:space-between; }
  .cta-text .apply { font-size:24px; font-weight:700; letter-spacing:4px; color:${C.primary}; }
  .cta-text .url { margin-top:10px; font-size:30px; font-weight:600; color:${C.ink}; }
  .cta-text .host { margin-top:14px; font-size:21px; color:${C.inkFaint}; }
  .qr { width:138px; height:138px; flex-shrink:0; background:#FFFFFF; border:1px solid ${C.hairline}; border-radius:14px; padding:13px; box-shadow:0 12px 30px rgba(31,36,40,0.12); }
  .qr img { width:100%; height:100%; display:block; }
</style></head>
<body>
  <div class="vignette"></div>
  <div class="wrap">
    <div class="eyebrow"><span class="dot"></span>시민 모금 · 씨앗페 2026</div>

    <div class="slogan serif">오윤이 손으로 새긴 벽이,<br>사라지기 전에</div>

    <div class="mural-area">
      <div class="mural"><img src="${MURAL}" alt="1974 구의동 테라코타 부조"></div>
      <div class="caption">오윤, 1974 · 구의동 테라코타 양면 부조</div>
    </div>

    <div class="artist">
      <div class="face"><img src="${OHYOON}" alt="오윤 초상"></div>
      <div>
        <div class="name">故 오윤 <span style="font-size:22px;color:${C.inkSoft};font-weight:500;">1946–1986</span></div>
        <div class="sub">그가 스물여덟에 새긴 벽</div>
      </div>
    </div>

    <div class="story ka serif">건물 철거가 예정된 2026년 8월.<br>벽이 무너지기 전에, 시민의 힘으로 작품을 먼저 옮깁니다.</div>

    <div class="rule"></div>

    <div class="goal">
      <div class="target">목표 <span class="num">1억 원</span>
        <span class="note">모인 만큼 즉시 작품 이전에 집행</span>
      </div>
      <div class="deadline">
        <div class="label">마감</div>
        <div class="date">2026. 7. 31.</div>
      </div>
    </div>

    <div class="cta">
      <div class="cta-text">
        <div class="apply">후원하기</div>
        <div class="url">saf2026.com</div>
        <div class="host">한국스마트협동조합 · 리워드형 후원</div>
      </div>
      <div class="qr"><img src="${qrDataUrl}" alt="후원 QR"></div>
    </div>
  </div>
</body></html>`;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  console.log('⬇️  QR 코드 가져오는 중...');
  const qrDataUrl = await fetchDataUrl(QR_SRC);

  console.log('🚀 브라우저 실행...');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  await page.setContent(html(qrDataUrl), { waitUntil: 'load', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);

  const out = path.join(OUT, 'oh-yoon-funding.png');
  await page.screenshot({ path: out, type: 'png' });

  await browser.close();
  console.log(`✅ 완료 → ${out}`);
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
