/**
 * 한국어 매체 표기 → 영어 매핑.
 *
 * artworks.material 컬럼은 작가가 입력한 한국어 또는 영어 표기로 자유 텍스트.
 * 영어 로케일에서 한국어 표기가 그대로 노출되면 사용자에게 "한국어 페이지" 같은 인상.
 *
 * material_en DB 컬럼을 추가하지 않고 코드 매핑으로 해결 — 작가 admin 입력 부담 없음.
 * 매핑되지 않는 한국어는 source 그대로 유지(fallback).
 *
 * 정확 매칭(키 = 정규화된 한국어). 부분 매칭은 결과가 예측 어려워 채택 안 함.
 */
const MATERIAL_EN_MAP: Record<string, string> = {
  // Status placeholders
  '확인 중': 'TBD',

  // Canvas-based
  '캔버스에 유화': 'Oil on canvas',
  '캔버스에 유채': 'Oil on canvas',
  '캔버스에 아크릴': 'Acrylic on canvas',
  '캔버스에 아크릴채색': 'Acrylic on canvas',
  '캔버스에 아크릴 채색': 'Acrylic on canvas',
  '캔버스에 아크릴릭': 'Acrylic on canvas',
  '캔버스에 유채, 아크릴채색': 'Oil and acrylic on canvas',
  '캔버스에 아크릴, 유화': 'Acrylic and oil on canvas',
  '캔버스에 한지, 아크릴': 'Hanji and acrylic on canvas',
  '캔버스위에 아크릴, 콘테, 석회': 'Acrylic, conté, and lime on canvas',

  // Hanji (Korean paper)
  '한지에 먹': 'Ink on hanji',
  '한지에 채색': 'Color on hanji',
  '한지위에 수묵채색': 'Ink and color on hanji',
  '한지에 석채': 'Stone pigments on hanji',
  '한지에 목판화': 'Woodblock print on hanji',
  '한지에 피그먼트 프린트': 'Pigment print on hanji',
  '한지 먹 채색': 'Ink and color on hanji',
  '한지, 수간분채': 'Hanji, water-based powdered pigment',
  '먹, 한지': 'Ink on hanji',
  '염색한지 위에 분채': 'Powdered pigment on dyed hanji',
  '먹 염색한 한지 위에 분채': 'Powdered pigment on ink-dyed hanji',

  // Jangji (thick layered hanji)
  '장지에 채색': 'Color on jangji',
  '장지에 아크릴 채색': 'Acrylic on jangji',
  '장지에 먹과 채색': 'Ink and color on jangji',
  '장지에 먹과 분채': 'Ink and powdered pigment on jangji',
  '장지에 혼합재료': 'Mixed media on jangji',
  '장지에 혼합재료혼합': 'Mixed media on jangji',
  '장지 위에 흑연가루, 안료': 'Graphite powder and pigment on jangji',
  '장지에 연필, 분채': 'Pencil and powdered pigment on jangji',
  '장지에 연필, 콘테': 'Pencil and conté on jangji',
  '장지에 연필': 'Pencil on jangji',

  // Paper-based
  '종이, 연필': 'Pencil on paper',
  '종이에 연필': 'Pencil on paper',
  '종이, 수채': 'Watercolor on paper',
  '종이에 유채': 'Oil on paper',
  '종이에 먹': 'Ink on paper',
  '종이에 혼합재료': 'Mixed media on paper',
  '종이판넬, 아크릴물감': 'Acrylic paint on paper panel',
  '종이 먹 채색': 'Ink and color on paper',
  수채화: 'Watercolor',
  '수채화, 잉크드로잉, 박스, 한지': 'Watercolor, ink drawing, box, hanji',

  // Linen / cloth
  '린넨에 유채': 'Oil on linen',
  '린넨에 수묵채색': 'Ink and color on linen',
  '천위에 유채': 'Oil on cloth',

  // Silk
  '비단에 석채': 'Stone pigments on silk',

  // Woodblock prints
  '(사후판화)목판': 'Posthumous woodblock print',
  // 오윤 사후판화 — CSV 판법 4종 (저피지 = 닥나무 껍질 한지)
  '저피지(한지)에 목판화': 'Woodcut on mulberry-bark hanji',
  '저피지(한지)에 목판화, 수채 채색':
    'Woodcut on mulberry-bark hanji, hand-colored with watercolor',
  '저피지(한지)에 고무판화': 'Linocut on mulberry-bark hanji',
  '저피지(한지)에 고무판화, 수채 채색':
    'Linocut on mulberry-bark hanji, hand-colored with watercolor',
  '목판, 한지': 'Woodblock print on hanji',
  유성목판: 'Oil-based woodblock print',
  목판채색: 'Color woodblock print',
  다색목판: 'Multi-color woodblock print',
  '다색목판 48장 중에서': 'From a 48-block multi-color woodblock print',
  '다색목판 60장 중에서': 'From a 60-block multi-color woodblock print',
  채묵목판: 'Color-ink woodblock print',

  // Other prints
  '석판화, 종이': 'Lithograph on paper',
  '실크스크린(판화)': 'Silkscreen print',
  '판화지에 세리그라프\n,16도 프린팅': 'Serigraph (16-color printing) on print paper',
  '디지털 프린트': 'Digital print',
  '디지털 프린트, 디아섹': 'Digital print, Diasec',
  'pigment print(디아섹)': 'Pigment print (Diasec)',
  'Pigment based inkjet on touched paper, 하얀색 원목액자':
    'Pigment-based inkjet on touched paper, white solid-wood frame',
  'Pigment based inkjet on matte paper, 알루미늄 액자':
    'Pigment-based inkjet on matte paper, aluminum frame',
  '디지털프린트에 옻칠, 난각, 자개': 'Digital print with lacquer, eggshell, and mother-of-pearl',
  '1/5 프린트': 'Edition 1/5 print',

  // Ceramics / clay
  도자: 'Ceramic',
  테라코타: 'Terracotta',
  질구이: 'Earthenware',
  '흙으로 빗어 굽고 색칠': 'Hand-built ceramic, fired and painted',
  '흙 구운 후에 색칠': 'Painted on fired clay',

  // Metal / mixed
  철제: 'Steel',
  '조각 철판 8T': 'Cut steel plate, 8mm',
  '시멘트, 유사 금박, 왁스, 아크릴': 'Cement, faux gold leaf, wax, acrylic',
  'Acrylic, 알루미늄': 'Acrylic, aluminum',
  'Acrylic, 한지': 'Acrylic, hanji',

  // Mixed media
  '아크릴 페인팅': 'Acrylic painting',
  '믹스미디어 이후 아크릴 스틱 콜라주, 아크릴 채색':
    'Mixed media with acrylic stick collage and acrylic painting',
  '믹스미디어 이후 아크릴 스틱 콜라주, 아크릴 채색 ':
    'Mixed media with acrylic stick collage and acrylic painting',
  '혼합매체(Mixed media)': 'Mixed media',

  // Wood-panel based
  '화판에 목각과 채색': 'Wood carving and color on wood panel',
  '액자/화선지+먹+채색': 'Framed; ink and color on hwaseonji',
  '액자/화선지+먹': 'Framed; ink on hwaseonji',
};

