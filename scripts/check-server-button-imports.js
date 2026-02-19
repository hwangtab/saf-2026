const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();
const TARGET_DIRS = ['app', 'components'];
const FILE_EXTENSIONS = new Set(['.tsx']);
const CLIENT_BUTTON_IMPORT = /from\s+['"]@\/components\/ui\/Button['"]/;

function getAllTargetFiles(startDir) {
  const files = [];
  const entries = fs.readdirSync(startDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(startDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getAllTargetFiles(fullPath));
      continue;
    }

    if (FILE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function hasUseClientDirective(source) {
  const lines = source.split(/\r?\n/);
  let inBlockComment = false;

  for (let i = 0; i < Math.min(lines.length, 40); i += 1) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) continue;

    if (inBlockComment) {
      if (line.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    if (line.startsWith('/*')) {
      if (!line.includes('*/')) {
        inBlockComment = true;
      }
      continue;
    }

    if (line.startsWith('//')) continue;

    return (
      line === "'use client';" ||
      line === '"use client";' ||
      line === "'use client'" ||
      line === '"use client"'
    );
  }

  return false;
}

function run() {
  const violations = [];

  for (const dir of TARGET_DIRS) {
    const absDir = path.join(ROOT_DIR, dir);
    if (!fs.existsSync(absDir)) continue;

    const files = getAllTargetFiles(absDir);
    for (const filePath of files) {
      const source = fs.readFileSync(filePath, 'utf8');
      if (!CLIENT_BUTTON_IMPORT.test(source)) continue;
      if (hasUseClientDirective(source)) continue;

      violations.push(path.relative(ROOT_DIR, filePath));
    }
  }

  if (violations.length > 0) {
    console.error('[check-server-button-imports] Server component must not import Button:');
    for (const file of violations) {
      console.error(`- ${file}`);
    }
    process.exit(1);
  }

  console.log('[check-server-button-imports] OK');
}

run();
