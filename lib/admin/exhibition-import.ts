export type ExhibitionSaleCsvRow = {
  rowNo: number;
  buyerName: string | null;
  buyerPhone: string | null;
  shippingAddress: string | null;
  deliveryStatus: string | null;
  category: string | null;
  artistName: string;
  artworkTitle: string;
  salePrice: number;
  releaseStatus: string | null;
  purchaseChannel: string | null;
  paidStatus: string | null;
  artworkPrice: number;
  artistShare: number;
  exhibitorName: string | null;
  purchaseDate: string | null;
  soldAt: string;
  shippingRequired: string | null;
  rawPayload: Record<string, string>;
};

export type ExhibitionArtworkCandidate = {
  id: string;
  title: string | null;
  artistName: string | null;
};

export type ExhibitionArtworkOverride = {
  artworkId: string;
  title: string;
};

export type ExhibitionRowsSummary = {
  rowCount: number;
  uniqueBuyerCount: number;
  missingPhoneCount: number;
  missingAddressCount: number;
  totalRevenue: number;
  channels: Record<string, number>;
};

export type ExhibitionCsvEligibilitySummary = {
  numberedRowCount: number;
  importableRowCount: number;
  skippedRowCount: number;
  zeroRevenueRowCount: number;
  blankRowCount: number;
};

export const EXHIBITION_ARTWORK_OVERRIDES_BY_ROW_NO: Record<number, ExhibitionArtworkOverride> = {
  26: { artworkId: '73985bc5-b671-4ede-a35a-9fd5696e415d', title: '푸른 소나무' },
  29: { artworkId: 'd196f797-8d43-434d-9b76-d561dab443a7', title: 'Blue night-4' },
  37: { artworkId: '06b76f49-9e49-478a-8f53-8051f31503f8', title: '콩밭메는 할머니2' },
  43: { artworkId: '7afe8a97-3df7-4488-9802-e4a73eb934e2', title: '달을 든 여인' },
  53: { artworkId: '51db7e2f-a14d-41cc-a375-64f35062ecc4', title: '손 모은 사람' },
  69: { artworkId: '06b76f49-9e49-478a-8f53-8051f31503f8', title: '콩밭메는 할머니2' },
  80: { artworkId: '9ff1d220-e89b-435d-9af0-9cc6db71ded5', title: 'c ; 작은 하늘' },
  97: { artworkId: '73985bc5-b671-4ede-a35a-9fd5696e415d', title: '푸른 소나무' },
  116: { artworkId: 'a18346ab-379f-4a33-8cb2-4b37159372da', title: '보리술잔' },
  117: { artworkId: '51db7e2f-a14d-41cc-a375-64f35062ecc4', title: '손 모은 사람' },
  118: { artworkId: 'd196f797-8d43-434d-9b76-d561dab443a7', title: 'Blue night-4' },
  125: { artworkId: '94637fa3-503d-4cf6-83da-067c20c54035', title: '노무현(작품 다섯 점)' },
  147: { artworkId: '3d606533-c5ed-4fe5-8112-8fd56bcf8767', title: '꿈의 안식처 Dream heaven' },
  154: { artworkId: 'a8cca196-abeb-4af7-9edf-e7c4e185370c', title: '노무현' },
  158: { artworkId: '06b76f49-9e49-478a-8f53-8051f31503f8', title: '콩밭메는 할머니2' },
  169: { artworkId: '06b76f49-9e49-478a-8f53-8051f31503f8', title: '콩밭메는 할머니2' },
  176: { artworkId: '2201db20-454b-45b2-8913-3f42dcb5e3f3', title: '꿈의 안식처 Dream heaven' },
  181: { artworkId: 'f311208c-8002-4dbe-aeb4-58dcc4b2b0b6', title: '산' },
  184: { artworkId: '0e60e54b-9bb1-4715-8927-87d84f14d194', title: '노무현' },
};

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(cell.trim());
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += ch;
  }

  if (cell || row.length > 0) {
    row.push(cell.trim());
    if (row.some((value) => value.trim())) rows.push(row);
  }

  return rows;
}

function parseMoney(raw: string | null | undefined): number {
  const value = Number(String(raw || '').replace(/[^0-9]/g, ''));
  return Number.isFinite(value) ? value : 0;
}

function nullableText(raw: string | null | undefined): string | null {
  const trimmed = (raw || '').trim();
  return trimmed || null;
}

function parseSoldAtKst(rawDate: string | null | undefined, fallbackSeq: number): string {
  const match = String(rawDate || '').match(/(\d{1,2})\.(\d{1,2})/);
  if (match) {
    const month = Number.parseInt(match[1], 10);
    const day = Number.parseInt(match[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(2026, month - 1, day, 3, 0, 0, 0)).toISOString();
    }
  }

  return new Date(
    Date.UTC(2026, 0, 14, 3, 0, Math.max(0, Math.min(59, fallbackSeq % 60)))
  ).toISOString();
}

