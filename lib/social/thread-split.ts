// Threads 게시용 텍스트 분할 (순수 함수 — 클라이언트 힌트/서버 게시 공용, 외부 의존 없음).

export const THREADS_MAX_LEN = 500; // Threads 글 1개 글자 상한
const MANUAL_BREAK = /\n[ \t]*---[ \t]*\n/; // 사용자가 명시한 분할 지점(--- 만 있는 줄)

/** 한 문단이 maxLen을 넘으면 공백(또는 강제) 경계로 잘게 나눔. */
function hardSplit(text: string, maxLen: number): string[] {
  const out: string[] = [];
  let rest = text.trim();
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf(' ', maxLen);
    if (cut < maxLen * 0.6) cut = maxLen; // 적당한 공백 없으면 그냥 자름
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/** 문단(빈 줄) 경계 기준으로 maxLen 이하 조각들로 묶음. */
function autoSplit(text: string, maxLen: number): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxLen) return [trimmed];

  const paragraphs = trimmed.split(/\n{2,}/);
  const out: string[] = [];
  let buffer = '';

  for (const para of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${para}` : para;
    if (candidate.length <= maxLen) {
      buffer = candidate;
      continue;
    }
    if (buffer) {
      out.push(buffer);
      buffer = '';
    }
    if (para.length <= maxLen) {
      buffer = para;
    } else {
      out.push(...hardSplit(para, maxLen));
    }
  }
  if (buffer) out.push(buffer);
  return out;
}

/**
 * 캡션을 Threads 답글 체인용 세그먼트 배열로 분할.
 * 1) `---`만 있는 줄에서 우선 분리(수동 제어)
 * 2) 각 조각이 maxLen 초과면 문단/공백 경계로 자동 분할
 */
export function splitIntoThreadSegments(text: string, maxLen: number = THREADS_MAX_LEN): string[] {
  const manualParts = text.split(MANUAL_BREAK);
  const segments: string[] = [];
  for (const part of manualParts) {
    segments.push(...autoSplit(part, maxLen));
  }
  return segments.length > 0 ? segments : [text.trim()].filter(Boolean);
}

/** Instagram 등 단일 게시용: `---` 구분자 줄을 일반 빈 줄로 정리. */
export function stripThreadDelimiters(text: string): string {
  return text.replace(MANUAL_BREAK, '\n\n').trim();
}

/**
 * 단일 게시(Instagram)용 안전 축약. 글자 수 상한 초과 시:
 * - 단어/문장/문단 경계에서 자르고(중간 안 자름) `…` 표시
 * - 끝의 링크·해시태그(작품 보기/http/#…) 블록은 보존하고 본문 중간만 줄임
 *   (끝을 그냥 자르면 CTA 링크·태그가 사라지므로)
 */
export function clampForSinglePost(text: string, max: number): string {
  if (text.length <= max) return text;

  const lines = text.split('\n');
  let tailStart = lines.length;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const l = lines[i].trim();
    if (l === '' || l.startsWith('#') || l.includes('작품 보기') || /https?:\/\//.test(l)) {
      tailStart = i;
    } else {
      break;
    }
  }
  const tail = lines.slice(tailStart).join('\n').trim();
  const head = lines.slice(0, tailStart).join('\n');

  const avail = max - (tail.length + 4); // 4 = "\n\n" + "…" 여유
  if (avail < 100) {
    // tail이 비정상적으로 길면 통째로 하드 클램프
    return `${text.slice(0, max - 1).replace(/\s+$/, '')}…`;
  }

  let h = head.slice(0, avail);
  const brk = Math.max(
    h.lastIndexOf('\n'),
    h.lastIndexOf('. '),
    h.lastIndexOf('。'),
    h.lastIndexOf('! '),
    h.lastIndexOf('? '),
    h.lastIndexOf(' ')
  );
  if (brk > avail * 0.5) h = h.slice(0, brk);
  h = `${h.replace(/\s+$/, '')}…`;

  return tail ? `${h}\n\n${tail}` : h;
}
