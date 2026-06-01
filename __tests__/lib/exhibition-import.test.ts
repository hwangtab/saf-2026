import {
  getExhibitionArtworkOverride,
  parseExhibitionSalesCsv,
  summarizeExhibitionCsvEligibility,
  summarizeExhibitionRows,
} from '@/lib/admin/exhibition-import';

describe('exhibition import helpers', () => {
  const csv = [
    '순번,이름,전번,주소,배송상황,분류,작가,작품,매출,반출여부,구매경로,입금여부,작품가격,작가몫,출품자,구매일자,배송여부',
    '1,류경준,010-9063-9633,"전남 장흥군, 문화연대",배송완료,회화,이광수,回1,"1,200,000",,현장,입금,"1,200,000",0,이광수,1.13,배송해야 함',
    '2,박영윤,010-9085-0845,서인형 지인,배송완료,조각,한애규,달을 든 여인,"2,000,000",,온라인,,"2,000,000","1,000,000",김진하,1.14,',
  ].join('\n');

  it('parses exhibition sales rows by Korean header names', () => {
    const rows = parseExhibitionSalesCsv(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      rowNo: 1,
      buyerName: '류경준',
      buyerPhone: '010-9063-9633',
      shippingAddress: '전남 장흥군, 문화연대',
      artistName: '이광수',
      artworkTitle: '回1',
      salePrice: 1200000,
      purchaseChannel: '현장',
      paidStatus: '입금',
      soldAt: '2026-01-13T03:00:00.000Z',
    });
  });

  it('summarizes parsed rows for dry-run verification', () => {
    const summary = summarizeExhibitionRows(parseExhibitionSalesCsv(csv));

    expect(summary).toEqual({
      rowCount: 2,
      uniqueBuyerCount: 2,
      missingPhoneCount: 0,
      missingAddressCount: 0,
      totalRevenue: 3200000,
      channels: { 현장: 1, 온라인: 1 },
    });
  });

  it('summarizes numbered, importable, and skipped CSV rows separately', () => {
    const mixedCsv = [
      '순번,이름,전번,주소,배송상황,분류,작가,작품,매출,반출여부,구매경로,입금여부,작품가격,작가몫,출품자,구매일자,배송여부',
      '1,류경준,010-9063-9633,"전남 장흥군, 문화연대",배송완료,회화,이광수,回1,"1,200,000",,현장,입금,"1,200,000",0,이광수,1.13,배송해야 함',
      '2,서인형,010-0000-0000,서울,배송완료,판화,오윤,칼노래,0,,현장,입금,0,0,오윤,1.22,',
      '3,,,,,,,,,,,,,0,,,',
    ].join('\n');

    expect(summarizeExhibitionCsvEligibility(mixedCsv)).toEqual({
      numberedRowCount: 3,
      importableRowCount: 1,
      skippedRowCount: 2,
      zeroRevenueRowCount: 1,
      blankRowCount: 1,
    });
  });

  it('corrects the row 169 purchase date typo before deriving sold_at', () => {
    const typoCsv = [
      '순번,이름,전번,주소,배송상황,분류,작가,작품,매출,반출여부,구매경로,입금여부,작품가격,작가몫,출품자,구매일자,배송여부',
      '169,박영윤,010-9085-0845,서인형 지인,배송완료,판화,이윤엽,콩밭매는 할머니2,"400,000",,현장,입금,"400,000","200,000",이윤엽,0.26,',
    ].join('\n');

    const rows = parseExhibitionSalesCsv(typoCsv);

    expect(rows[0]).toMatchObject({
      rowNo: 169,
      purchaseDate: '1.26',
      soldAt: '2026-01-26T03:00:00.000Z',
    });
  });

  it('resolves manual row overrides before normalized title matching', () => {
    const artworkById = new Map([
      [
        '2201db20-454b-45b2-8913-3f42dcb5e3f3',
        {
          id: '2201db20-454b-45b2-8913-3f42dcb5e3f3',
          title: '꿈의 안식처 Dream heaven',
          artistName: '윤겸',
        },
      ],
    ]);

    expect(getExhibitionArtworkOverride(176, artworkById)).toEqual({
      id: '2201db20-454b-45b2-8913-3f42dcb5e3f3',
      title: '꿈의 안식처 Dream heaven',
      artistName: '윤겸',
    });
  });
});
