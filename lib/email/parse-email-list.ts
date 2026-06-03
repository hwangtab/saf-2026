import { isValidEmail } from '@/lib/utils/input-validation';

export interface ParsedEmail {
  email: string;
  name: string | null;
}

// 관리자가 붙여넣은/타이핑한 주소 목록을 파싱.
// 구분자: 쉼표·세미콜론·줄바꿈. "이름 <메일>" 형식 지원. 무효는 invalid로 분리(전체 실패 방지).
export function parseEmailList(raw: string): {
  valid: ParsedEmail[];
  invalid: string[];
} {
  const tokens = raw
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const valid: ParsedEmail[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const angle = token.match(/^(.*?)<([^>]+)>$/);
    const rawEmail = (angle ? angle[2] : token).trim();
    const name = angle ? angle[1].trim() || null : null;
    const email = rawEmail.toLowerCase();

    if (!isValidEmail(email)) {
      invalid.push(token);
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    valid.push({ email, name });
  }

  return { valid, invalid };
}
