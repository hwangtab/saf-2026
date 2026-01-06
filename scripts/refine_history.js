const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../content/saf2026-artworks.ts');

try {
    let content = fs.readFileSync(filePath, 'utf8');
    console.log(`Read ${content.length} bytes from ${filePath}`);

    let modificationCount = 0;

    // Regex to match history fields: history: '...'
    // We match aggressively on single quotes being used as delimiters.
    // Assumes content does not contain unescaped single quotes.
    content = content.replace(/history:\s*'((?:[^'\\]|\\.)*)'/g, (match, historyContent) => {
        let text = historyContent;

        // Fix specific typos
        if (text.includes('olo Exhibition')) {
            text = text.replace(/olo Exhibition/g, 'Solo Exhibition');
            console.log('Fixed "olo Exhibition" typo');
        }

        // Split by literal \n pattern (since they are in a JS string literal in the file)
        let lines = text.split(/\\n/);

        let processedLines = [];
        const headers = [
            '개인전', '단체전', '주요 개인전', '주요 단체전', '주요단체전',
            '학력', '수상', '레지던시', '소장처', '작품소장',
            'Solo Exhibition', 'Group Exhibition',
            '[개인전]', '[그룹전]', '[레지던시]', '[선정]',
            '예술교육활동', '워크샵', '기관 경력', '전시'
        ];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim(); // Remove leading/trailing spaces

            if (line === '') {
                // Skip consecutive empty lines
                if (processedLines.length > 0 && processedLines[processedLines.length - 1] === '') {
                    continue;
                }
                // Add empty line only if not at the start
                if (processedLines.length > 0) {
                    processedLines.push('');
                }
                continue;
            }

            // Check if this line is a header
            // Heuristic: Is in the headers list OR starts with one of them and is short?
            // Some headers might have ":" or similar.
            let isHeader = false;
            for (const h of headers) {
                // Exact match or starts with header (e.g. "학력:")
                if (line === h || (line.startsWith(h) && line.length < h.length + 5)) {
                    isHeader = true;
                    break;
                }
            }

            // Enforce padding before headers
            if (isHeader) {
                // Remove previous empty line if exists, to ensure we add exactly one (canonicalize)
                // Actually, just ensure there IS an empty line.
                if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
                    processedLines.push('');
                }
            }

            processedLines.push(line);
        }

        // Remove empty lines at the very end
        if (processedLines.length > 0 && processedLines[processedLines.length - 1] === '') {
            processedLines.pop();
        }

        const newHistoryContent = processedLines.join('\\n');

        if (newHistoryContent !== historyContent) {
            modificationCount++;
        }

        return `history: '${newHistoryContent}'`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Refined history for ${modificationCount} artworks.`);

} catch (err) {
    console.error('Error:', err);
}
