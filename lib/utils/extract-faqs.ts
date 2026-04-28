import type { FAQItem } from '@/lib/schemas/content';

/**
 * Extract FAQ items from a markdown body.
 *
 * Supported pattern (the one used across `content/magazine-drafts/*.md`):
 *
 * ```markdown
 * **Q. 질문 텍스트?**
 * A. 답변 텍스트.
 *
 * **Q. 다음 질문?**
 * A. 다음 답변.
 * ```
 *
 * The question line starts with bolded `**Q.` / `**Q:` / `**질문`. The answer
 * begins on the next non-empty line and ends when we hit the next Q block, a
 * heading, a horizontal rule, or end of file.
 *
 * Returns an empty array when no FAQ block is found — callers should skip
 * emitting the FAQPage schema in that case to keep Search Console clean.
 */
export function extractFaqsFromBody(body: string | null | undefined): FAQItem[] {
  if (!body) return [];

  const lines = body.split(/\r?\n/);
  const results: FAQItem[] = [];

  const isQuestionLine = (line: string): string | null => {
    const trimmed = line.trim();
    // **Q. ...?** or **Q: ...** or **질문: ...** with optional trailing markers
    const match = trimmed.match(/^\*\*(?:Q[\.:]?|질문[\.:]?)\s*(.+?)\*\*\s*$/);
    if (!match) return null;
    return match[1].trim();
  };

  const isBoundary = (line: string): boolean => {
    const trimmed = line.trim();
    return (
      /^#{1,6}\s/.test(trimmed) || // next heading
      /^---+\s*$/.test(trimmed) // horizontal rule
    );
  };

  for (let i = 0; i < lines.length; i += 1) {
    const question = isQuestionLine(lines[i]);
    if (!question) continue;

    // Collect answer lines until next question / heading / hr / EOF.
    const answerLines: string[] = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j];
      if (isQuestionLine(next) || isBoundary(next)) break;
      answerLines.push(next);
    }

    // Strip leading "A." / "A:" prefix on the first non-empty line.
    const answerText = answerLines
      .join('\n')
      .replace(/^\s*A[\.:]\s*/, '') // leading "A." / "A:"
      .replace(/\s+/g, ' ') // collapse whitespace for schema value
      .trim();

    if (answerText.length === 0) continue;

    results.push({ question, answer: answerText });
  }

  return results;
}
