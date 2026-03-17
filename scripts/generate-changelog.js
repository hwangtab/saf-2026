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

const LIMIT = 200;
const ALLOWED_TYPES = ['feat', 'fix', 'perf'];
const DELIMITER = '---COMMIT_DELIM---';
const FIELD_SEP = '---FIELD_SEP---';

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

    const raw = execSync(
      `git log -${LIMIT} --no-merges --format="${DELIMITER}${format}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    return raw;
  } catch {
    console.warn('Warning: git log failed. Generating empty changelog.');
    return '';
  }
}

// 시맨틱 커밋 접두어 파싱
function parseSubject(subject) {
  const match = subject.match(/^(feat|fix|perf|refactor|style|copy|docs|chore|ci|test)(\((.+?)\))?:\s*(.+)$/);
  if (!match) return null;

  const [, type, , scope, text] = match;
  return { type, scope: scope || null, subject: text };
}

// 커밋 본문 정리
function cleanBody(body) {
  if (!body || !body.trim()) return null;

  const lines = body
    .split('\n')
    .filter((line) => !line.startsWith('Co-Authored-By:'))
    .filter((line) => !line.startsWith('co-authored-by:'));

  const cleaned = lines.join('\n').trim();
  return cleaned || null;
}

// 메인 로직
function generateChangelog() {
  const raw = getGitLog();
  if (!raw.trim()) {
    writeOutput([]);
    return;
  }

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

      return {
        hash: hash.trim(),
        type: parsed.type,
        scope: parsed.scope,
        subject: parsed.subject,
        body: cleanBody(bodyParts.join(FIELD_SEP)),
        date: dateISO.trim().slice(0, 10), // YYYY-MM-DD
        author: author.trim(),
      };
    })
    .filter(Boolean);

  writeOutput(commits);
}

function writeOutput(entries) {
  const outPath = path.join(__dirname, '..', 'content', 'changelog.json');

  // content 디렉토리가 없으면 생성
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outPath, JSON.stringify(entries, null, 2), 'utf-8');
  console.log(`Changelog generated: ${entries.length} entries → ${outPath}`);
}

generateChangelog();
