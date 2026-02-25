/**
 * Convert SAF2026 Artworks to Cafe24 Bulk Upload CSV Format
 * 작품 데이터를 Cafe24 상품 일괄등록 양식으로 변환
 */

const fs = require('fs');
const path = require('path');

// Read the artworks TypeScript file
const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
const artworksContent = fs.readFileSync(artworksPath, 'utf-8');

// Extract the array content
const arrayMatch = artworksContent.match(/export const artworks: Artwork\[\] = \[([\s\S]*?)\];/);
if (!arrayMatch) {
  console.error('Could not find artworks array');
  process.exit(1);
}

const cleanedContent = arrayMatch[1].replace(/\n/g, ' ').replace(/\\n/g, '\\n').trim();
const artworksArray = eval('[' + cleanedContent + ']');

console.log(`📦 Found ${artworksArray.length} artworks to convert`);

// ====== CONFIGURATION ======
const CATEGORY_NO = '43'; // 씨앗페 2026
const TAX_TYPE = 'B'; // 면세 (예술품)
const ORIGIN = '국산';
const IMAGE_BASE_URL = '//ecimg.cafe24img.com/pg1248b38284644098/koreasmartcoop/saf2026/';

const POLICY_PAYMENT_INFO =
  '결제는 카페24 보안결제 시스템을 통해 처리됩니다. 무통장입금/카드결제 등 결제수단별 승인 시점에 따라 주문이 확정됩니다.';
const POLICY_SHIPPING_INFO =
  '결제 확인 후 평균 3~4영업일 이내 발송됩니다. 도서산간/대형·파손위험 작품은 전문 운송으로 전환될 수 있으며 추가 기간이 소요될 수 있습니다.';
const POLICY_EXCHANGE_RETURN_INFO =
  '단순변심에 의한 청약철회는 수령 후 7일 이내 가능합니다. 단순변심 반품 배송비는 구매자 부담이며, 하자/오배송은 판매자 부담으로 처리됩니다. 반품 확인 후 3영업일 이내 원결제수단으로 환불됩니다. 단, 작품 훼손/가치 훼손/주문제작 착수 시 청약철회가 제한될 수 있습니다.';
const POLICY_SERVICE_INFO =
  '주문 완료 → 결제 확인 → 작품 상태 최종 검수 → 발송(운송장 안내) 순으로 진행됩니다. 수령 후 이상 발견 시 24시간 이내 contact@kosmart.org / 02-764-3114로 문의 바랍니다.';

// Cafe24 CSV 헤더 (86개 컬럼)
const headers = [
  '상품코드',
  '자체 상품코드',
  '진열상태',
  '판매상태',
  '상품분류 번호',
  '상품분류 신상품영역',
  '상품분류 추천상품영역',
  '상품명',
  '영문 상품명',
  '상품명(관리용)',
  '공급사 상품명',
  '모델명',
  '상품 요약설명',
  '상품 간략설명',
  '상품 상세설명',
  '모바일 상품 상세설명 설정',
  '모바일 상품 상세설명',
  '검색어설정',
  '과세구분',
  '소비자가',
  '공급가',
  '상품가',
  '판매가',
  '판매가 대체문구 사용',
  '판매가 대체문구',
  '주문수량 제한 기준',
  '최소 주문수량(이상)',
  '최대 주문수량(이하)',
  '적립금',
  '적립금 구분',
  '공통이벤트 정보',
  '성인인증',
  '옵션사용',
  '품목 구성방식',
  '옵션 표시방식',
  '옵션세트명',
  '옵션입력',
  '옵션 스타일',
  '버튼이미지 설정',
  '색상 설정',
  '필수여부',
  '품절표시 문구',
  '추가입력옵션',
  '추가입력옵션 명칭',
  '추가입력옵션 선택/필수여부',
  '입력글자수(자)',
  '이미지등록(상세)',
  '이미지등록(목록)',
  '이미지등록(작은목록)',
  '이미지등록(축소)',
  '이미지등록(추가)',
  '제조사',
  '공급사',
  '브랜드',
  '트렌드',
  '자체분류 코드',
  '제조일자',
  '출시일자',
  '유효기간 사용여부',
  '유효기간',
  '원산지',
  '상품부피(cm)',
  '상품결제안내',
  '상품배송안내',
  '교환/반품안내',
  '서비스문의/안내',
  '배송정보',
  '배송방법',
  '국내/해외배송',
  '배송지역',
  '배송비 선결제 설정',
  '배송기간',
  '배송비 구분',
  '배송비입력',
  '스토어픽업 설정',
  '상품 전체중량(kg)',
  'HS코드',
  '상품 구분(해외통관)',
  '상품소재',
  '영문 상품소재(해외통관)',
  '옷감(해외통관)',
  '검색엔진최적화(SEO) 검색엔진 노출 설정',
  '검색엔진최적화(SEO) Title',
  '검색엔진최적화(SEO) Author',
  '검색엔진최적화(SEO) Description',
  '검색엔진최적화(SEO) Keywords',
  '검색엔진최적화(SEO) 상품 이미지 Alt 텍스트',
  '개별결제수단설정',
  '상품배송유형 코드',
  '메모',
];

