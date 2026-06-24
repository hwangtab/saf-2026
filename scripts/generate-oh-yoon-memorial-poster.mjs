#!/usr/bin/env node
/**
 * 오윤 40주기 추도식 — SNS 세로형 모집 포스터 (1080×1350)
 *
 * 톤: 절제된 추모 정서 + 갤러리 무게감. 다크 차콜 베이스, 오프화이트 텍스트,
 *     머스터드 옐로(#FDCA40)는 날짜·회비 숫자 강조에만 소량 사용.
 * 메인 비주얼: 오윤 작가 초상(흑백 영정 톤). 하단에 실용 정보 + 신청 QR.
 *
 * 렌더링: Playwright(chromium)로 HTML → PNG 캡처
 *   (레포 표준: scripts/generate-instagram-carousels.mjs 와 동일 패턴)
 *
 * Usage: node scripts/generate-oh-yoon-memorial-poster.mjs
 * Output: output/poster/oh-yoon-memorial.png
 */
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'output', 'poster');

const OHYOON_PATH = path.join(ROOT, 'public/images/ohyoon.webp');
const OHYOON = `data:image/webp;base64,${fs.readFileSync(OHYOON_PATH).toString('base64')}`;

const APPLY_URL = 'https://www.saf2026.com/event/oh-yoon-memorial';
const QR_SRC = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=8&color=1F2428&data=${encodeURIComponent(
  APPLY_URL
)}`;

// ─── 색상 (브랜드 토큰) ───
const C = {
  base: '#1F2428', // gallery.tile (다크 챕터)
  baseDeep: '#15191c',
  ink: '#F4F1EA', // 오프화이트
  inkSoft: 'rgba(244,241,234,0.62)',
  inkFaint: 'rgba(244,241,234,0.34)',
  gold: '#FDCA40', // sun — 숫자 강조 전용
  hairline: 'rgba(244,241,234,0.16)',
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
  /* 깊이감: 상단 은은한 광원 + 하단 비네팅 */
  .vignette {
    position:absolute; inset:0; z-index:1; pointer-events:none;
    background:
      radial-gradient(120% 70% at 50% 6%, rgba(255,255,255,0.06) 0%, transparent 55%),
      radial-gradient(140% 90% at 50% 100%, rgba(0,0,0,0.55) 0%, transparent 60%);
  }
  /* 미세 그레인 */
  .grain {
    position:absolute; inset:0; z-index:2; pointer-events:none; opacity:0.05;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  }
  .wrap {
    position:relative; z-index:3;
    width:100%; height:100%;
    display:flex; flex-direction:column;
    padding:54px 76px 64px;
  }
  .eyebrow {
    display:flex; align-items:center; gap:14px;
    font-size:23px; font-weight:600; letter-spacing:5px;
    color:${C.inkSoft}; text-transform:none;
  }
  .eyebrow .dot { width:9px; height:9px; border-radius:50%; background:${C.gold}; flex-shrink:0; }

  .name-block { margin-top:4px; }
  .name { font-size:84px; font-weight:700; line-height:0.96; letter-spacing:11px; }
  .name-meta {
    margin-top:16px; display:flex; align-items:baseline; gap:18px;
    font-size:27px; color:${C.inkSoft};
  }
  .name-meta .years { font-family:'Noto Serif KR',serif; letter-spacing:2px; }
  .name-meta .role { letter-spacing:1px; }

  /* 초상 — 흑백 영정 톤 */
  .portrait-area { margin-top:20px; display:flex; justify-content:center; }
  .portrait {
    width:420px; height:280px;
    border-radius:6px; overflow:hidden; position:relative;
    box-shadow:0 30px 70px rgba(0,0,0,0.55);
    border:1px solid rgba(244,241,234,0.12);
  }
  .portrait img {
    width:100%; height:100%; object-fit:cover; object-position:50% 35%;
    filter:grayscale(1) contrast(1.05) brightness(1.02);
  }
  .quote {
    margin-top:12px; text-align:center;
    font-size:28px; font-weight:500; letter-spacing:0.5px; color:${C.ink};
  }
  .quote .mark { color:${C.gold}; opacity:0.85; }

  /* 타이틀 + 슬로건 */
  .title-area { margin-top:12px; text-align:center; }
  .title { font-size:56px; font-weight:700; letter-spacing:3px; }
  .slogan {
    margin-top:10px; font-size:30px; font-weight:500; line-height:1.34;
    color:rgba(244,241,234,0.82);
  }

  .rule { height:1px; background:${C.hairline}; margin:13px 0 13px; }

  /* 정보 블록 2×2 */
  .info { display:grid; grid-template-columns:1fr 1fr; gap:11px 30px; }
  .info .cell { display:flex; flex-direction:column; gap:9px; }
  .info .label {
    font-size:21px; font-weight:600; letter-spacing:3px; color:${C.inkFaint};
  }
  .info .value { font-size:30px; font-weight:600; line-height:1.32; color:${C.ink}; }
  .info .value .num { color:${C.gold}; }

  /* CTA + QR */
  .cta {
    margin-top:16px; display:flex; align-items:center; justify-content:space-between;
  }
  .cta-text .apply { font-size:24px; font-weight:600; letter-spacing:4px; color:${C.gold}; }
  .cta-text .url { margin-top:10px; font-size:30px; font-weight:600; color:${C.ink}; }
  .cta-text .host { margin-top:14px; font-size:22px; color:${C.inkFaint}; }
  .qr {
    width:138px; height:138px; flex-shrink:0;
    background:${C.ink}; border-radius:14px; padding:13px;
    box-shadow:0 14px 36px rgba(0,0,0,0.45);
  }
  .qr img { width:100%; height:100%; display:block; }
</style></head>
<body>
  <div class="vignette"></div>
  <div class="grain"></div>
  <div class="wrap">
    <div class="name-block">
      <div class="name serif">오윤</div>
      <div class="name-meta">
        <span class="years">1946 – 1986</span>
        <span class="role">한국 민중미술의 거장</span>
      </div>
    </div>

    <div class="portrait-area">
      <div class="portrait"><img src="${OHYOON}" alt="오윤 초상"></div>
    </div>

    <div class="quote serif"><span class="mark">“</span>미술은 많은 사람이 나누어야 한다<span class="mark">”</span></div>

    <div class="title-area">
      <div class="title serif">오윤 40주기 추도식</div>
      <div class="slogan ka serif">그가 칼을 내려놓은 그 여름,<br>마흔 번째 해에</div>
    </div>

    <div class="rule"></div>

    <div class="info">
      <div class="cell">
        <div class="label">일시</div>
        <div class="value"><span class="num">2026. 7. 5.</span> (일)<br>오전 <span class="num">9:30</span> 출발</div>
      </div>
      <div class="cell">
        <div class="label">집결</div>
        <div class="value">인사동<br>수운회관 옆</div>
      </div>
      <div class="cell">
        <div class="label">회비</div>
        <div class="value"><span class="num">30,000원</span><br>점심 포함</div>
      </div>
      <div class="cell">
        <div class="label">정원</div>
        <div class="value">45인승 버스<br>1대 선착순</div>
      </div>
    </div>

    <div class="cta">
      <div class="cta-text">
        <div class="apply">참가 신청</div>
        <div class="url">saf2026.com</div>
        <div class="host">한국스마트협동조합 · contact@kosmart.org</div>
      </div>
      <div class="qr"><img src="${qrDataUrl}" alt="신청 QR"></div>
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

  const out = path.join(OUT, 'oh-yoon-memorial.png');
  await page.screenshot({ path: out, type: 'png' });

  await browser.close();
  console.log(`✅ 완료 → ${out}`);
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
