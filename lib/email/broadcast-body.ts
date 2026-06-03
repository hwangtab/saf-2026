// 브로드캐스트 본문(body_md)을 문단 배열로 변환하면서 {{name}} 토큰을 수신자 이름으로 치환.
// dispatch가 수신자별로 호출하므로 순수 함수로 분리 — 단위 테스트 가능.
export function splitAndPersonalize(bodyMd: string, name: string | null): string[] {
  const display = name ?? '회원';
  return bodyMd
    .split(/\n\n+/)
    .map((p) => p.trim().replace(/\{\{\s*name\s*\}\}/g, display))
    .filter(Boolean);
}
