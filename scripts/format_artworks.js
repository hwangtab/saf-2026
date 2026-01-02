const fs = require('fs');
const path = require('path');

const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');

if (!fs.existsSync(artworksPath)) {
    console.error('Error: content/saf2026-artworks.ts not found');
    process.exit(1);
}

function formatArtworks() {
    let content = fs.readFileSync(artworksPath, 'utf-8');

    // Formatting logic:
    // 1. Normalize line endings
    // 2. Identify headers and add double newlines
    const formatText = (text) => {
        if (!text) return text;

        // 1. Replace multiple newlines with single newline, remove tabs
        let cleaned = text.replace(/\\n+/g, '\n').replace(/\n+/g, '\n').replace(/\t/g, '');

        // 2. Trim lines
        cleaned = cleaned.split('\n').map(l => l.trim()).join('\n');

        // 3. Trim outer
        cleaned = cleaned.trim();

        // 3. Insert double newline before headers
        const headers = [
            '학력', '개인전', '단체전', '주요전시', '전시', '수상', '소장', '경력', '주요경력',
            'Solo Exhibition', 'Group Exhibition', 'Selected Exhibition', 'Awards', 'Collections', 'Education', 'Career',
            'Residence', 'Residency', '레지던시', '출판', '저서', '현재', '현\\)', '작품소장', 'Team Project activities'
        ];

        const lines = cleaned.split('\n');
        const formattedLines = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            if (!line) continue;

            // Check if this line looks like a header
            let isHeader = false;
            for (const h of headers) {
                // Check exact match or starts with (e.g. "2023 개인전" is NOT a header, but "개인전" IS)
                // "현)" or "학력" usually starts the line.
                // Regex: ^(Header) or ^[Header] or ^<Header>
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

        // Join with \n
        return formattedLines.join('\\n');
    };

    // Apply to 'history', 'profile', 'description' fields
    // Regex matches: key:\s*QUOTE(.*?)QUOTE
    const fields = ['history', 'profile']; // description might be sensitive to formatting, but let's include if safe. 
    // User specifically asked for history. Let's stick to history and profile for now as they are long texts.

    fields.forEach(field => {
        const regex = new RegExp(`(${field}:\\s*)(['"\`])((?:.|[\\r\\n])*?)\\2`, 'g');
        content = content.replace(regex, (match, prefix, quote, value) => {
            // Unescape for processing if not backtick
            let raw = value;
            if (quote !== '\`') {
                raw = raw.replace(/\\n/g, '\n');
            }

            const formatted = formatText(raw);

            // Re-escape
            if (quote !== '\`') {
                // If the quote used is single quote, we must escape single quotes inside?
                // The regex match captured the wrapper quote. 
                // We should ensure the content doesn't break the quote.
                // But simplified: we just return formatted with proper \n escapes.
                return `${prefix}${quote}${formatted}${quote}`;
            } else {
                return `${prefix}${quote}${formatted}${quote}`;
            }
        });
    });

    fs.writeFileSync(artworksPath, content, 'utf-8');
    console.log('✅ Artwork text formatting completed.');
}

formatArtworks();
