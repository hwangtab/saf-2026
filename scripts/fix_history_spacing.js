const fs = require('fs');
const path = require('path');

const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');

function fixHistorySpacing() {
    let content = fs.readFileSync(artworksPath, 'utf-8');

    // Regex to match the history fields
    // This assumes the format: history: '...' or history: "..." or history: `...`
    // Since the file uses single quotes for strings mostly, and some double quotes.
    // However, multi-line strings in TS often use backticks or concatenated single quotes strings.
    // In `saf2026-artworks.ts`, checking the file content (step 373), it uses:
    // history: '...' (single quotes with actual newlines inside? No, likely \n in value or template literals if backticks)
    // Looking at file content view in Step 373:
    // history: "개인전\n2023 POP KIDS ... " (Double quotes with \n)
    // history: '담몽(淡夢) 신예리\n경원대학교 ...' (Single quotes with \n)

    // Strategy:
    // 1. Parse the file to find `history:` values.
    // Since it's a TS file and not JSON, robust parsing is hard with regex alone.
    // However, we can iterate over the `artworks` array if we can eval it, but writing back is hard.
    // WE MUST MODIFY THE SOURCE STRINGS IN PLACE.

    // Improved Regex approach:
    // Look for `history:\s*QUOTE(.*?)QUOTE`
    // But dealing with escaped quotes is tricky.

    // Alternative:
    // Read the file.
    // Find lines starting with `    history:`
    // Extract the string content.
    // Format it.
    // Replace it.

    // Let's refine the formatting logic first.
    const formatHistory = (text) => {
        if (!text) return text;

        // 1. Replace multiple newlines with single newline
        let cleaned = text.replace(/\\n+/g, '\n').replace(/\n+/g, '\n');

        // 2. Remove leading/trailing
        cleaned = cleaned.trim();

        // 3. Insert double newline before headers
        const headers = [
            '학력', '개인전', '단체전', '주요전시', '전시', '수상', '소장', '경력',
            'Solo Exhibition', 'Group Exhibition', 'Selected Exhibition', 'Awards', 'Collections', 'Education', 'Career',
            'Residence', 'Residency', '레지던시', '출판', '저서', '현재', '현\\)', '작품소장'
        ];

        const lines = cleaned.split('\n');
        const formattedLines = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;

            // Check if this line looks like a header
            let isHeader = false;
            for (const h of headers) {
                // Check exact match or starts with (e.g. "2023 개인전" is NOT a header, but "개인전" IS)
                // "현)" or "학력" usually starts the line.
                // Regex: ^(Header)
                const regex = new RegExp(`^${h}`, 'i');
                if (regex.test(line)) {
                    // Additional check: don't double space if it's the very first line
                    isHeader = true;
                    break;
                }
                // Check for "[Header]" format
                if (line.startsWith(`[${h}]`) || line.startsWith(`<${h}>`)) {
                    isHeader = true;
                    break;
                }
            }

            if (isHeader && formattedLines.length > 0) {
                // Check if previous line wasn't already a newline (formattedLines push logic handles this by joining later)
                // We add an empty string to valid array to represent blank line
                formattedLines.push('');
            }

            formattedLines.push(line);
        }

        // Join with \n. The empty strings pushed will create \n\n
        return formattedLines.join('\\n');
    };

    // We process the file line by line to locate `history:` keys.
    // Warning: Multi-line strings in code might be tricky.
    // In Step 373, ID 12 uses:
    // history:
    //   "개인전\n2023 ... "
    // It seems to be on a new line or same line.

    // Let's use a regex that captures the value.
    // history:\s*(['"`])((?:.|[\r\n])*?)\1

    const newContent = content.replace(/(history:\s*)(['"`])((?:.|[\r\n])*?)\2/g, (match, prefix, quote, value) => {
        // value contains the raw string content inside quotes.
        // If it's single/double quote, \n are literal characters backslash+n.
        // If backtick, they are real newlines.

        // Unescape: convert literal \n to real newline for processing
        let raw = value;
        if (quote !== '`') {
            raw = raw.replace(/\\n/g, '\n');
        }

        const formatted = formatHistory(raw);

        // Escape back: 
        if (quote !== '`') {
            return `${prefix}${quote}${formatted}${quote}`;
        } else {
            // For backticks, keep real newlines? Or consistently use \n escape?
            // Reviewing file: ID 12 uses double quotes and \n.
            // Let's stick to the original quote style.
            return `${prefix}${quote}${formatted}${quote}`;
        }
    });

    fs.writeFileSync(artworksPath, newContent, 'utf-8');
    console.log('Successfully updated history spacing.');
}

fixHistorySpacing();
