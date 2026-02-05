export function parsePrice(priceValue: string | number | null | undefined): number {
  if (priceValue === null || priceValue === undefined) {
    return Infinity;
  }

  const priceStr = String(priceValue);
  if (!priceStr || priceStr === '문의' || priceStr === '확인 중') {
    return Infinity;
  }

  const numericStr = priceStr.replace(/[^\d]/g, '');
  const parsed = parseInt(numericStr, 10);

  return isNaN(parsed) || parsed === 0 ? Infinity : parsed;
}
