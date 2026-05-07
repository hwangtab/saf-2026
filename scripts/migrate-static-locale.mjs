/**
 * locale 라우트의 동적 → 정적 일괄 변환.
 *
 * 변환 규칙:
 *   1. import: getLocale 제거, setRequestLocale 추가
 *   2. force-static export 추가 (없으면)
 *   3. generateMetadata / default export 시그니처에 params 추가
 *   4. const locale = resolveLocale(await getLocale());
 *      → const { locale: rawLocale } = await params;
 *        const locale = resolveLocale(rawLocale);
 *        setRequestLocale(locale);
 *
 * 실행: node scripts/migrate-static-locale.mjs <file>
 *       파일 list 인자로 받아 처리.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/migrate-static-locale.mjs <file...>');
  process.exit(1);
}

for (const file of files) {
  let src = readFileSync(file, 'utf8');
  const original = src;

  // 1. import 변환
  src = src.replace(
    /import\s+\{\s*getLocale\s*,\s*getTranslations\s*\}\s+from\s+'next-intl\/server'\s*;/,
    "import { getTranslations, setRequestLocale } from 'next-intl/server';"
  );
  src = src.replace(
    /import\s+\{\s*getTranslations\s*,\s*getLocale\s*\}\s+from\s+'next-intl\/server'\s*;/,
    "import { getTranslations, setRequestLocale } from 'next-intl/server';"
  );
  src = src.replace(
    /import\s+\{\s*getLocale\s*\}\s+from\s+'next-intl\/server'\s*;/,
    "import { setRequestLocale } from 'next-intl/server';"
  );

  // 2. force-static 추가 (revalidate 줄 위에)
  if (!/export const dynamic = 'force-static'/.test(src)) {
    src = src.replace(
      /(export const revalidate = [^\n;]+;)/,
      "export const dynamic = 'force-static';\n$1"
    );
  }

  // 3. generateMetadata 시그니처 + body 변환
  src = src.replace(
    /export async function generateMetadata\(\)(:\s*Promise<[^>]+>)?\s*\{\s*\n\s*const locale = resolveLocale\(await getLocale\(\)\)\s*;/,
    (_, retType = '') =>
      `export async function generateMetadata({\n  params,\n}: {\n  params: Promise<{ locale: string }>;\n})${retType} {\n  const { locale: rawLocale } = await params;\n  const locale = resolveLocale(rawLocale);\n  setRequestLocale(locale);`
  );

  // 4. default export 시그니처 + body 변환
  src = src.replace(
    /export default async function (\w+)\(\)\s*\{\s*\n\s*const locale = resolveLocale\(await getLocale\(\)\)\s*;/,
    (_, fnName) =>
      `export default async function ${fnName}({\n  params,\n}: {\n  params: Promise<{ locale: string }>;\n}) {\n  const { locale: rawLocale } = await params;\n  const locale = resolveLocale(rawLocale);\n  setRequestLocale(locale);`
  );

  if (src === original) {
    console.log(`[skip] ${file} (no matching pattern)`);
    continue;
  }

  writeFileSync(file, src);
  console.log(`[OK]   ${file}`);
}