// ====== HELPER FUNCTIONS ======

// Parse price string to number
function parsePrice(priceStr) {
  if (!priceStr || priceStr === '문의') return { value: 0, isInquiry: true };
  const numMatch = priceStr.replace(/[₩,\s]/g, '').match(/\d+/);
  return numMatch
    ? { value: parseInt(numMatch[0], 10), isInquiry: false }
    : { value: 0, isInquiry: true };
}

// Classify genre
function classifyGenre(material) {
  const m = (material || '').toLowerCase();
  if (m.includes('oil on canvas') || m.includes('acrylic on canvas') || m.includes('캔버스에'))
    return '회화';
  if (m.includes('pigment print') || m.includes('archival') || m.includes('inkjet')) return '사진';
  if (
    m.includes('목판') ||
    m.includes('etching') ||
    m.includes('lithography') ||
    m.includes('drypoint')
  )
    return '판화';
  if (m.includes('한지') || m.includes('분채') || m.includes('먹')) return '한국화';
  if (m.includes('mixed') || m.includes('믹스') || m.includes('콜라주')) return '믹스드 미디어';
  return '순수미술';
}

// Generate HTML description
function generateHtmlDescription(artwork) {
  const editionInfo = artwork.edition && artwork.edition !== '원본' ? artwork.edition : '원화 1/1';
  let html =
    '<div style="font-family: \'Noto Sans KR\', sans-serif; line-height: 1.8; color: #333;">';

  // 작품 기본 정보
  html += '<div style="margin-bottom: 30px;">';
  html += `<h2 style="font-size: 24px; margin-bottom: 10px;">${artwork.title}</h2>`;
  html += `<p style="font-size: 18px; color: #666; margin-bottom: 5px;">${artwork.artist}</p>`;
  html += `<p style="color: #888;">${artwork.material || ''} | ${artwork.size || ''} | ${artwork.year || ''}</p>`;
  if (artwork.edition && artwork.edition !== '원본') {
    html += `<p style="color: #888;">에디션: ${artwork.edition}</p>`;
  }
  html += '</div>';

  // 작품 설명
  if (artwork.description) {
    html += '<div style="margin-bottom: 30px;">';
    html +=
      '<h3 style="font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px;">작품 설명</h3>';
    html += `<p style="white-space: pre-line;">${artwork.description.replace(/\\n/g, '<br>')}</p>`;
    html += '</div>';
  }

  // 작가 프로필
  if (artwork.profile) {
    html += '<div style="margin-bottom: 30px;">';
    html +=
      '<h3 style="font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px;">작가 소개</h3>';
    html += `<p style="white-space: pre-line;">${artwork.profile.replace(/\\n/g, '<br>')}</p>`;
    html += '</div>';
  }

  // 작가 이력
  if (artwork.history) {
    html += '<div style="margin-bottom: 30px;">';
    html +=
      '<h3 style="font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px;">작가 이력</h3>';
    html += `<p style="white-space: pre-line; font-size: 14px;">${artwork.history.replace(/\\n/g, '<br>')}</p>`;
    html += '</div>';
  }

  html += '<hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0 18px;" />';
  html += '<h3 style="font-size: 18px; margin: 0 0 10px;">서비스 내용</h3>';
  html += `<p style="white-space: pre-line; margin: 0 0 14px;">본 상품은 ${artwork.artist}의 ${artwork.title} 작품 1점입니다.\n- 규격: ${artwork.size || '확인 중'}\n- 재료/기법: ${artwork.material || '확인 중'}\n- 제작연도: ${artwork.year || '확인 중'}\n- 에디션: ${editionInfo}\n- 구성: 작품 본품 1점 (액자 포함 여부는 상품 이미지 또는 문의를 통해 확인)</p>`;
  html += '<h3 style="font-size: 18px; margin: 16px 0 10px;">제공기간 및 이용안내</h3>';
  html += `<p style="white-space: pre-line; margin: 0 0 14px;">${POLICY_SHIPPING_INFO}\n${POLICY_SERVICE_INFO}</p>`;
  html += '<h3 style="font-size: 18px; margin: 16px 0 10px;">취소·교환·환불 정책</h3>';
  html += `<p style="white-space: pre-line; margin: 0;">${POLICY_EXCHANGE_RETURN_INFO}</p>`;

  html += '</div>';
  return html;
}

