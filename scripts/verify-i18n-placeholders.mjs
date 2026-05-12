#!/usr/bin/env node
/**
 * i18n raw placeholder 빌드 가드.
 *
 * Next.js prerender HTML(.next/server/app/**\/*.html) 에 `{artistCount}` /
 * `{artworkCount}` / `{loanCount}` 같은 ICU 변수가 raw 형태로 남아 있는지 검사.
 *
 * **왜 필요한가**: i18n 키에 `{varName}` 토큰이 박혀 있을 때 호출처가
 * `t('key', { varName: value })` variables 객체를 누락하면 next-intl은 토큰을 그대로
 * 출력 — SERP description·OG·schema.org에 raw 노출되어 신뢰 손상 + CTR 손실.
 *
 * **거짓 양성 회피**:
 * - `<script>` 태그(특히 `__next_f.push` flight payload, `NextIntlClientProvider`
 *   serialized messages) 내부에는 raw 템플릿이 정상적으로 존재함. 클라이언트가
 *   런타임에 substitute하기 위한 것이므로 검사 대상에서 제외.
 * - 검사 대상은 사용자 노출 영역: `<meta>` content, JSON-LD `<script type="application/ld+json">`
 *   본문, 일반 HTML 텍스트 노드/속성.
 *
 * **실행**:
 *   node scripts/verify-i18n-placeholders.mjs
 *
 * 매칭 발견 시 exit code 1 — `npm run build` 직후 chain되어 CI에서 fail.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const TARGET_DIR = join(ROOT, '.next/server/app');

// 감시할 ICU 변수 — site-stats.ts의 단일 출처 상수와 매칭.
const PLACEHOLDER_NAMES = ['artistCount', 'artworkCount', 'loanCount'];
const PLACEHOLDER_RE = new RegExp(`\\{(${PLACEHOLDER_NAMES.join('|')})\\}`, 'g');

function listHtmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listHtmlFiles(full));
    } else if (entry.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * `<script>...</script>` 블록을 ` ` (스페이스 1자)로 치환해 검사에서 제외.
 * type="application/ld+json"은 SEO에 노출되므로 보존(=치환 안 함).
 */
function stripNonSeoScripts(html) {
  return html.replace(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi, (match, _body, offset) => {
    // type="application/ld+json"은 보존(JSON-LD는 SEO 가시 콘텐츠).
    const openTag = match.slice(0, match.indexOf('>') + 1);
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(openTag)) {
      return match;
    }
    return ' ';
  });
}

function main() {
  let htmlFiles;
  try {
    htmlFiles = listHtmlFiles(TARGET_DIR);
  } catch (err) {
    console.error(`[verify-i18n-placeholders] cannot list ${TARGET_DIR}: ${err.message}`);
    console.error('Did you run `next build` first?');
    process.exit(2);
  }

  if (htmlFiles.length === 0) {
    console.error(`[verify-i18n-placeholders] no HTML files under ${TARGET_DIR}`);
    process.exit(2);
  }

  const violations = [];
  for (const file of htmlFiles) {
    const raw = readFileSync(file, 'utf8');
    const cleaned = stripNonSeoScripts(raw);
    const matches = [...cleaned.matchAll(PLACEHOLDER_RE)];
    if (matches.length === 0) continue;

    // 첫 5건 컨텍스트(±80자) 캡처
    const samples = matches.slice(0, 5).map((m) => {
      const start = Math.max(0, m.index - 80);
      const end = Math.min(cleaned.length, m.index + m[0].length + 80);
      return cleaned.slice(start, end).replace(/\s+/g, ' ');
    });
    violations.push({ file: relative(ROOT, file), count: matches.length, samples });
  }

  if (violations.length === 0) {
    console.log(
      `[verify-i18n-placeholders] OK — scanned ${htmlFiles.length} HTML files, 0 raw placeholders in SEO-visible regions.`
    );
    process.exit(0);
  }

  console.error(`[verify-i18n-placeholders] FAIL — raw ICU placeholders found in rendered HTML:`);
  for (const v of violations) {
    console.error(`\n  ${v.file}  (${v.count} match${v.count > 1 ? 'es' : ''})`);
    for (const s of v.samples) {
      console.error(`    … ${s} …`);
    }
  }
  console.error(
    `\nFix: ensure each \`t('key', { ${PLACEHOLDER_NAMES.join(', ')} })\` callsite passes the missing variables.`
  );
  console.error(`Source of truth: lib/site-stats.ts (ARTIST_COUNT / ARTWORK_COUNT / LOAN_COUNT).`);
  process.exit(1);
}

main();
