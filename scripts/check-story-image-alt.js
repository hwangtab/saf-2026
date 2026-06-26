/**
 * 매거진/스토리 마크다운 소스의 빈 alt 이미지(`![](url)`)를 차단한다.
 *
 * 배경: 매거진 본문은 Supabase `stories.body`/`body_en`에 마크다운으로 저장되고,
 * MarkdownRenderer가 `![alt](url)`의 alt를 그대로 <img alt> 및 <figcaption>으로 렌더한다.
 * alt가 비면 이미지 접근성·SEO(Google Images / 네이버 "Alt 누락") 신호가 사라진다.
 * docs/stories/ 와 content/magazine-drafts/ 는 DB ingest 전 편집 소스이므로,
 * 여기서 빈 alt를 막아 DB에 들어가기 전 작성 시점에 회귀를 차단한다.
 *
 * 검사 패턴: `![](...)` 또는 공백만 있는 `![   ](...)`. 링크로 감싼 `[![](img)](/link)`도
 * `![]` 부분이 동일하게 매칭된다.
 *
 * 순수 장식 이미지라 alt가 "정말로" 비어야 하면 같은 줄 또는 직전 줄에
 * `<!-- decorative-alt-ok -->` 주석으로 의식적으로 opt-out 한다.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const TARGET_DIRS = ['docs/stories', 'content/magazine-drafts'];
// ![](  |  ![   ](  — alt가 비었거나 공백뿐인 마크다운 이미지
const EMPTY_ALT_IMG = /!\[[ \t]*\]\(/;
const OPT_OUT = /decorative-alt-ok/;

function getMarkdownFiles(startDir) {
  const out = [];
  for (const entry of fs.readdirSync(startDir, { withFileTypes: true })) {
    const full = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...getMarkdownFiles(full));
    } else if (full.endsWith('.md') || full.endsWith('.mdx')) {
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

    for (const filePath of getMarkdownFiles(absDir)) {
      const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (!EMPTY_ALT_IMG.test(line)) return;
        // 같은 줄 또는 직전 줄의 opt-out 마커 허용
        if (OPT_OUT.test(line) || (i > 0 && OPT_OUT.test(lines[i - 1]))) return;
        violations.push(`${path.relative(ROOT_DIR, filePath)}:${i + 1}`);
      });
    }
  }

  if (violations.length > 0) {
    console.error('[check-story-image-alt] 매거진 마크다운에 빈 alt 이미지가 있습니다 (이미지 SEO/접근성 누락):');
    for (const v of violations) console.error(`- ${v}`);
    console.error(
      '\n→ `![설명](url)` 형식으로 이미지를 설명하는 alt를 넣으세요.\n' +
        '→ 순수 장식이면 같은/직전 줄에 `<!-- decorative-alt-ok -->` 주석을 추가하세요.'
    );
    process.exit(1);
  }

  console.log('[check-story-image-alt] OK');
}

run();