/**
 * Get localized material label.
 * - ko: source 그대로 반환
 * - en: 매핑 사전 hit 시 영어, miss 시 source 그대로 (fallback)
 *
 * 공백 정리(앞뒤 trim)는 적용하지만 내부 공백·개행은 사전 키와 정확히 일치해야 매칭됨.
 * 앞뒤 공백·따옴표 차이로 미매핑되는 경우 사전에 변형형을 추가.
 */
export function getMaterialLabel(value: string | null | undefined, locale: string): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  if (locale !== 'en') return trimmed;
  return MATERIAL_EN_MAP[trimmed] ?? trimmed;
}

/**
 * 작품 크기 표기 영문화.
 *
 * artworks.size 컬럼에서 한국어로 등장하는 패턴은 사실상 '확인 중' 1종 + 숫자/단위 표기.
 * 숫자·단위(cm·mm·호 등)는 locale 무관해 그대로 통과. KO 텍스트만 매핑.
 */
const SIZE_EN_MAP: Record<string, string> = {
  '확인 중': 'TBD',
  미정: 'TBD',
};

export function getSizeLabel(value: string | null | undefined, locale: string): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  if (locale !== 'en') return trimmed;
  return SIZE_EN_MAP[trimmed] ?? trimmed;
}

/**
 * 작품 에디션 표기 영문화.
 *
 * DB 실제 패턴:
 * - '에디션 N/M' / '에디션 N' (주류)
 * - '에디션N/M' (공백 누락)
 * - '에디션 14, 16, 18' (여러 번호 콤마 구분)
 * - 'N/M' / 'N' (prefix 없음, 영어권 호환 형태)
 *
 * '에디션' prefix를 'Edition'으로 치환. 숫자만 있는 경우는 그대로 통과(이미 영어권 호환).
 */
const EDITION_KO_PREFIX = /^에디션\s*/;

export function getEditionLabel(value: string | null | undefined, locale: string): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  if (locale !== 'en') return trimmed;
  if (EDITION_KO_PREFIX.test(trimmed)) {
    return trimmed.replace(EDITION_KO_PREFIX, 'Edition ');
  }
  return trimmed;
}
