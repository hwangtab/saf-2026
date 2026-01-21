const fs = require('fs');
const path = require('path');

function formatFile(filePath, fields) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: ${filePath} not found`);
    return;
  }

  console.log(`Formatting: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Formatting logic:
  // 1. Normalize line endings
  // 2. Identify headers and add double newlines
  const formatText = (text) => {
    if (!text) return text;

    // 1. Replace multiple newlines with single newline, remove tabs
    let cleaned = text.replace(/\\n+/g, '\n').replace(/\n+/g, '\n').replace(/\t/g, '');

    // 2. Trim lines
    cleaned = cleaned
      .split('\n')
      .map((l) => l.trim())
      .join('\n');

    // 3. Trim outer
    cleaned = cleaned.trim();

    // 3. Insert double newline before headers
    const headers = [
      '학력',
      '개인전',
      '단체전',
      '주요전시',
      '전시',
      '수상',
      '소장',
      '경력',
      '주요경력',
      'Solo Exhibition',
      'Group Exhibition',
      'Selected Exhibition',
      'Awards',
      'Collections',
      'Education',
      'Career',
      'Residence',
      'Residency',
      '레지던시',
      '출판',
      '저서',
      '현재',
      '현\\)',
      '작품소장',
      'Team Project activities',
    ];

    const lines = cleaned.split('\n');
    const formattedLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (!line) continue;

      // Check if this line looks like a header
      let isHeader = false;
      for (const h of headers) {
        const regex = new RegExp(`^(\\[|<)?${h}(\\]|>)?`, 'i');
        if (regex.test(line)) {
          isHeader = true;
          break;
        }
      }

      if (isHeader && formattedLines.length > 0) {
        formattedLines.push('');
      }

      formattedLines.push(line);
    }

    return formattedLines.join('\\n');
  };

  fields.forEach((field) => {
    // Regex matches: key:\s*QUOTE(.*?)QUOTE or key:\s*`([\s\S]*?)`
    // We need to handle both template literals (backticks) and regular strings
    const regex = new RegExp(`(${field}:\\s*)(['"\`])((?:.|[\\r\\n])*?)\\2`, 'g');

    content = content.replace(regex, (match, prefix, quote, value) => {
      let raw = value;
      if (quote !== '\`') {
        raw = raw.replace(/\\n/g, '\n');
      }

      const formatted = formatText(raw);

      if (quote !== '\`') {
        // Simple escape for single/double quotes if needed, though for now assuming simple content
        return `${prefix}${quote}${formatted.replace(/\n/g, '\\n')}${quote}`;
      } else {
        return `${prefix}${quote}${formatted}${quote}`;
      }
    });
  });

  fs.writeFileSync(filePath, content, 'utf-8');
}

function run() {
  // 1. Format Artists Data
  const artistsDataPath = path.join(__dirname, '../content/artists-data.ts');
  formatFile(artistsDataPath, ['profile', 'history']);

  // 2. Format Artwork Batches
  const batchDir = path.join(__dirname, '../content/artworks-batches');
  if (fs.existsSync(batchDir)) {
    const files = fs.readdirSync(batchDir).filter((f) => f.endsWith('.ts'));
    files.forEach((file) => {
      formatFile(path.join(batchDir, file), ['description']);
    });
  }
}

run();
