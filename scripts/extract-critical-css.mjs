/**
 * Critical CSS 추출 스크립트.
 *
 * 입력: 로컬 main.<hash>.css (build-css.mjs로 컴파일된 산출물)
 *      + production HTML 스냅샷 (실제 렌더된 DOM 기준 critical 식별)
 * 출력: styles/critical.css — layout.tsx에서 inline `<style>`로 박힘
 *
 * 실행: postbuild-css 단계 (build-css.mjs 직후)
 *       또는 수동: node scripts/extract-critical-css.mjs
 *
 * 디자인 변경 시 production 배포 후 한 번 더 실행해 critical을 갱신.
 */
import Beasties from 'beasties';
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PRODUCTION_URL = process.env.CRITICAL_CSS_URL || 'https://www.saf2026.com/';
const CSS_PATH = JSON.parse(readFileSync('app/_css-manifest.json', 'utf8')).tailwindCss;
const LOCAL_CSS_FILE = join(process.cwd(), 'public', CSS_PATH);
const OUT_FILE = 'styles/critical.css';

if (!existsSync(LOCAL_CSS_FILE)) {
  console.error(`[extract-critical] ${LOCAL_CSS_FILE} 없음. 먼저 build-css.mjs 실행 필요`);
  process.exit(1);
}

const localCss = readFileSync(LOCAL_CSS_FILE, 'utf8');
console.log(`[extract-critical] local CSS: ${(localCss.length / 1024).toFixed(1)} KiB`);

console.log(`[extract-critical] production HTML 스냅샷 (${PRODUCTION_URL})...`);
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();
await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const productionHtml = await page.content();
await browser.close();

// HTML의 link href를 로컬 파일명으로 매핑 (beasties가 path로 CSS 찾을 수 있게)
const cssBasename = CSS_PATH.split('/').pop();
let modifiedHtml = productionHtml.replaceAll(CSS_PATH, `/${cssBasename}`);
// production은 _next/static/chunks/* 경로의 다른 CSS도 link로 박혀 있음 (next/font 등)
// 이건 beasties가 처리 못 하게 link로 안 두고 그냥 두면 무시됨 — fonts는 inline 안 함
modifiedHtml = modifiedHtml.replace(
  /<link[^>]*href="\/_next\/static\/chunks\/[^"]*\.css[^"]*"[^>]*>/g,
  ''
);

const beasties = new Beasties({
  path: join(process.cwd(), 'public/css'),
  publicPath: '/',
  pruneSource: false, // 원본 CSS는 그대로 두고 critical만 추출 (외부 fetch는 그대로 진행)
  inlineFonts: false,
  fonts: false,
  reduceInlineStyles: false,
  logLevel: 'silent',
});

const processed = await beasties.process(modifiedHtml);

// 추출된 inline <style> 추출
const styleMatches = [...processed.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)];
const criticalCss = styleMatches.map((m) => m[1]).join('\n');

writeFileSync(OUT_FILE, criticalCss);
console.log(
  `[extract-critical] ✓ ${OUT_FILE} (${(criticalCss.length / 1024).toFixed(1)} KiB / ${((criticalCss.length / localCss.length) * 100).toFixed(1)}% of local)`
);
