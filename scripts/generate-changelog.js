#!/usr/bin/env node

/**
 * generate-changelog.js
 *
 * Git 커밋 히스토리에서 feat/fix/perf 타입만 추출하여
 * content/changelog.json으로 출력한다.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ALLOWED_TYPES = ['feat', 'fix', 'perf'];
const DELIMITER = '---COMMIT_DELIM---';
const FIELD_SEP = '---FIELD_SEP---';

const TYPE_KO = {
  feat: '새 기능 추가',
  fix: '버그 수정',
  perf: '성능 개선',
  refactor: '구조 개선',
};

const SCOPE_KO = {
  admin: '관리자',
  analytics: '분석',
  archive: '아카이브',
  artworks: '출품작',
  auth: '로그인',
  cache: '캐시',
  changelog: '개발 이력',
  checkout: '결제',
  csp: '보안 정책',
  dashboard: '대시보드',
  feedback: '피드백',
  footer: '하단',
  gallery: '갤러리',
  header: '헤더',
  hero: '히어로',
  i18n: '다국어',
  layout: '레이아웃',
  logs: '활동 로그',
  magazine: '매거진',
  mobile: '모바일',
  nav: '내비게이션',
  onboarding: '온보딩',
  orders: '주문',
  payments: '결제',
  privacy: '개인정보',
  revenue: '매출',
  search: '검색',
  seo: 'SEO',
  stories: '스토리',
  terms: '약관',
  ui: 'UI',
  ux: 'UX',
  webhook: '웹훅',
};

// git log 실행
function getGitLog() {
  try {
    const format = [
      '%h', // short hash
      '%s', // subject
      '%aI', // author date ISO
      '%an', // author name
      '%b', // body
    ].join(FIELD_SEP);

    const raw = execSync(`git log --no-merges --format="${DELIMITER}${format}"`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    return raw;
  } catch {
    console.warn('Warning: git log failed. Generating empty changelog.');
    return '';
  }
}

// 시맨틱 커밋 접두어 파싱
function parseSubject(subject) {
  const match = subject.match(
    /^(feat|fix|perf|refactor|style|copy|docs|chore|ci|test)(\((.+?)\))?:\s*(.+)$/
  );
  if (!match) return null;

  const [, type, , scope, text] = match;
  return { type, scope: scope || null, subject: text };
}

// 커밋 본문에서 "요약:" 줄 추출
function extractSummary(body) {
  if (!body) return null;
  const match = body.match(/^요약:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

// 커밋 본문 정리
function cleanBody(body) {
  if (!body || !body.trim()) return null;

  const lines = body
    .split('\n')
    .filter((line) => !line.startsWith('Co-Authored-By:'))
    .filter((line) => !line.startsWith('co-authored-by:'))
    .filter((line) => !line.match(/^요약:\s*.+$/));

  const cleaned = lines.join('\n').trim();
  return cleaned || null;
}

function containsKorean(text) {
  return /[가-힣]/.test(text || '');
}

function toScopeLabel(scope) {
  if (!scope) return null;
  return SCOPE_KO[scope] || (containsKorean(scope) ? scope : null);
}

function createFallbackSummary({ type, scope, subject }) {
  if (containsKorean(subject)) return subject;

  const actionLabel = TYPE_KO[type] || '변경 사항 반영';
  const scopeLabel = toScopeLabel(scope);
  return scopeLabel ? `${scopeLabel} ${actionLabel}` : actionLabel;
}

// 한국어 요약 매핑 로드
function loadKoreanSummaries() {
  try {
    const filePath = path.join(__dirname, '..', 'content', 'changelog-ko.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// 메인 로직
function generateChangelog() {
  const raw = getGitLog();
  if (!raw.trim()) {
    writeOutput([]);
    return;
  }

  const koSummaries = loadKoreanSummaries();

  const commits = raw
    .split(DELIMITER)
    .filter((chunk) => chunk.trim())
    .map((chunk) => {
      const parts = chunk.split(FIELD_SEP);
      if (parts.length < 5) return null;

      const [hash, subject, dateISO, author, ...bodyParts] = parts;
      const parsed = parseSubject(subject.trim());
      if (!parsed) return null;
      if (!ALLOWED_TYPES.includes(parsed.type)) return null;

      const trimmedHash = hash.trim();
      const rawBody = bodyParts.join(FIELD_SEP);
      const bodySummary = extractSummary(rawBody);
      const fallbackSummary = createFallbackSummary(parsed);
      return {
        hash: trimmedHash,
        type: parsed.type,
        scope: parsed.scope,
        subject: parsed.subject,
        summary: bodySummary || koSummaries[trimmedHash] || fallbackSummary,
        body: cleanBody(rawBody),
        date: dateISO.trim().slice(0, 10), // YYYY-MM-DD
        author: author.trim(),
      };
    })
    .filter(Boolean);

  const missing = commits.filter((c) => !koSummaries[c.hash] && !containsKorean(c.subject));
  if (missing.length > 0) {
    console.warn(
      `\nWarning: ${missing.length}개 커밋에 수동 한국어 요약 매핑이 없습니다. (fallback 적용됨)`
    );
    console.warn('content/changelog-ko.json에 다음 해시를 추가해 주세요:');
    for (const c of missing) {
      console.warn(`  "${c.hash}": "${c.subject}"`);
    }
  }

  writeOutput(commits);
}

function writeOutput(entries) {
  const outPath = path.join(__dirname, '..', 'content', 'changelog.json');

  // content 디렉토리가 없으면 생성
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 기존 파일과 merge (Vercel 얕은 클론에서도 새 커밋 자동 반영)
  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
  } catch {
    // 기존 파일 없음 — 새로 생성
  }

  const existingHashes = new Set(existing.map((e) => e.hash));
  const newEntries = entries.filter((e) => !existingHashes.has(e.hash));

  if (newEntries.length === 0 && entries.length <= existing.length) {
    console.log(`Changelog unchanged: ${existing.length} entries`);
    return;
  }

  // 새 항목을 앞에 추가하되, 전체 history가 있으면 그걸 사용
  const merged = entries.length >= existing.length ? entries : [...newEntries, ...existing];
  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf-8');
  console.log(
    `Changelog updated: ${merged.length} entries (${newEntries.length} new) → ${outPath}`
  );
}

generateChangelog();
