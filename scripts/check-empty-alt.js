/**
 * 공개 라우트·공통 컴포넌트에서 빈 alt(`alt=""`)를 차단한다.
 *
 * 배경: 네이버 사이트 진단은 빈 alt 이미지를 "Alt 속성 누락"으로 집계한다. 전 페이지에 깔리는
 * 로고·hero 배경 한두 곳이 빈 alt면 그것만으로 수백 페이지가 누락으로 카운트된다(2026-06 실측:
 * 250페이지). 회귀 방지를 위해 빈 alt 추가를 빌드에서 차단한다.
 *
 * 장식 이미지에 빈 alt가 "정말로" 필요하면(예: 텍스트와 100% 중복되는 순수 장식) 같은 줄 또는
 * 직전 줄에 `decorative-alt-ok` 마커 주석을 달아 의식적으로 opt-out 한다 — aria-hidden과 함께.
 *
 *   <SafeImage alt="" aria-hidden="true" /> // decorative-alt-ok: 본문 제목과 중복되는 장식
 *
 * admin/dashboard/exhibitor/checkout(비공개·검색 무관)과 OG 렌더 파일은 검사 제외.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const TARGET_DIRS = ['app', 'components'];
const EXCLUDE_PATTERNS = [
  /[\\/](admin|dashboard|exhibitor|checkout)[\\/]/,
  /opengraph-image\.tsx$/,
  /twitter-image\.tsx$/,
  /[\\/]SafeImage\.tsx$/, // 빈 alt 안내 console.warn 문자열 포함
  /[\\/]SafeAvatarImage\.tsx$/,
  /\.test\.tsx?$/,
];
// alt="" | alt={''} | alt={""} | alt={``}
const EMPTY_ALT = /alt=(""|''|\{\s*(''|""|``)\s*\})/;
const OPT_OUT = /decorative-alt-ok/;

function getFiles(startDir) {
  const out = [];
  for (const entry of fs.readdirSync(startDir, { withFileTypes: true })) {
    const full = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...getFiles(full));
    } else if (full.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

function run() {
  const violations = [];

  for (const dir of TARGET_DIRS) {
    const absDir = path.join(ROOT_DIR, dir);
    if (!fs.existsSync(absDir)) continue;

    for (const filePath of getFiles(absDir)) {
      if (EXCLUDE_PATTERNS.some((re) => re.test(filePath))) continue;

      const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (!EMPTY_ALT.test(line)) return;
        // 같은 줄 또는 직전 줄의 opt-out 마커 허용
        if (OPT_OUT.test(line) || (i > 0 && OPT_OUT.test(lines[i - 1]))) return;
        violations.push(`${path.relative(ROOT_DIR, filePath)}:${i + 1}`);
      });
    }
  }

  if (violations.length > 0) {
    console.error('[check-empty-alt] 공개 라우트에 빈 alt가 있습니다 (네이버 "Alt 누락" 회귀 위험):');
    for (const v of violations) console.error(`- ${v}`);
    console.error(
      '\n→ 의미 있는 이미지면 alt에 설명을 넣으세요.\n' +
        '→ 순수 장식이면 같은/직전 줄에 `decorative-alt-ok` 주석 + aria-hidden을 추가하세요.'
    );
    process.exit(1);
  }

  console.log('[check-empty-alt] OK');
}

run();