// Escape CSV field - always wrap in quotes for safety
function escapeCSV(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  // Always wrap in quotes and escape internal quotes
  return '"' + str.replace(/"/g, '""') + '"';
}

// ====== CONVERT ARTWORKS ======

const rows = artworksArray.map((artwork, index) => {
  const price = parsePrice(artwork.price);
  const genre = classifyGenre(artwork.material);
  const productCode = `SAF2026-${String(artwork.id).padStart(2, '0')}`;
  const productName = `${artwork.title} - ${artwork.artist}`;
  const summary = [genre, artwork.material, artwork.size].filter(Boolean).join(' | ');
  const keywords = [artwork.artist, genre, '씨앗페', 'SAF2026', '미술', '예술', '작품'].join(',');
  const htmlDesc = generateHtmlDescription(artwork);

  // Year formatting
  let manufactureDate = '';
  if (artwork.year && artwork.year !== '확인 중') {
    manufactureDate = artwork.year.length === 4 ? `${artwork.year}-01-01` : '';
  }

  // 86개 컬럼 데이터 생성
  const row = [
    '', // 상품코드 (자동생성)
    productCode, // 자체 상품코드
    'Y', // 진열상태
    'Y', // 판매상태
    CATEGORY_NO, // 상품분류 번호
    'Y', // 신상품영역
    'Y', // 추천상품영역
    productName, // 상품명
    '', // 영문 상품명
    `[${artwork.id}] ${artwork.artist}`.substring(0, 16), // 상품명(관리용) - 50byte 제한
    '', // 공급사 상품명
    '', // 모델명
    summary, // 상품 요약설명
    artwork.profile ? artwork.profile.substring(0, 200) + '...' : '', // 상품 간략설명
    htmlDesc, // 상품 상세설명
    'A', // 모바일 상품 상세설명 설정 (PC와 동일)
    '', // 모바일 상품 상세설명
    keywords, // 검색어설정
    TAX_TYPE, // 과세구분
    price.value, // 소비자가
    price.value, // 공급가
    price.value, // 상품가
    price.value, // 판매가
    price.isInquiry ? 'Y' : 'N', // 판매가 대체문구 사용
    price.isInquiry ? '가격 문의' : '', // 판매가 대체문구
    '', // 주문수량 제한 기준
    '1', // 최소 주문수량
    '1', // 최대 주문수량
    '', // 적립금
    '', // 적립금 구분
    '', // 공통이벤트 정보
    'N', // 성인인증
    'N', // 옵션사용
    '', // 품목 구성방식
    '', // 옵션 표시방식
    '', // 옵션세트명
    '', // 옵션입력
    '', // 옵션 스타일
    '', // 버튼이미지 설정
    '', // 색상 설정
    '', // 필수여부
    '품절', // 품절표시 문구
    '', // 추가입력옵션
    '', // 추가입력옵션 명칭
    '', // 추가입력옵션 선택/필수여부
    '', // 입력글자수
    IMAGE_BASE_URL + artwork.image, // 이미지등록(상세)
    IMAGE_BASE_URL + artwork.image, // 이미지등록(목록)
    IMAGE_BASE_URL + artwork.image, // 이미지등록(작은목록)
    IMAGE_BASE_URL + artwork.image, // 이미지등록(축소)
    '', // 이미지등록(추가)
    '', // 제조사 (비워둠 - Cafe24에서 미등록 제조사 오류)
    '', // 공급사
    '', // 브랜드
    '', // 트렌드
    '', // 자체분류 코드
    '', // 제조일자 (비워둠)
    '', // 출시일자 (비워둠)
    'N', // 유효기간 사용여부 (필수값)
    '', // 유효기간
    '', // 원산지 (비워둠 - 숫자코드만 가능)
    '', // 상품부피
    POLICY_PAYMENT_INFO, // 상품결제안내
    POLICY_SHIPPING_INFO, // 상품배송안내
    POLICY_EXCHANGE_RETURN_INFO, // 교환/반품안내
    POLICY_SERVICE_INFO, // 서비스문의/안내
    '', // 배송정보 (비워둠)
    '', // 배송방법 (비워둠)
    '', // 국내/해외배송
    '', // 배송지역
    '', // 배송비 선결제 설정
    '', // 배송기간
    '', // 배송비 구분
    '', // 배송비입력
    '', // 스토어픽업 설정
    '', // 상품 전체중량
    '', // HS코드
    '', // 상품 구분(해외통관)
    '', // 상품소재 (비워둠)
    '', // 영문 상품소재
    '', // 옷감(해외통관)
    '', // SEO 검색엔진 노출 설정 (비워둠)
    '', // SEO Title (비워둠)
    '', // SEO Author (비워둠)
    '', // SEO Description (비워둠)
    '', // SEO Keywords (비워둠)
    '', // SEO 이미지 Alt (비워둠)
    '', // 개별결제수단설정
    '', // 상품배송유형 코드
    '', // 메모 (비워둠)
  ];

  return row.map(escapeCSV).join(',');
});

// Build CSV
const BOM = '\uFEFF';
const csv = BOM + headers.join(',') + '\n' + rows.join('\n');

// Write to docs folder
const outputPath = path.join(__dirname, '../docs/cafe24-products.csv');
fs.writeFileSync(outputPath, csv, 'utf-8');

console.log(`\n✅ Cafe24 CSV 생성 완료: ${outputPath}`);
console.log(`총 ${artworksArray.length}개 작품이 변환되었습니다.`);
console.log(`\n📌 상품분류: 43 (씨앗페 2026)`);
console.log(`📌 과세구분: 면세 (예술품)`);
console.log(`📌 출시일자: 2026-01-14 (전시 시작일)`);
