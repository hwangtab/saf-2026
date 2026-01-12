const fs = require('fs');
const path = require('path');

const batchFiles = [
  'content/artworks-batches/batch-001.ts',
  'content/artworks-batches/batch-002.ts',
  'content/artworks-batches/batch-003.ts',
];

function cleanupFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const singleQuoteString = "'([^'\\\\]|\\\\.)*'";
  const doubleQuoteString = '"([^"\\\\]|\\\\.)*"';
  const backtickString = '`([^`\\\\]|\\\\.)*`';

  const stringPattern = `(${singleQuoteString}|${doubleQuoteString}|${backtickString})`;

  content = content.replace(new RegExp(`\\s*profile:\\s*${stringPattern},?`, 'g'), '');

  content = content.replace(new RegExp(`\\s*history:\\s*${stringPattern},?`, 'g'), '');

  content = content.replace(/^\s*[\r\n]/gm, '');

  fs.writeFileSync(filePath, content);
  console.log(`Cleaned ${filePath}`);
}

batchFiles.forEach((file) => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    cleanupFile(fullPath);
  }
});
