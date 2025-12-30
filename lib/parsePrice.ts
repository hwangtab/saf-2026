/**
 * 가격 문자열을 숫자로 변환
 * @param priceStr - "₩1,000,000" 형식의 가격 문자열
 * @returns 숫자 (정렬 불가능한 값은 Infinity 반환)
 */
export function parsePrice(priceStr: string): number {
    // "문의", "확인 중" 등 숫자가 아닌 경우 맨 뒤로
    if (!priceStr || priceStr === '문의' || priceStr === '확인 중') {
        return Infinity;
    }

    // "₩1,000,000" → "1000000" → 1000000
    const numericStr = priceStr.replace(/[₩,\s]/g, '');
    const parsed = parseInt(numericStr, 10);

    return isNaN(parsed) ? Infinity : parsed;
}