export function normalizeArtworkKeyPart(value: string | null | undefined): string {
  return String(value || '')
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/[\-–—_.,'"`~!@#$%^&*()[\]{}:;?/\\|+<>]/g, '')
    .toLowerCase();
}

export function parseExhibitionSalesCsv(content: string): ExhibitionSaleCsvRow[] {
  const parsedRows = parseCsv(content);
  const headers = parsedRows[0] || [];
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const valueAt = (row: string[], header: string) => row[headerIndex.get(header) ?? -1] || '';

  return parsedRows
    .slice(1)
    .map((row) => {
      const rowNo = Number.parseInt(valueAt(row, '순번'), 10);
      if (!Number.isFinite(rowNo) || rowNo <= 0) return null;

      const artistName = nullableText(valueAt(row, '작가'));
      const artworkTitle = nullableText(valueAt(row, '작품'));
      const salePrice = parseMoney(valueAt(row, '매출'));
      if (!artistName || !artworkTitle || salePrice <= 0) return null;

      const rawPayload: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (header) rawPayload[header] = row[index] || '';
      });

      let purchaseDate = nullableText(valueAt(row, '구매일자'));
      if (rowNo === 169 && purchaseDate === '0.26') {
        purchaseDate = '1.26';
      }

      return {
        rowNo,
        buyerName: nullableText(valueAt(row, '이름')),
        buyerPhone: nullableText(valueAt(row, '전번')),
        shippingAddress: nullableText(valueAt(row, '주소')),
        deliveryStatus: nullableText(valueAt(row, '배송상황')),
        category: nullableText(valueAt(row, '분류')),
        artistName,
        artworkTitle,
        salePrice,
        releaseStatus: nullableText(valueAt(row, '반출여부')),
        purchaseChannel: nullableText(valueAt(row, '구매경로')),
        paidStatus: nullableText(valueAt(row, '입금여부')),
        artworkPrice: parseMoney(valueAt(row, '작품가격')),
        artistShare: parseMoney(valueAt(row, '작가몫')),
        exhibitorName: nullableText(valueAt(row, '출품자')),
        purchaseDate,
        soldAt: parseSoldAtKst(purchaseDate, rowNo),
        shippingRequired: nullableText(valueAt(row, '배송여부')),
        rawPayload,
      };
    })
    .filter((row): row is ExhibitionSaleCsvRow => Boolean(row));
}

export function summarizeExhibitionCsvEligibility(
  content: string
): ExhibitionCsvEligibilitySummary {
  const parsedRows = parseCsv(content);
  const headers = parsedRows[0] || [];
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const valueAt = (row: string[], header: string) => row[headerIndex.get(header) ?? -1] || '';

  let numberedRowCount = 0;
  let importableRowCount = 0;
  let zeroRevenueRowCount = 0;
  let blankRowCount = 0;

  for (const row of parsedRows.slice(1)) {
    const rowNo = Number.parseInt(valueAt(row, '순번'), 10);
    if (!Number.isFinite(rowNo) || rowNo <= 0) continue;

    numberedRowCount += 1;

    const artistName = nullableText(valueAt(row, '작가'));
    const artworkTitle = nullableText(valueAt(row, '작품'));
    const salePrice = parseMoney(valueAt(row, '매출'));
    if (artistName && artworkTitle && salePrice > 0) {
      importableRowCount += 1;
      continue;
    }

    const hasContentOutsideRowNo = row.some((value, index) => {
      const header = headers[index];
      const trimmed = value.trim();
      if (!trimmed || header === '순번') return false;
      return !(trimmed === '0' && ['매출', '작품가격', '작가몫'].includes(header));
    });
    if (!hasContentOutsideRowNo) {
      blankRowCount += 1;
    } else if (salePrice <= 0) {
      zeroRevenueRowCount += 1;
    }
  }

  return {
    numberedRowCount,
    importableRowCount,
    skippedRowCount: numberedRowCount - importableRowCount,
    zeroRevenueRowCount,
    blankRowCount,
  };
}

export function getExhibitionArtworkOverride(
  rowNo: number,
  artworkById: Map<string, ExhibitionArtworkCandidate>
): ExhibitionArtworkCandidate | null {
  const override = EXHIBITION_ARTWORK_OVERRIDES_BY_ROW_NO[rowNo];
  if (!override) return null;

  const artwork = artworkById.get(override.artworkId);
  if (artwork) return artwork;

  return {
    id: override.artworkId,
    title: override.title,
    artistName: null,
  };
}

export function summarizeExhibitionRows(rows: ExhibitionSaleCsvRow[]): ExhibitionRowsSummary {
  const uniqueBuyers = new Set<string>();
  const channels: Record<string, number> = {};
  let missingPhoneCount = 0;
  let missingAddressCount = 0;
  let totalRevenue = 0;

  for (const row of rows) {
    const buyerKey = row.buyerPhone || row.buyerName || `row:${row.rowNo}`;
    uniqueBuyers.add(buyerKey);
    if (!row.buyerPhone) missingPhoneCount += 1;
    if (!row.shippingAddress) missingAddressCount += 1;
    totalRevenue += row.salePrice;
    const channel = row.purchaseChannel || '(blank)';
    channels[channel] = (channels[channel] || 0) + 1;
  }

  return {
    rowCount: rows.length,
    uniqueBuyerCount: uniqueBuyers.size,
    missingPhoneCount,
    missingAddressCount,
    totalRevenue,
    channels,
  };
}
