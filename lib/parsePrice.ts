export function parsePrice(priceStr: string): number {
  if (!priceStr || priceStr === '문의' || priceStr === '확인 중') {
    return Infinity;
  }

  const numericStr = priceStr.replace(/[^\d]/g, '');
  const parsed = parseInt(numericStr, 10);

  return isNaN(parsed) || parsed === 0 ? Infinity : parsed;
}
