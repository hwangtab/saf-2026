#!/usr/bin/env node
/**
 * SAF 2026 Instagram Carousel Image Generator v3
 * - 인스타그램 모바일 최적화: 모든 텍스트/그래프 대폭 확대
 * - 모든 슬라이드에 작품/히어로 이미지 배경 + 오버레이
 * - 통계는 시각적 그래프(바, 도넛, 게이지)로 표현
 * - URL 통일: saf2026.com
 * - 66장 (S1~S9), 1080×1350px
 *
 * Usage: node scripts/generate-instagram-carousels.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'output', 'instagram-carousels');

const C = {
  primary: '#2176FF', gold: '#FDCA40', charcoal: '#31393C',
  red: '#D94F45', green: '#2E9F7B', blueVeil: '#EDF3FF',
  sandMist: '#FFF9E8', white: '#FFFFFF',
};

const URL_MAIN = 'saf2026.com';

const file = (rel) => `file://${path.join(ROOT, rel)}`;
const hero = (n) => file(`public/images/hero/${n}.jpg`);
const logoW = file('public/images/logo/320pxX90px_white.webp');

// ─── Artwork URLs (배경용 + 스포트라이트용) ───
const BG = [
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/bfcb5ff5-e1b9-474a-b37d-7c3aa344fa28/037rx7aya2mc_1774968363998.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/admin-artwork-c0f6176c-5460-46e6-a503-c8cfeba4583a/ue4mbbgbfw_1773366850821.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/855d527e-9ee5-4ed4-9b2c-a27c9fb90aa0/247__original.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/admin-artwork-6009bbeb-fa25-4099-a1a9-518cc6498894/2rhwb0kyuvj_1771896747137__original.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/a8d68dcb-f8c5-4e40-9705-b2bb95f18190/234__original.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/438e60e0-0d0f-4ed2-a5cc-a3c0a0756329/278__original.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/c8839e5b-46a9-490d-a142-74f6d2b99be7/279__original.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/admin-artwork-96252f66-006c-4291-b0b3-143cbb6cf1df/5yst68jz1kq_1771896737666__original.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/52701ac8-6f38-465d-b6cb-229dcc454e4b/272__original.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/498c2734-f036-4822-98a7-80ed53a4c17f/x6oe3pvro4f_1771574933811__original.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/6013c2fb-9efb-4695-855f-18c892c9bbe6/265__original.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/admin-artwork-b7b009d8-48f6-4ccc-b29e-8fd1a2a061a0/sydjgmparpd_1773366836612.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/admin-artwork-d12fb450-3d9e-4113-9a93-c7bb347e1727/1flqj8rpkkt_1773366843706.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/31950760-2c0f-43b7-8b42-39a8a5b8f992/258__original.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/bfcb5ff5-e1b9-474a-b37d-7c3aa344fa28/pvnthqu3z6_1770991227778__original.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/7abe1f77-c8db-4b07-8ffa-c0d91e26b480/275__original.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/11507750-e624-432a-9fc2-249561633e75/274__original.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/0ddf36d2-5171-48f5-8402-c9ab188e4b3f/277__original.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/admin-artwork-e144402b-6a15-4d33-bf11-b625cfa5c777/8eme3lhd3xt_1771896713951__original.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/admin-artwork-68b671d8-106e-4c6f-9e81-9c21956e544e/34ccfstd2py_1773290111280.webp',
  'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/bfcb5ff5-e1b9-474a-b37d-7c3aa344fa28/090jwsq07pwe_1770991182286__original.webp',
];

const ART = {
  s4: [
    { artist:'심모비', title:'9505 SIM_Memory', price:'₩500,000', material:'캔버스에 아크릴 채색', size:'45.5×37.9cm', img:BG[0] },
    { artist:'박재동', title:'도시풍경', price:'₩5,000,000', material:'수채화', size:'34.5×24cm', img:BG[1] },
    { artist:'이문형', title:'책거리×살바도르 달리', price:'₩840,000', material:'한지위에 수묵채색', size:'60.6×40.9cm', img:BG[2] },
    { artist:'민병산', title:'수하석상', price:'₩5,000,000', material:'종이에 먹', size:'135.3×24cm', img:BG[13] },
    { artist:'박재동', title:'바닷가의 소년', price:'₩5,000,000', material:'수채화', size:'확인 중', img:BG[11] },
    { artist:'박생광', title:'쏘가리', price:'₩2,000,000', material:'종이에 연필', size:'25×18cm', img:BG[6] },
    { artist:'박재동', title:'고향 마을 풍경', price:'₩4,000,000', material:'수채화', size:'34.5×24cm', img:BG[12] },
  ],
  s5: [
    { artist:'이철수', title:'마음항아리', price:'₩1,200,000', material:'목판, 한지', size:'50×42cm', img:BG[3] },
    { artist:'이철수', title:'용비어천가', price:'₩4,000,000', material:'목판, 한지', size:'130×60cm', img:BG[7] },
    { artist:'이열', title:'기억의 푸른 바오밥', price:'₩150,000', material:'Pigment ink-jet', size:'21×29.7cm', img:BG[5] },
    { artist:'김남진', title:'누드', price:'₩500,000', material:'1/5 프린트', size:'확인 중', img:BG[8] },
    { artist:'림지언', title:'진달래진달래', price:'₩300,000', material:'Digital Painting', size:'33.4×45.5cm', img:BG[9] },
    { artist:'박재동', title:'할머니', price:'₩300,000', material:'Pigment on watercolor', size:'21×29.7cm', img:BG[19] },
    { artist:'이철수', title:'에고, 이 얼굴이 네 얼굴이냐?', price:'₩1,200,000', material:'목판, 한지', size:'50×42cm', img:BG[18] },
  ],
  s6: [
    { artist:'양순열', title:'Ottogi_Mother Ya-ho', price:'₩25,000,000', material:'Car paint on resin', size:'55×55×120cm', img:BG[4] },
    { artist:'김주호', title:'사랑만들기', price:'₩1,000,000', material:'조각 철판 8T', size:'33×20×9cm', img:BG[10] },
    { artist:'김정원', title:'손 모은 사람', price:'₩100,000', material:'확인 중', size:'25.4×19.2cm', img:BG[17] },
    { artist:'심모비', title:'9407 SIM_Visibility', price:'₩800,000', material:'믹스미디어', size:'45.5×53cm', img:BG[14] },
    { artist:'작가미상', title:'오리', price:'₩300,000', material:'도자', size:'18×27×11cm', img:BG[15] },
    { artist:'이동구', title:'보리술잔', price:'₩30,000', material:'도자', size:'12.7×10.7cm', img:BG[16] },
    { artist:'심모비', title:'9406 SIM_Visibility', price:'₩800,000', material:'믹스미디어', size:'45.5×53cm', img:BG[20] },
  ],
};

const HT = {
  s1:`#씨앗페2026 #SAF2026 #예술인상호부조 #예술인금융차별`,
  s2:`#씨앗페2026 #SAF2026 #예술인상호부조 #예술인현실`,
  s3:`#씨앗페2026 #SAF2026 #상호부조 #씨앗기금`,
  s4:`#씨앗페2026 #SAF2026 #아트페어 #현대미술 #회화`,
  s5:`#씨앗페2026 #SAF2026 #아트페어 #판화 #사진`,
  s6:`#씨앗페2026 #SAF2026 #아트페어 #조각 #공예`,
  s7:`#씨앗페2026 #SAF2026 #투명경영 #95퍼센트상환율`,
  s8:`#씨앗페2026 #SAF2026 #예술후원 #전시추천`,
  s9:`#오윤 #OhYoon #민중미술 #목판화 #오윤40주기 #씨앗페2026 #SAF2026`,
};

// ─── 오윤 작품 이미지 URLs ───
const SUPABASE = 'https://vqejnuntjnxzpgwfndtv.supabase.co/storage/v1/object/public/artworks/398f3739-b81e-4ba8-bcd0-fed2e53d3dc8';
const OY = {
  낮도깨비: `${SUPABASE}/154__original.webp`,
  칼노래:   `${SUPABASE}/151__original.webp`,
  석양:     `${SUPABASE}/156__original.webp`,
  무호도:   `${SUPABASE}/153__original.webp`,
  대지:     `${SUPABASE}/213__original.webp`,
  팔엽일화: `${SUPABASE}/211__original.webp`,
  봄의소리1:`${SUPABASE}/149__original.webp`,
  귀향:     `${SUPABASE}/212__original.webp`,
};
const ohyoon = file('public/images/ohyoon.webp');

// ═══════════════════════════════════════════════
// HTML FRAMEWORK — 모바일 최적화 대형 사이즈
// ═══════════════════════════════════════════════

const FONTS = `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet">`;

const CSS = `
*{margin:0;padding:0;box-sizing:border-box;}
body{width:1080px;height:1350px;overflow:hidden;font-family:'Pretendard',sans-serif;-webkit-font-smoothing:antialiased;position:relative;}
.m{font-family:'Montserrat',sans-serif;}
.s{width:100%;height:100%;display:flex;flex-direction:column;position:relative;overflow:hidden;}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;}
.ov{position:absolute;inset:0;z-index:1;}
.z{position:relative;z-index:2;}
.p{padding:56px 64px;}
.ka{word-break:keep-all;}
.wm{position:absolute;bottom:32px;right:36px;opacity:0.15;height:36px;z-index:3;}
.pn{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);font-size:22px;letter-spacing:4px;opacity:0.35;font-family:'Montserrat',sans-serif;font-weight:600;z-index:3;}
.glass{background:rgba(255,255,255,0.08);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.12);border-radius:24px;}
.glass-dark{background:rgba(0,0,0,0.3);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-radius:24px;}
.card{border-radius:24px;padding:44px;}
`;

function pg(body, { bgImg, overlayStyle, color='#fff', pn, total, logo=logoW, extraCss='' }={}) {
  const w = logo ? `<img class="wm" src="${logo}" alt="">` : '';
  const p = pn && total ? `<div class="pn" style="color:${color};">${pn} / ${total}</div>` : '';
  const bgEl = bgImg ? `<img class="bg" src="${bgImg}" alt="" style="filter:blur(4px) saturate(1.2) brightness(0.4);transform:scale(1.05);">` : '';
  const ovEl = overlayStyle ? `<div class="ov" style="${overlayStyle}"></div>` : '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">${FONTS}<style>${CSS}${extraCss}</style></head>
<body><div class="s">${bgEl}${ovEl}${body}</div>${w}${p}</body></html>`;
}

// ═══════════════════════════════════════════════
// S1: 숫자가 말하는 현실 — 그래프 중심
// ═══════════════════════════════════════════════

function s1() {
  const t = 7;
  const a = C.primary;

  return [
    // 1. 커버 — 작품 배경 + 게이지
    pg(`
      <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:20px;">
        <div style="font-size:24px;font-weight:600;color:${C.gold};letter-spacing:6px;">SERIES 01</div>
        <!-- 반원 게이지 -->
        <div style="width:560px;height:280px;position:relative;overflow:hidden;margin:8px 0;">
          <div style="width:560px;height:560px;border-radius:50%;border:44px solid rgba(255,255,255,0.1);position:absolute;top:0;"></div>
          <div style="width:560px;height:560px;border-radius:50%;border:44px solid ${a};border-color:${a} ${a} transparent transparent;transform:rotate(-66deg);position:absolute;top:0;"></div>
          <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);text-align:center;">
            <span class="m" style="font-size:140px;font-weight:900;color:${C.white};">84.9</span><span class="m" style="font-size:56px;color:${a};font-weight:700;">%</span>
          </div>
        </div>
        <h1 style="font-size:64px;font-weight:700;color:#fff;line-height:1.4;" class="ka">
          은행 문턱을 넘지 못하는<br>한국 예술인의 현실
        </h1>
        <div style="font-size:26px;opacity:0.4;color:#fff;letter-spacing:6px;margin-top:16px;">스와이프 →</div>
      </div>
    `, { bgImg:BG[4], overlayStyle:`background:linear-gradient(180deg,${C.charcoal}ee 0%,${a}88 100%);`, pn:1, total:t }),

    // 2. 가로 바 차트 — 금융 접근성
    pg(`
      <div class="z s p" style="justify-content:center;gap:36px;">
        <div style="font-size:24px;color:${C.gold};font-weight:600;letter-spacing:4px;">FINANCIAL ACCESS</div>
        <h2 style="font-size:56px;font-weight:700;color:#fff;" class="ka">예술인 금융 접근성</h2>
        <div style="margin-top:12px;">
          ${[
            { label:'직접 거절', pct:53.1, color:a },
            { label:'신청 포기', pct:31.8, color:'#5BA3FF' },
            { label:'접근 가능', pct:15.1, color:'rgba(255,255,255,0.15)' },
          ].map(b => `
            <div style="margin-bottom:32px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
                <span style="font-size:32px;color:#fff;font-weight:500;">${b.label}</span>
                <span class="m" style="font-size:36px;color:${b.color === 'rgba(255,255,255,0.15)' ? 'rgba(255,255,255,0.4)' : b.color};font-weight:700;">${b.pct}%</span>
              </div>
              <div style="height:52px;background:rgba(255,255,255,0.08);border-radius:26px;overflow:hidden;">
                <div style="height:100%;width:${b.pct}%;background:${b.color};border-radius:26px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="glass" style="padding:32px 40px;margin-top:4px;">
          <div style="font-size:30px;color:rgba(255,255,255,0.8);" class="ka">예술인 <strong style="color:${C.gold};">10명 중 8.5명</strong>이 제1금융권을 이용할 수 없습니다</div>
        </div>
      </div>
    `, { bgImg:BG[3], overlayStyle:`background:linear-gradient(135deg,${C.charcoal}ee,${a}44);`, pn:2, total:t }),

    // 3. 거절 사유 — 수평 바 차트
    pg(`
      <div class="z s p" style="justify-content:center;gap:36px;">
        <div style="font-size:24px;color:${C.gold};font-weight:600;letter-spacing:4px;">REJECTION REASONS</div>
        <h2 style="font-size:56px;font-weight:700;color:#fff;">대출 거절 사유</h2>
        ${[
          { label:'고정수입 없음', v:65, icon:'💼' },
          { label:'낮은 신용등급', v:58, icon:'📉' },
          { label:'담보 부족', v:52, icon:'🏠' },
          { label:'고용 불안정', v:48, icon:'⚡' },
        ].map(b => `
          <div style="display:flex;align-items:center;gap:20px;">
            <div style="font-size:48px;width:64px;text-align:center;">${b.icon}</div>
            <div style="flex:1;">
              <div style="font-size:28px;color:rgba(255,255,255,0.7);margin-bottom:10px;">${b.label}</div>
              <div style="height:56px;background:rgba(255,255,255,0.06);border-radius:28px;overflow:hidden;position:relative;">
                <div style="height:100%;width:${(b.v/65)*100}%;background:linear-gradient(90deg,${a},${C.gold});border-radius:28px;display:flex;align-items:center;justify-content:flex-end;padding-right:24px;">
                  <span class="m" style="font-size:30px;font-weight:800;color:${C.charcoal};">${b.v}</span>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `, { bgImg:BG[2], overlayStyle:`background:${C.charcoal}e8;`, pn:3, total:t }),

    // 4. 고금리 노출 — 도넛 차트
    pg(`
      <div class="z s p" style="justify-content:center;align-items:center;gap:32px;">
        <div style="font-size:24px;color:${C.gold};font-weight:600;letter-spacing:4px;">HIGH INTEREST EXPOSURE</div>
        <h2 style="font-size:48px;font-weight:700;color:#fff;" class="ka">고금리 금융상품 노출</h2>
        <!-- 도넛 차트 -->
        <div style="width:440px;height:440px;border-radius:50%;position:relative;
          background:conic-gradient(${C.red} 0% 42%,#FF8C42 42% 80%,${C.gold} 80% 100%);
          display:flex;align-items:center;justify-content:center;">
          <div style="width:290px;height:290px;border-radius:50%;background:${C.charcoal};display:flex;align-items:center;justify-content:center;flex-direction:column;">
            <span class="m" style="font-size:88px;font-weight:900;color:#fff;">48.6</span>
            <span style="font-size:28px;color:rgba(255,255,255,0.5);">%</span>
          </div>
        </div>
        <div style="display:flex;gap:36px;">
          ${[
            { label:'카드론', pct:'42%', color:C.red },
            { label:'현금서비스', pct:'38%', color:'#FF8C42' },
            { label:'소액대출', pct:'22%', color:C.gold },
          ].map(x => `
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:20px;height:20px;border-radius:50%;background:${x.color};"></div>
              <span style="font-size:28px;color:rgba(255,255,255,0.7);">${x.label} <strong class="m" style="color:#fff;">${x.pct}</strong></span>
            </div>
          `).join('')}
        </div>
      </div>
    `, { bgImg:BG[7], overlayStyle:`background:${C.charcoal}ea;`, pn:4, total:t }),

    // 5. 이자율 비교 — 비주얼 바
    pg(`
      <div class="z s p" style="justify-content:center;gap:36px;">
        <div style="font-size:24px;color:${C.gold};font-weight:600;letter-spacing:4px;">INTEREST RATE GAP</div>
        <h2 style="font-size:56px;font-weight:700;color:#fff;" class="ka">이자율 격차</h2>
        <div style="display:flex;gap:28px;align-items:flex-end;height:480px;padding-top:20px;">
          <!-- 시중은행 바 -->
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
            <div style="width:100%;height:22%;background:linear-gradient(180deg,${C.green},${C.green}88);border-radius:20px 20px 8px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:120px;">
              <span class="m" style="font-size:60px;font-weight:900;color:#fff;">3~5%</span>
            </div>
            <div style="margin-top:24px;text-align:center;">
              <div style="font-size:32px;color:${C.green};font-weight:600;">시중은행</div>
              <div style="font-size:24px;color:rgba(255,255,255,0.4);margin-top:6px;">일반 시중금리</div>
            </div>
          </div>
          <!-- 예술인 바 -->
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
            <div style="width:100%;height:75%;background:linear-gradient(180deg,${C.red},${C.red}88);border-radius:20px 20px 8px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;">
              <span class="m" style="font-size:60px;font-weight:900;color:#fff;">15~20%</span>
            </div>
            <div style="margin-top:24px;text-align:center;">
              <div style="font-size:32px;color:${C.red};font-weight:600;">예술인 평균</div>
              <div style="font-size:24px;color:rgba(255,255,255,0.4);margin-top:6px;">카드론·현금서비스</div>
            </div>
          </div>
        </div>
        <div class="glass" style="padding:28px 36px;text-align:center;">
          <span style="font-size:30px;color:rgba(255,255,255,0.8);" class="ka">예술인이 부담하는 이자는 일반인의 <strong style="color:${C.gold};">3~5배</strong></span>
        </div>
      </div>
    `, { bgImg:BG[5], overlayStyle:`background:${C.charcoal}eb;`, pn:5, total:t }),

    // 6. 88.3% 창작 중단 — 원형 게이지
    pg(`
      <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:28px;">
        <div style="font-size:24px;color:${C.gold};font-weight:600;letter-spacing:4px;">IMPACT ON CREATION</div>
        <!-- 원형 게이지 -->
        <div style="width:460px;height:460px;border-radius:50%;position:relative;
          background:conic-gradient(${C.red} 0% 88.3%,rgba(255,255,255,0.08) 88.3% 100%);
          display:flex;align-items:center;justify-content:center;">
          <div style="width:340px;height:340px;border-radius:50%;background:${C.charcoal};display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;">
            <span class="m" style="font-size:100px;font-weight:900;color:${C.red};">88.3%</span>
            <span style="font-size:28px;color:rgba(255,255,255,0.5);">창작 활동 중단</span>
          </div>
        </div>
        <h2 style="font-size:44px;font-weight:600;color:#fff;line-height:1.5;" class="ka">
          채무 추심을 경험한 예술인의<br>대다수가 창작을 멈춥니다
        </h2>
        <div style="width:60px;height:4px;background:${C.red};border-radius:2px;"></div>
        <p style="font-size:32px;color:rgba(255,255,255,0.45);" class="ka">한 번 멈추면, 돌아오지 못합니다</p>
      </div>
    `, { bgImg:hero(7), overlayStyle:`background:${C.charcoal}e5;`, pn:6, total:t }),

    // 7. CTA
    pg(`
      <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:40px;">
        <h1 style="font-size:76px;font-weight:700;color:#fff;line-height:1.4;" class="ka">
          이 숫자를<br>바꿀 수 있습니다
        </h1>
        <div style="width:80px;height:4px;background:${C.gold};border-radius:2px;"></div>
        <div class="m" style="font-size:44px;font-weight:700;color:${C.gold};letter-spacing:2px;">${URL_MAIN}</div>
        <div class="glass" style="padding:32px 48px;">
          <div style="font-size:24px;color:rgba(255,255,255,0.6);line-height:2.2;">${HT.s1}</div>
        </div>
      </div>
    `, { bgImg:hero(15), overlayStyle:`background:linear-gradient(180deg,${a}dd,${C.charcoal}cc);`, pn:7, total:t }),
  ];
}

// ═══════════════════════════════════════════════
// S2: 예술인의 목소리
// ═══════════════════════════════════════════════

function s2() {
  const t = 8;
  const a = C.red;

  const quote = (text, author, cat, bgIdx, num) => pg(`
    <div class="z s p" style="justify-content:center;gap:28px;">
      <div style="font-size:22px;color:${C.gold};font-weight:600;letter-spacing:4px;">${cat}</div>
      <div style="display:flex;gap:28px;">
        <div style="width:6px;background:linear-gradient(180deg,${a},${a}44);border-radius:3px;flex-shrink:0;"></div>
        <div>
          <div style="font-size:140px;color:${a};opacity:0.3;line-height:0.5;font-family:Georgia,serif;">"</div>
          <p style="font-size:44px;font-weight:500;color:#fff;line-height:1.7;margin-top:20px;" class="ka">${text}</p>
          <div style="margin-top:36px;font-size:30px;color:rgba(255,255,255,0.4);">— ${author}</div>
        </div>
      </div>
    </div>
  `, { bgImg:BG[bgIdx], overlayStyle:`background:${C.charcoal}e5;`, pn:num, total:t });

  return [
    // 커버
    pg(`
      <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:20px;">
        <div style="font-size:26px;color:${C.gold};font-weight:600;letter-spacing:6px;">SERIES 02</div>
        <div style="font-size:240px;color:${a};opacity:0.2;font-family:Georgia,serif;line-height:0.7;">"</div>
        <h1 style="font-size:80px;font-weight:700;color:#fff;line-height:1.35;" class="ka">
          우리의 이야기를<br>들어주세요
        </h1>
        <p style="font-size:32px;color:rgba(255,255,255,0.5);">실제 예술인 증언</p>
        <div style="font-size:26px;color:rgba(255,255,255,0.3);letter-spacing:6px;margin-top:40px;">스와이프 →</div>
      </div>
    `, { bgImg:hero(9), overlayStyle:`background:linear-gradient(180deg,${C.charcoal}ee,${a}55);`, pn:1, total:t }),

    quote('아이들 모르게 나만 3일을 굶었던 기억.', '50대, 연극인', '생존의 위협', 3, 2),
    quote('공연을 할수록 빚만 늘어가는 상황에서 공연을 그만두기로 했습니다.', '30대, 배우', '창작의 좌절', 6, 3),
    quote("연극배우라고 하자 '무직자'라고 대출담당으로부터 들었습니다.", '50대, 배우', '인간적 모멸감', 9, 4),
    quote('병원을 제때 가야 하는데, 안 가고 참는 것이 습관이 돼버렸습니다.', '50대, 배우', '생존의 위협', 17, 5),
    quote('독촉 전화로 연습과 공연에 지장을 주고, 다음날이 두려워집니다.', '40대, 연극인', '창작의 좌절', 14, 6),

    // 요약 — 수평 바 그래프
    pg(`
      <div class="z s p" style="justify-content:center;gap:40px;">
        <h2 style="font-size:56px;font-weight:700;color:#fff;" class="ka">증언 분포</h2>
        ${[
          { label:'생존 위협', count:6, max:6, color:C.red, icon:'🆘' },
          { label:'창작 파괴', count:5, max:6, color:C.primary, icon:'🎭' },
          { label:'관계 단절', count:4, max:6, color:'#A78BFA', icon:'💔' },
        ].map(x => `
          <div style="display:flex;align-items:center;gap:20px;">
            <span style="font-size:52px;width:64px;text-align:center;">${x.icon}</span>
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                <span style="font-size:32px;color:rgba(255,255,255,0.8);">${x.label}</span>
                <span class="m" style="font-size:36px;color:${x.color};font-weight:700;">${x.count}건</span>
              </div>
              <div style="height:48px;background:rgba(255,255,255,0.06);border-radius:24px;overflow:hidden;">
                <div style="height:100%;width:${(x.count/x.max)*100}%;background:${x.color};border-radius:24px;"></div>
              </div>
            </div>
          </div>
        `).join('')}
        <div class="glass-dark" style="padding:36px 40px;margin-top:4px;">
          <p style="font-size:36px;font-weight:600;color:#fff;line-height:1.5;" class="ka">
            이것은 개인의 문제가 아닌, <span style="color:${C.gold};">구조의 문제</span>입니다
          </p>
          <p style="font-size:26px;color:rgba(255,255,255,0.45);margin-top:16px;line-height:1.6;" class="ka">
            출품 작가들은 이 문제를 해결하기 위해 자발적으로 연대한 동료 예술인들입니다
          </p>
        </div>
      </div>
    `, { bgImg:BG[18], overlayStyle:`background:${C.charcoal}ea;`, pn:7, total:t }),

    // CTA
    pg(`
      <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:40px;">
        <div style="font-size:140px;color:#fff;opacity:0.12;font-family:Georgia,serif;">"</div>
        <h1 style="font-size:76px;font-weight:700;color:#fff;line-height:1.35;" class="ka">이 목소리에<br>응답해주세요</h1>
        <div style="width:80px;height:4px;background:${C.gold};border-radius:2px;"></div>
        <div class="m" style="font-size:44px;font-weight:700;color:${C.gold};">${URL_MAIN}</div>
        <div class="glass" style="padding:32px 44px;">
          <div style="font-size:24px;color:rgba(255,255,255,0.6);line-height:2.2;">${HT.s2}</div>
        </div>
      </div>
    `, { bgImg:hero(11), overlayStyle:`background:linear-gradient(180deg,${a}cc,${C.charcoal}cc);`, pn:8, total:t }),
  ];
}

// ═══════════════════════════════════════════════
// S3: 씨앗이 자라는 법
// ═══════════════════════════════════════════════

function s3() {
  const t = 6;
  const step = (n, icon, title, desc, detail, bgIdx, num) => pg(`
    <div class="z s p" style="justify-content:center;gap:36px;">
      <div style="display:flex;align-items:center;gap:20px;">
        <div style="width:80px;height:80px;background:linear-gradient(135deg,${C.primary},${C.green});border-radius:50%;display:flex;align-items:center;justify-content:center;">
          <span class="m" style="font-size:36px;font-weight:900;color:#fff;">${n}</span>
        </div>
        <span style="font-size:24px;color:${C.gold};font-weight:600;letter-spacing:4px;">STEP ${n}</span>
      </div>
      <div style="font-size:80px;">${icon}</div>
      <h2 style="font-size:60px;font-weight:700;color:#fff;" class="ka">${title}</h2>
      <p style="font-size:34px;color:rgba(255,255,255,0.6);line-height:1.6;" class="ka">${desc}</p>
      <div class="glass" style="padding:36px 40px;">
        <p style="font-size:32px;color:rgba(255,255,255,0.85);line-height:1.6;" class="ka">${detail}</p>
      </div>
    </div>
  `, { bgImg:BG[bgIdx], overlayStyle:`background:${C.charcoal}e5;`, pn:num, total:t });

  return [
    pg(`
      <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:24px;">
        <div style="font-size:26px;color:${C.gold};font-weight:600;letter-spacing:6px;">SERIES 03</div>
        <div style="font-size:100px;">🌱</div>
        <h1 style="font-size:76px;font-weight:700;color:#fff;line-height:1.35;" class="ka">작품 한 점이<br>씨앗이 되는 과정</h1>
        <div style="display:flex;gap:12px;margin-top:28px;">
          ${['🎨','→','💰','→','🏦','→','🎭'].map((x,i) => i%2===0
            ? `<div style="width:72px;height:72px;background:rgba(255,255,255,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:36px;">${x}</div>`
            : `<div style="color:${C.gold};font-size:32px;display:flex;align-items:center;">${x}</div>`
          ).join('')}
        </div>
        <div style="font-size:26px;color:rgba(255,255,255,0.3);letter-spacing:6px;margin-top:32px;">스와이프 →</div>
      </div>
    `, { bgImg:hero(4), overlayStyle:`background:linear-gradient(180deg,${C.charcoal}ee,${C.primary}66);`, pn:1, total:t }),

    step(1,'🎨','작품 구매','354점의 작품이 온라인샵에서 판매 중','가격대: <strong style="color:'+C.gold+'">₩50,000 ~ ₩5,000,000</strong><br>→ '+URL_MAIN,4,2),
    step(2,'💰','수익의 50%','작품 판매 수익이 상호부조 기금으로','현재 기금: <strong style="color:'+C.gold+'">1억 2,534만 원</strong>',2,3),
    step(3,'🏦','저금리 대출','금융 차별을 겪는 예술인에게 저금리로','연 <strong style="color:'+C.green+'">3.0~5.5%</strong> (시중 카드론 15~20% 대비)',5,4),
    step(4,'🎭','창작 지속','대출받은 예술인이 다시 창작하고, 작품이 씨앗이 됩니다','<strong style="color:'+C.gold+'">95% 상환율</strong>이 만드는 선순환',7,5),

    pg(`
      <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:36px;">
        <div style="display:flex;gap:12px;">
          ${['🎨','→','💰','→','🏦','→','🎭'].map((x,i) => i%2===0
            ? `<div style="width:84px;height:84px;background:linear-gradient(135deg,${C.primary}33,${C.green}33);border:2px solid rgba(255,255,255,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:40px;">${x}</div>`
            : `<div style="color:${C.gold};font-size:36px;display:flex;align-items:center;">${x}</div>`
          ).join('')}
        </div>
        <h1 style="font-size:76px;font-weight:700;color:#fff;line-height:1.35;" class="ka">씨앗을<br>심어주세요</h1>
        <div style="width:80px;height:4px;background:${C.gold};border-radius:2px;"></div>
        <div class="m" style="font-size:44px;font-weight:700;color:${C.gold};">${URL_MAIN}</div>
        <div class="glass" style="padding:28px 40px;">
          <div style="font-size:24px;color:rgba(255,255,255,0.5);line-height:2.2;">${HT.s3}</div>
        </div>
      </div>
    `, { bgImg:hero(8), overlayStyle:`background:linear-gradient(180deg,${C.primary}bb,${C.charcoal}cc);`, pn:6, total:t }),
  ];
}

// ═══════════════════════════════════════════════
// S4-S6: 작가 스포트라이트
// ═══════════════════════════════════════════════

function spot(sn, title, sub, arts, ht) {
  const t = 8;

  const artSlide = (a, num) => pg(`
    <div class="z s" style="display:flex;flex-direction:column;">
      <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:40px;overflow:hidden;min-height:0;">
        <img src="${a.img}" alt="${a.title}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:4px;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      </div>
      <div class="glass-dark" style="margin:0 32px 32px;padding:36px 40px;border-radius:20px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:26px;color:${C.gold};font-weight:600;letter-spacing:1px;">${a.artist}</div>
            <div style="font-size:36px;font-weight:600;color:#fff;margin-top:8px;">${a.title}</div>
            <div style="font-size:24px;color:rgba(255,255,255,0.45);margin-top:8px;">${a.material} · ${a.size}</div>
          </div>
          <div style="text-align:right;">
            <div class="m" style="font-size:34px;font-weight:700;color:${C.gold};">${a.price}</div>
          </div>
        </div>
      </div>
    </div>
  `, { bgImg:a.img, overlayStyle:`background:${C.charcoal}cc;backdrop-filter:blur(40px);`, pn:num, total:t });

  return [
    // 커버
    pg(`
      <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:28px;">
        <div style="font-size:24px;color:${C.gold};font-weight:600;letter-spacing:6px;">SERIES 0${sn}</div>
        <h1 style="font-size:96px;font-weight:700;color:#fff;">${title}</h1>
        <div style="width:80px;height:4px;background:${C.gold};border-radius:2px;"></div>
        <p style="font-size:34px;color:rgba(255,255,255,0.5);">${sub}</p>
        <div style="font-size:26px;color:rgba(255,255,255,0.25);letter-spacing:6px;margin-top:40px;">스와이프 →</div>
      </div>
    `, { bgImg:arts[0].img, overlayStyle:`background:linear-gradient(180deg,${C.charcoal}dd,${C.charcoal}bb);backdrop-filter:blur(20px);`, pn:1, total:t }),

    artSlide(arts[0],2), artSlide(arts[1],3), artSlide(arts[2],4),

    // 그리드
    pg(`
      <div class="z s" style="padding:28px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;flex:1;">
          ${arts.slice(3,7).map(a => `
            <div style="position:relative;overflow:hidden;border-radius:16px;">
              <img src="${a.img}" alt="" style="width:100%;height:100%;object-fit:cover;">
              <div style="position:absolute;inset:0;background:linear-gradient(transparent 40%,${C.charcoal}dd);"></div>
              <div style="position:absolute;bottom:24px;left:24px;right:24px;">
                <div style="font-size:26px;color:${C.gold};font-weight:600;">${a.artist}</div>
                <div style="font-size:22px;color:rgba(255,255,255,0.7);margin-top:4px;">${a.title}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `, { bgImg:arts[0].img, overlayStyle:`background:${C.charcoal}f0;`, pn:5, total:t }),

    // 프로필
    ...[arts[0], arts[1]].map((a,i) => pg(`
      <div class="z s p" style="justify-content:center;gap:32px;">
        <div style="display:flex;gap:28px;align-items:center;">
          <div style="width:120px;height:120px;border-radius:50%;overflow:hidden;border:4px solid ${C.gold};flex-shrink:0;">
            <img src="${a.img}" alt="" style="width:100%;height:100%;object-fit:cover;">
          </div>
          <div>
            <div style="font-size:22px;color:${C.gold};font-weight:600;letter-spacing:3px;">ARTIST</div>
            <div style="font-size:52px;font-weight:700;color:#fff;margin-top:6px;">${a.artist}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          ${[{l:'재료',v:a.material},{l:'크기',v:a.size}].map(x => `
            <div class="glass" style="padding:28px;">
              <div style="font-size:22px;color:${C.gold};font-weight:600;margin-bottom:8px;">${x.l}</div>
              <div style="font-size:28px;color:rgba(255,255,255,0.85);">${x.v}</div>
            </div>
          `).join('')}
        </div>
        <div class="glass" style="padding:28px;">
          <div style="font-size:22px;color:${C.gold};font-weight:600;margin-bottom:10px;">대표작</div>
          <div style="font-size:36px;font-weight:500;color:#fff;">${a.title}</div>
          <div class="m" style="font-size:34px;color:${C.gold};margin-top:10px;">${a.price}</div>
        </div>
        <div style="text-align:center;">
          <span style="font-size:30px;color:${C.gold};font-weight:600;">이 작가의 모든 작품 보기 →</span>
        </div>
      </div>
    `, { bgImg:a.img, overlayStyle:`background:${C.charcoal}e5;`, pn:6+i, total:t })),

    // CTA
    pg(`
      <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:32px;">
        <h1 style="font-size:64px;font-weight:700;color:#fff;line-height:1.35;" class="ka">127명 작가의 354점,<br>모두 만나보세요</h1>
        <div style="width:80px;height:4px;background:${C.gold};border-radius:2px;"></div>
        <div class="m" style="font-size:44px;font-weight:700;color:${C.gold};">${URL_MAIN}</div>
        <div style="font-size:22px;color:rgba(255,255,255,0.4);line-height:2.2;margin-top:8px;">${ht}</div>
      </div>
    `, { bgImg:arts[2].img, overlayStyle:`background:linear-gradient(180deg,${C.charcoal}dd,${C.charcoal}bb);backdrop-filter:blur(20px);`, pn:8, total:t }),
  ];
}

function s4() { return spot(4,'회화의 힘','회화 · 한국화 · 드로잉 — 210점',ART.s4,HT.s4); }
function s5() { return spot(5,'빛과 판의 예술','판화 · 사진 · 디지털아트 — 114점',ART.s5,HT.s5); }
function s6() { return spot(6,'형태의 언어','조각 · 도자/공예 · 혼합매체 — 30점',ART.s6,HT.s6); }

// ═══════════════════════════════════════════════
// S7: 95%의 신뢰 — 그래프 중심
// ═══════════════════════════════════════════════

function s7() {
  const t = 7;

  return [
    // 커버 — 거대 도넛
    pg(`
      <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:24px;">
        <div style="font-size:24px;color:${C.gold};font-weight:600;letter-spacing:6px;">SERIES 07</div>
        <div style="width:480px;height:480px;border-radius:50%;position:relative;
          background:conic-gradient(${C.gold} 0% 95%,rgba(255,255,255,0.08) 95% 100%);
          display:flex;align-items:center;justify-content:center;">
          <div style="width:340px;height:340px;border-radius:50%;background:${C.charcoal};display:flex;align-items:center;justify-content:center;flex-direction:column;">
            <span class="m" style="font-size:140px;font-weight:900;color:${C.gold};">95</span>
            <span class="m" style="font-size:44px;color:rgba(255,255,255,0.5);font-weight:600;">%</span>
          </div>
        </div>
        <h2 style="font-size:44px;font-weight:600;color:#fff;" class="ka">예술인 상호부조 대출 상환율</h2>
        <div style="font-size:26px;color:rgba(255,255,255,0.25);letter-spacing:6px;margin-top:12px;">스와이프 →</div>
      </div>
    `, { bgImg:hero(16), overlayStyle:`background:${C.charcoal}e5;`, pn:1, total:t }),

    // 누적 대출 — 세로 바 차트
    pg(`
      <div class="z s p" style="justify-content:center;gap:36px;">
        <div style="font-size:24px;color:${C.gold};font-weight:600;letter-spacing:4px;">CUMULATIVE LOANS</div>
        <h2 style="font-size:52px;font-weight:700;color:#fff;">누적 대출 추이</h2>
        <div style="display:flex;gap:24px;align-items:flex-end;height:480px;">
          ${[{y:'2023',v:129},{y:'2024',v:305},{y:'2025',v:354}].map(x => `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
              <div style="width:100%;height:${(x.v/354)*85}%;background:linear-gradient(180deg,${C.gold},${C.gold}66);border-radius:20px 20px 8px 8px;
                display:flex;align-items:center;justify-content:center;min-height:80px;">
                <span class="m" style="font-size:52px;font-weight:900;color:${C.charcoal};">${x.v}</span>
              </div>
              <div class="m" style="font-size:32px;font-weight:600;color:rgba(255,255,255,0.5);margin-top:20px;">${x.y}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `, { bgImg:BG[3], overlayStyle:`background:${C.charcoal}ea;`, pn:2, total:t }),

    // 이자율 비교
    pg(`
      <div class="z s p" style="justify-content:center;gap:40px;">
        <div style="font-size:24px;color:${C.gold};font-weight:600;letter-spacing:4px;">INTEREST COMPARISON</div>
        <h2 style="font-size:52px;font-weight:700;color:#fff;">이자율 비교</h2>
        <div style="display:flex;gap:24px;">
          <div style="flex:1;background:${C.green}22;border:3px solid ${C.green}44;border-radius:24px;padding:52px 28px;text-align:center;">
            <div style="font-size:28px;color:${C.green};font-weight:600;letter-spacing:2px;margin-bottom:20px;">씨앗 대출</div>
            <div class="m" style="font-size:80px;font-weight:900;color:${C.green};">3~5.5%</div>
            <div style="font-size:26px;color:rgba(255,255,255,0.4);margin-top:16px;">연이자율</div>
          </div>
          <div style="flex:1;background:${C.red}22;border:3px solid ${C.red}44;border-radius:24px;padding:52px 28px;text-align:center;">
            <div style="font-size:28px;color:${C.red};font-weight:600;letter-spacing:2px;margin-bottom:20px;">카드론·현금서비스</div>
            <div class="m" style="font-size:80px;font-weight:900;color:${C.red};">15~20%</div>
            <div style="font-size:26px;color:rgba(255,255,255,0.4);margin-top:16px;">연이자율</div>
          </div>
        </div>
      </div>
    `, { bgImg:BG[8], overlayStyle:`background:${C.charcoal}ea;`, pn:3, total:t }),

    // 이자 절감
    pg(`
      <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:32px;">
        <div style="font-size:24px;color:${C.gold};font-weight:600;letter-spacing:4px;">SAVED INTEREST</div>
        <div style="width:420px;height:210px;position:relative;overflow:hidden;">
          <div style="width:420px;height:420px;border-radius:50%;border:40px solid rgba(255,255,255,0.08);position:absolute;top:0;"></div>
          <div style="width:420px;height:420px;border-radius:50%;border:40px solid ${C.gold};border-color:${C.gold} ${C.gold} transparent transparent;transform:rotate(-90deg);position:absolute;top:0;"></div>
        </div>
        <div style="display:flex;align-items:baseline;gap:8px;">
          <span style="font-size:40px;color:rgba(255,255,255,0.5);">약</span>
          <span class="m" style="font-size:140px;font-weight:900;color:${C.gold};">1.4</span>
          <span style="font-size:48px;color:#fff;font-weight:600;">억 원</span>
        </div>
        <p style="font-size:36px;color:rgba(255,255,255,0.6);" class="ka">예술인들이 아낀 이자 비용</p>
        <div style="width:80px;height:4px;background:${C.gold};border-radius:2px;"></div>
        <p style="font-size:32px;color:rgba(255,255,255,0.4);" class="ka">이 돈으로 작품을 만듭니다</p>
      </div>
    `, { bgImg:hero(18), overlayStyle:`background:${C.charcoal}e8;`, pn:4, total:t }),

    // 분야별 분포 — 도넛
    pg(`
      <div class="z s p" style="justify-content:center;gap:32px;align-items:center;">
        <h2 style="font-size:48px;font-weight:600;color:#fff;">대출자 분야별 분포</h2>
        <div style="width:420px;height:420px;border-radius:50%;
          background:conic-gradient(#FF6B6B 0% 35.4%,${C.gold} 35.4% 65.6%,${C.green} 65.6% 89.2%,#A78BFA 89.2% 96.4%,rgba(255,255,255,0.1) 96.4% 100%);
          display:flex;align-items:center;justify-content:center;">
          <div style="width:280px;height:280px;border-radius:50%;background:${C.charcoal};"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px 48px;">
          ${[
            {l:'연극/영화',p:'35.4%',c:'#FF6B6B'},{l:'음악',p:'30.2%',c:C.gold},
            {l:'시각예술',p:'23.6%',c:C.green},{l:'문학',p:'7.2%',c:'#A78BFA'},
          ].map(x => `
            <div style="display:flex;align-items:center;gap:14px;">
              <div style="width:22px;height:22px;border-radius:6px;background:${x.c};"></div>
              <span style="font-size:28px;color:rgba(255,255,255,0.7);">${x.l}</span>
              <span class="m" style="font-size:30px;color:#fff;font-weight:700;margin-left:auto;">${x.p}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `, { bgImg:BG[10], overlayStyle:`background:${C.charcoal}ea;`, pn:5, total:t }),

    // 투명성
    pg(`
      <div class="z s p" style="justify-content:center;gap:36px;">
        <h2 style="font-size:56px;font-weight:700;color:#fff;" class="ka">"모든 숫자는<br>공개됩니다"</h2>
        <div style="display:flex;gap:16px;">
          ${[{y:'2023',l:'129건',f:'6,800만 원'},{y:'2024',l:'305건',f:'1억 800만 원'},{y:'2025',l:'354건',f:'1억 2,534만 원'}].map(x => `
            <div class="glass" style="flex:1;padding:32px 20px;text-align:center;">
              <div class="m" style="font-size:34px;font-weight:700;color:${C.gold};margin-bottom:16px;">${x.y}</div>
              <div style="font-size:30px;color:#fff;">${x.l}</div>
              <div style="font-size:24px;color:rgba(255,255,255,0.45);margin-top:8px;">${x.f}</div>
            </div>
          `).join('')}
        </div>
        <div class="glass" style="padding:28px;text-align:center;">
          <div class="m" style="font-size:32px;font-weight:600;color:${C.gold};">${URL_MAIN}</div>
        </div>
      </div>
    `, { bgImg:BG[13], overlayStyle:`background:${C.charcoal}ea;`, pn:6, total:t }),

    // CTA
    pg(`
      <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:36px;">
        <h1 style="font-size:68px;font-weight:700;color:#fff;line-height:1.4;" class="ka">신뢰가 만든 선순환,<br>함께 하세요</h1>
        <div style="width:80px;height:4px;background:${C.gold};border-radius:2px;"></div>
        <div class="m" style="font-size:44px;font-weight:700;color:${C.gold};">${URL_MAIN}</div>
        <div class="glass" style="padding:32px 44px;">
          <div style="font-size:24px;color:rgba(255,255,255,0.5);line-height:2.2;">${HT.s7}</div>
        </div>
      </div>
    `, { bgImg:hero(1), overlayStyle:`background:linear-gradient(180deg,${C.primary}cc,${C.charcoal}cc);`, pn:7, total:t }),
  ];
}

// ═══════════════════════════════════════════════
// S8: 지금, 연대
// ═══════════════════════════════════════════════

function s8() {
  const t = 6;
  const method = (icon, title, desc, detail, bgIdx, num) => pg(`
    <div class="z s p" style="justify-content:center;align-items:center;gap:32px;">
      <div class="glass-dark" style="padding:64px 56px;width:100%;text-align:center;">
        <div style="font-size:88px;margin-bottom:24px;">${icon}</div>
        <h2 style="font-size:56px;font-weight:700;color:#fff;margin-bottom:16px;" class="ka">${title}</h2>
        <p style="font-size:34px;color:rgba(255,255,255,0.65);line-height:1.6;" class="ka">${desc}</p>
        <p style="font-size:28px;color:rgba(255,255,255,0.4);margin-top:12px;" class="ka">${detail}</p>
        <div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.15);">
          <div class="m" style="font-size:36px;font-weight:600;color:${C.gold};">${URL_MAIN}</div>
        </div>
      </div>
    </div>
  `, { bgImg:BG[bgIdx], overlayStyle:`background:${C.charcoal}aa;`, pn:num, total:t });

  return [
    pg(`
      <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:28px;">
        <div style="font-size:26px;color:${C.gold};font-weight:600;letter-spacing:6px;">SERIES 08</div>
        <h1 style="font-size:76px;font-weight:700;color:#fff;line-height:1.35;" class="ka">연대하는 방법은<br>세 가지입니다</h1>
        <div style="display:flex;gap:36px;margin-top:28px;">
          ${['🎨','💝','🖼️'].map(x => `<div style="width:96px;height:96px;background:rgba(255,255,255,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:48px;">${x}</div>`).join('')}
        </div>
        <div style="font-size:26px;color:rgba(255,255,255,0.25);letter-spacing:6px;margin-top:40px;">스와이프 →</div>
      </div>
    `, { bgImg:hero(6), overlayStyle:`background:linear-gradient(180deg,${C.gold}88,${C.charcoal}cc);`, pn:1, total:t }),

    method('🎨','작품 구매하기','354점의 작품이 당신을 기다립니다','판매 수익의 50%가 상호부조 기금으로',3,2),
    method('💝','직접 후원하기','씨앗기금을 직접 후원해주세요','소액부터 누구나 참여 가능',5,3),
    method('🖼️','온라인 전시 관람','127명 작가의 작품을 직접 만나보세요','관람 자체가 관심의 시작입니다',9,4),

    pg(`
      <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:36px;">
        <div style="font-size:88px;">🔗</div>
        <h2 style="font-size:68px;font-weight:700;color:#fff;line-height:1.35;" class="ka">이 이야기를<br>나눠주세요</h2>
        <p style="font-size:32px;color:rgba(255,255,255,0.5);line-height:1.6;" class="ka">저장하고 공유하면,<br>한 명의 예술인에게 희망이 됩니다</p>
        <div style="display:flex;gap:20px;">
          ${['📤 스토리 공유','🔗 링크 복사','💬 DM 전송'].map(x => `
            <div class="glass" style="padding:24px 32px;">
              <div style="font-size:28px;color:#fff;font-weight:500;">${x}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `, { bgImg:BG[15], overlayStyle:`background:${C.charcoal}dd;`, pn:5, total:t }),

    pg(`
      <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:28px;">
        <img src="${logoW}" alt="SAF" style="height:56px;margin-bottom:4px;">
        <h2 style="font-size:48px;font-weight:700;color:#fff;">씨앗페(SAF) 2026</h2>
        <div style="width:80px;height:4px;background:${C.gold};border-radius:2px;"></div>
        <div style="display:flex;flex-direction:column;gap:16px;width:100%;max-width:600px;">
          ${[{i:'🎨',l:'작품 구매'},{i:'💝',l:'직접 후원'},{i:'🖼️',l:'온라인 전시'}].map(x => `
            <div class="glass" style="padding:24px 32px;display:flex;align-items:center;gap:18px;">
              <span style="font-size:36px;">${x.i}</span>
              <span style="font-size:32px;font-weight:600;color:#fff;">${x.l}</span>
              <span class="m" style="font-size:28px;color:${C.gold};margin-left:auto;font-weight:600;">${URL_MAIN}</span>
            </div>
          `).join('')}
        </div>
        <div style="font-size:22px;color:rgba(255,255,255,0.4);line-height:2.2;margin-top:12px;">${HT.s8}</div>
      </div>
    `, { bgImg:hero(9), overlayStyle:`background:linear-gradient(180deg,${C.gold}77,${C.charcoal}dd);`, pn:6, total:t }),
  ];
}

// ═══════════════════════════════════════════════
// S9: 오윤 40주기 특별전 — 다큐멘터리 톤
// ═══════════════════════════════════════════════

function s9() {
  const t = 8;
  const sepia = '#F5F0E8';    // 한지 배경
  const ink   = '#2a2a2a';    // 먹 텍스트
  const amber = '#B8860B';    // 황토 강조
  const amberLight = '#D4A017';
  const ht = HT.s9;

  // 다큐멘터리 공통 CSS 추가
  const docCss = `
    .doc-bg{background:${sepia};width:1080px;height:1350px;}
    .doc-divider{width:80px;height:4px;background:${amber};border-radius:2px;}
    .doc-img{width:100%;object-fit:cover;filter:grayscale(20%) sepia(30%) contrast(1.05);}
    .stamp-badge{display:inline-block;border:3px solid ${amber};padding:10px 28px;letter-spacing:6px;font-size:22px;font-weight:700;color:${amber};text-transform:uppercase;transform:rotate(-1.5deg);}
    .art-caption{background:rgba(42,42,42,0.9);padding:32px 48px;border-left:6px solid ${amber};}
    .doc-quote{border-left:6px solid ${amber};padding:28px 40px;background:rgba(184,134,11,0.06);}
    .price-card{background:#fff;border:2px solid ${amber};border-radius:16px;padding:36px 48px;width:100%;}
  `;

  const logoB = file('public/images/logo/320pxX90px_black.webp');

  // 1. 커버 — 오윤 초상 배경 + 모노톤 오버레이
  const slide1 = pg(`
    <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:28px;">
      <div class="stamp-badge">오윤 40주기 특별전</div>
      <h1 style="font-size:100px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-2px;" class="ka">민중의<br>칼날,<br>오윤</h1>
      <div class="doc-divider" style="margin:0 auto;"></div>
      <p style="font-size:32px;color:rgba(255,255,255,0.7);letter-spacing:4px;font-weight:400;">1946 — 1986</p>
      <p style="font-size:26px;color:rgba(255,255,255,0.5);letter-spacing:2px;">목판화가 · 민중미술</p>
    </div>
  `, { bgImg:ohyoon, overlayStyle:`background:linear-gradient(180deg,rgba(42,42,42,0.55) 0%,rgba(42,42,42,0.85) 100%);`, color:ink, pn:1, total:t, logo:logoW, extraCss:docCss });

  // 2. 생애 — 좌측 텍스트 + 우측 칼노래 이미지
  const slide2 = pg(`
    <div class="z s" style="flex-direction:row;height:100%;">
      <!-- 좌측 텍스트 -->
      <div style="width:52%;padding:72px 56px;display:flex;flex-direction:column;justify-content:center;gap:32px;background:${sepia};">
        <p style="font-size:24px;font-weight:700;color:${amber};letter-spacing:6px;">BIOGRAPHY</p>
        <div class="doc-divider"></div>
        <h2 style="font-size:56px;font-weight:800;color:${ink};line-height:1.25;" class="ka">소설가의 아들,<br>조각을 배우고<br>판화를 택하다</h2>
        <p style="font-size:30px;color:#555;line-height:1.7;" class="ka">서울대 조각과 졸업 후<br>목판화를 평생 매체로 선택.</p>
        <div class="doc-quote">
          <p style="font-size:28px;color:${ink};line-height:1.7;font-style:italic;" class="ka">"한 번 새기면<br>돌이킬 수 없는 칼자국,<br>그것이 삶과 닮았다"</p>
        </div>
        <p style="font-size:24px;color:#777;" class="ka">부친 소설가 오영수<br>1946년 부산 출생</p>
      </div>
      <!-- 우측 작품 이미지 -->
      <div style="width:48%;position:relative;overflow:hidden;">
        <img class="doc-img" src="${OY.칼노래}" alt="칼노래" style="width:100%;height:100%;object-fit:cover;">
        <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(0deg,rgba(42,42,42,0.85),transparent);padding:32px 28px;">
          <p style="font-size:26px;font-weight:700;color:#fff;">칼노래</p>
          <p style="font-size:22px;color:rgba(255,255,255,0.6);">목판화, 1985</p>
        </div>
      </div>
    </div>
    <div class="pn" style="color:${ink};">${2} / ${t}</div>
  `, { color:ink, logo:logoB, extraCss:docCss });

  // 3. 철학 — 중앙 큰 인용문
  const slide3 = pg(`
    <div class="z s p doc-bg" style="justify-content:center;align-items:center;text-align:center;gap:40px;">
      <p style="font-size:24px;font-weight:700;color:${amber};letter-spacing:6px;">PHILOSOPHY</p>
      <div class="doc-divider" style="margin:0 auto;"></div>
      <blockquote style="font-size:72px;font-weight:900;color:${ink};line-height:1.3;letter-spacing:-1px;" class="ka">"미술은 많은 사람이<br>나누어야 한다"</blockquote>
      <p style="font-size:28px;color:#666;font-style:italic;">— 오윤, 1980년대</p>
      <div style="max-width:700px;display:flex;flex-direction:column;gap:20px;margin-top:12px;">
        <div style="display:flex;align-items:center;gap:16px;background:rgba(184,134,11,0.08);border-radius:12px;padding:24px 32px;">
          <span style="font-size:36px;">🪵</span>
          <p style="font-size:28px;color:${ink};line-height:1.5;" class="ka">판화 = 복제 가능한 유일한 '원작'<br>누구나 소장할 수 있는 예술</p>
        </div>
        <div style="display:flex;align-items:center;gap:16px;background:rgba(184,134,11,0.08);border-radius:12px;padding:24px 32px;">
          <span style="font-size:36px;">✊</span>
          <p style="font-size:28px;color:${ink};line-height:1.5;" class="ka">1980년대 민중미술 운동의<br>핵심 작가로 활동</p>
        </div>
      </div>
    </div>
  `, { color:ink, logo:logoB, pn:3, total:t, extraCss:docCss });

  // 4. 대표작 1 — 낮도깨비
  const slide4 = pg(`
    <div class="z s" style="height:100%;">
      <!-- 작품 이미지 70% -->
      <div style="height:68%;position:relative;overflow:hidden;">
        <img class="doc-img" src="${OY.낮도깨비}" alt="낮도깨비" style="width:100%;height:100%;object-fit:cover;">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 60%,rgba(42,42,42,0.7) 100%);"></div>
        <div style="position:absolute;top:40px;left:48px;">
          <div class="stamp-badge" style="font-size:20px;">대표작 01</div>
        </div>
      </div>
      <!-- 하단 해설 30% -->
      <div style="height:32%;padding:36px 56px;background:${sepia};display:flex;flex-direction:column;justify-content:center;gap:16px;">
        <div style="display:flex;align-items:baseline;gap:20px;">
          <h2 style="font-size:64px;font-weight:900;color:${ink};">낮도깨비</h2>
          <p style="font-size:28px;color:${amber};font-weight:600;">1985</p>
        </div>
        <div class="doc-divider"></div>
        <p style="font-size:30px;color:#444;line-height:1.6;" class="ka">탈춤·굿·도깨비를 현대적으로 재해석.<br>한(恨)과 신명(神明)의 공존을 목판에 새기다.</p>
        <p style="font-size:24px;color:#888;">(사후판화)목판 · 54.5×36cm</p>
      </div>
    </div>
  `, { color:ink, logo:logoB, pn:4, total:t, extraCss:docCss });

  // 5. 대표작 2 — 칼노래
  const slide5 = pg(`
    <div class="z s" style="height:100%;">
      <div style="height:68%;position:relative;overflow:hidden;">
        <img class="doc-img" src="${OY.칼노래}" alt="칼노래" style="width:100%;height:100%;object-fit:cover;">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 60%,rgba(42,42,42,0.7) 100%);"></div>
        <div style="position:absolute;top:40px;left:48px;">
          <div class="stamp-badge" style="font-size:20px;">대표작 02</div>
        </div>
      </div>
      <div style="height:32%;padding:36px 56px;background:${sepia};display:flex;flex-direction:column;justify-content:center;gap:16px;">
        <div style="display:flex;align-items:baseline;gap:20px;">
          <h2 style="font-size:64px;font-weight:900;color:${ink};">칼노래</h2>
          <p style="font-size:28px;color:${amber};font-weight:600;">1985</p>
        </div>
        <div class="doc-divider"></div>
        <p style="font-size:30px;color:#444;line-height:1.6;" class="ka">민중의 저항과 희망을 담은 대표작.</p>
        <div style="display:flex;align-items:center;gap:16px;margin-top:4px;">
          <span style="font-size:22px;">🏛️</span>
          <p style="font-size:26px;color:#666;" class="ka">최근 5년 경매 낙찰 총액 <strong style="color:${amber};">17.7억 원</strong></p>
        </div>
        <p style="font-size:24px;color:#888;">(사후판화)목판 · 32.2×25.5cm</p>
      </div>
    </div>
  `, { color:ink, logo:logoB, pn:5, total:t, extraCss:docCss });

  // 6. 대표작 3 — 석양
  const slide6 = pg(`
    <div class="z s" style="height:100%;">
      <div style="height:68%;position:relative;overflow:hidden;">
        <img class="doc-img" src="${OY.석양}" alt="석양" style="width:100%;height:100%;object-fit:cover;">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 60%,rgba(42,42,42,0.7) 100%);"></div>
        <div style="position:absolute;top:40px;left:48px;">
          <div class="stamp-badge" style="font-size:20px;">대표작 03</div>
        </div>
        <div style="position:absolute;top:40px;right:48px;background:rgba(184,134,11,0.9);border-radius:10px;padding:12px 24px;">
          <p style="font-size:22px;font-weight:700;color:#fff;">BTS RM 소장</p>
        </div>
      </div>
      <div style="height:32%;padding:36px 56px;background:${sepia};display:flex;flex-direction:column;justify-content:center;gap:16px;">
        <div style="display:flex;align-items:baseline;gap:20px;">
          <h2 style="font-size:64px;font-weight:900;color:${ink};">석양</h2>
          <p style="font-size:28px;color:${amber};font-weight:600;">1982</p>
        </div>
        <div class="doc-divider"></div>
        <p style="font-size:30px;color:#444;line-height:1.6;" class="ka">서정적 자연 속에 민중의 삶을 담아.<br>BTS RM 소장으로 다시 조명받다.</p>
        <p style="font-size:24px;color:#888;">(사후판화)목판 · 23.5×22.5cm</p>
      </div>
    </div>
  `, { color:ink, logo:logoB, pn:6, total:t, extraCss:docCss });

  // 7. 의의 — 가격 비교 카드
  const slide7 = pg(`
    <div class="z s p doc-bg" style="justify-content:center;align-items:center;gap:36px;">
      <p style="font-size:24px;font-weight:700;color:${amber};letter-spacing:6px;text-align:center;">ACCESS</p>
      <div class="doc-divider" style="margin:0 auto;"></div>
      <h2 style="font-size:72px;font-weight:900;color:${ink};text-align:center;line-height:1.2;" class="ka">경매장이 아닌,<br>당신의 벽에</h2>
      <!-- 가격 비교 -->
      <div style="display:flex;flex-direction:column;gap:20px;width:100%;max-width:800px;">
        <div class="price-card" style="border-color:#ccc;background:#f0f0f0;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <p style="font-size:24px;color:#999;margin-bottom:8px;">일반 경매 시장</p>
              <p style="font-size:52px;font-weight:900;color:#888;" class="m">수백 ~ 수천만 원</p>
            </div>
            <span style="font-size:48px;">🏛️</span>
          </div>
        </div>
        <div style="text-align:center;font-size:40px;color:${amber};">↓</div>
        <div class="price-card" style="border-color:${amber};background:rgba(184,134,11,0.05);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <p style="font-size:24px;color:${amber};font-weight:700;margin-bottom:8px;">씨앗페 2026</p>
              <p style="font-size:52px;font-weight:900;color:${ink};" class="m">105 ~ 295만 원</p>
            </div>
            <span style="font-size:48px;">🌱</span>
          </div>
        </div>
      </div>
      <p style="font-size:28px;color:#666;text-align:center;line-height:1.7;" class="ka">판매 수익의 50%는<br>예술인 상호부조 기금으로</p>
    </div>
  `, { color:ink, logo:logoB, pn:7, total:t, extraCss:docCss });

  // 8. CTA — 특별전 보러가기
  const slide8 = pg(`
    <div class="z s p" style="justify-content:center;align-items:center;text-align:center;gap:32px;">
      <div class="stamp-badge" style="color:#fff;border-color:rgba(255,255,255,0.6);">40주기 특별전</div>
      <h1 style="font-size:80px;font-weight:900;color:#fff;line-height:1.2;" class="ka">40년 만에<br>돌아온<br>민중의 칼날</h1>
      <div class="doc-divider" style="margin:0 auto;background:${amberLight};"></div>
      <p style="font-size:34px;color:rgba(255,255,255,0.85);line-height:1.6;" class="ka">오윤 40주기 특별전<br>지금 온라인에서 만나보세요</p>
      <div style="background:rgba(255,255,255,0.12);border:2px solid rgba(255,255,255,0.3);border-radius:16px;padding:28px 56px;">
        <p style="font-size:36px;font-weight:700;color:${amberLight};" class="m">saf2026.com/special/oh-yoon</p>
      </div>
      <p style="font-size:24px;color:rgba(255,255,255,0.45);line-height:2;margin-top:8px;">${ht}</p>
    </div>
  `, { bgImg:OY.낮도깨비, overlayStyle:`background:linear-gradient(180deg,rgba(42,42,42,0.6),rgba(42,42,42,0.88));`, color:ink, pn:8, total:t, logo:logoW, extraCss:docCss });

  return [slide1, slide2, slide3, slide4, slide5, slide6, slide7, slide8];
}

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════

async function main() {
  for (let i=1;i<=9;i++) fs.mkdirSync(path.join(OUT,`S${i}`),{recursive:true});

  console.log('🚀 Launching browser...');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport:{width:1080,height:1350}});
  const p = await ctx.newPage();

  const all = [
    {n:'S1',sl:s1()},{n:'S2',sl:s2()},{n:'S3',sl:s3()},
    {n:'S4',sl:s4()},{n:'S5',sl:s5()},{n:'S6',sl:s6()},
    {n:'S7',sl:s7()},{n:'S8',sl:s8()},{n:'S9',sl:s9()},
  ];

  let c = 0;
  for (const s of all) {
    console.log(`\n📸 ${s.n} (${s.sl.length} slides)`);
    for (let i=0;i<s.sl.length;i++) {
      await p.setContent(s.sl[i],{waitUntil:'load',timeout:30000});
      await p.evaluate(()=>document.fonts.ready);
      await p.waitForTimeout(800);
      const out = path.join(OUT,s.n,`${String(i+1).padStart(2,'0')}.png`);
      await p.screenshot({path:out,type:'png'});
      console.log(`  ✓ ${s.n}/${String(i+1).padStart(2,'0')}.png`);
      c++;
    }
  }

  await browser.close();
  console.log(`\n✅ Done! ${c} images → ${OUT}`);
}

main().catch(e=>{console.error('❌',e);process.exit(1);});
