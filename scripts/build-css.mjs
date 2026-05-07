/**
 * Tailwind CSS를 Next.js의 자동 처리에서 분리해 public/css/main.[hash].css로 컴파일.
 *
 * 목적: Lighthouse "render-blocking CSS" 1190ms 진단 해소 — Next.js가 자동으로
 * 박는 <link rel="stylesheet" precedence="next">는 우회 불가능하므로 import를
 * 끊고 layout에서 수동으로 inline critical + async loading 패턴 적용.
 *
 * 실행: prebuild 단계 (npm run build 직전)
 * 출력:
 *   - public/css/main.<hash>.css (실제 CSS)
 *   - app/_css-manifest.json ({"tailwindCss": "/css/main.<hash>.css"}) — layout이 import해서 href 결정
 */
import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const SRC = join(ROOT, 'styles/globals.css');
const TMP_OUT = join(ROOT, '.tmp-css-build.css');
const PUBLIC_DIR = join(ROOT, 'public/css');
const MANIFEST = join(ROOT, 'app/_css-manifest.json');

mkdirSync(PUBLIC_DIR, { recursive: true });

console.log('[build-css] Tailwind CLI 컴파일...');
const args = ['tailwindcss', '-i', SRC, '-o', TMP_OUT, '--minify'];
const { stdout, stderr } = await execFileAsync('npx', args, { cwd: ROOT });
if (stderr) process.stderr.write(stderr);

const css = readFileSync(TMP_OUT, 'utf8');
const hash = createHash('sha256').update(css).digest('hex').slice(0, 10);
const fileName = `main.${hash}.css`;
const outPath = join(PUBLIC_DIR, fileName);

writeFileSync(outPath, css);
unlinkSync(TMP_OUT);

// 이전 main.*.css 정리 (현재 hash 외)
for (const entry of readdirSync(PUBLIC_DIR)) {
  if (entry.startsWith('main.') && entry.endsWith('.css') && entry !== fileName) {
    unlinkSync(join(PUBLIC_DIR, entry));
  }
}

writeFileSync(
  MANIFEST,
  JSON.stringify({ tailwindCss: `/css/${fileName}`, hash, sizeBytes: css.length }, null, 2) + '\n'
);

console.log(
  `[build-css] ✓ ${fileName} (${(css.length / 1024).toFixed(1)} KiB) → ${MANIFEST.replace(ROOT + '/', '')}`
);
