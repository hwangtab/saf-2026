export type ParsedInboundReplyBody = {
  replyText: string;
  quotedText: string;
  hasQuotedText: boolean;
};

const KOREAN_WROTE_PATTERN =
  /^\s*\d{4}년\s+\d{1,2}월\s+\d{1,2}일\s+\([^)]+\)\s+.+님이 작성:\s*$/;
const ENGLISH_WROTE_PATTERN = /^\s*On .+wrote:\s*$/i;
const ORIGINAL_MESSAGE_PATTERN =
  /^\s*(-{2,}\s*(Original Message|Forwarded message)\s*-{2,}|_{2,})\s*$/i;

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n?/g, '\n');
}

function trimBlankLines(lines: string[]) {
  let start = 0;
  let end = lines.length;

  while (start < end && !lines[start]?.trim()) start += 1;
  while (end > start && !lines[end - 1]?.trim()) end -= 1;

  return lines.slice(start, end);
}

function isQuoteIntro(line: string) {
  return (
    KOREAN_WROTE_PATTERN.test(line) ||
    ENGLISH_WROTE_PATTERN.test(line) ||
    ORIGINAL_MESSAGE_PATTERN.test(line)
  );
}

function isQuotedLine(line: string) {
  return /^\s*>/.test(line);
}

function shouldTreatAsQuotedBlock(lines: string[], start: number) {
  const meaningfulRest = lines.slice(start).filter((line) => line.trim());
  if (meaningfulRest.length === 0) return false;
  return meaningfulRest.every((line) => isQuotedLine(line) || isQuoteIntro(line));
}

export function parseInboundReplyBody(value: string): ParsedInboundReplyBody {
  const normalized = normalizeLineEndings(value);
  const lines = normalized.split('\n');
  const quoteStart = lines.findIndex((line, index) => {
    if (isQuoteIntro(line)) return true;
    return isQuotedLine(line) && shouldTreatAsQuotedBlock(lines, index);
  });

  if (quoteStart === -1) {
    return {
      replyText: trimBlankLines(lines).join('\n'),
      quotedText: '',
      hasQuotedText: false,
    };
  }

  return {
    replyText: trimBlankLines(lines.slice(0, quoteStart)).join('\n'),
    quotedText: trimBlankLines(lines.slice(quoteStart)).join('\n'),
    hasQuotedText: true,
  };
}
