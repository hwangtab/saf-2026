/**
 * 카테고리별 SEO 랜딩 콘텐츠 — long-tail 검색어 흡수용 visible 본문.
 *
 * 카테고리 페이지(`/artworks/category/[category]`)는 카드 그리드만 있어
 * "회화 작품 구매", "한국 판화 작가" 같은 high-volume 검색어를 흡수하지 못함.
 * 이 파일이 카테고리별 introductory 본문 + FAQ를 제공해 페이지를 SEO 랜딩으로 격상.
 *
 * 신규 카테고리는 매핑이 없으면 자동으로 fallback (visible section 없이 렌더).
 *
 * 콘텐츠 작성 가이드:
 * - intro: 1,000~1,500자, 검색 의도 + 구매 가이드 + 한국 미술 맥락 포함
 * - faqs: 3~5개, 정의형 검색어("X 뜻", "X 가격대") + 구매 의사결정 질문
 */
export interface CategorySeoFaq {
  q: string;
  a: string;
}

export interface CategorySeoContent {
  intro: string;
  faqs: CategorySeoFaq[];
  introEn?: string;
  faqsEn?: CategorySeoFaq[];
}

export const CATEGORY_SEO_CONTENT: Record<string, CategorySeoContent> = {
  회화: {
    intro: `회화는 캔버스나 종이에 직접 안료를 올려 그리는 가장 전통적이고 보편적인 미술 장르입니다. 한국 현대미술에서 회화는 1950년대 이후 추상표현주의·모노크롬·민중미술·신표현주의를 거쳐 다양하게 분화되어 왔으며, 오늘날에도 작가의 손길과 시간이 가장 직접적으로 드러나는 매체로 평가받습니다. 씨앗페에 출품된 회화 작품은 모두 작가가 직접 제작한 원본(유니크 피스)으로, 동일한 작품이 세상에 단 한 점만 존재합니다.

회화 원본 구매를 처음 고려하신다면 가격대와 크기, 재료(유화·아크릴·수채·장지에 채색)를 함께 살펴보시는 것이 좋습니다. 일반적으로 캔버스에 유화는 보존성이 가장 뛰어나고 오랜 시간 깊은 색감을 유지하며, 아크릴은 색이 선명하고 관리가 쉬워 처음 컬렉션을 시작하는 분에게 추천드립니다. 한지·장지에 채색은 한국 회화 고유의 질감을 보존하면서 현대적 감각을 더한 작품으로, 공간에 따뜻한 정취를 더합니다.

씨앗페에서 회화 원본을 구매하시면 작가에게 정당한 수익이 돌아갈 뿐 아니라, 판매 수익이 동료 예술인을 위한 저금리 상호부조 대출 기금이 됩니다. 한 점의 그림이 한 명의 작가에게는 다음 작업의 가능성이, 또 다른 작가에게는 위기를 견딜 자금이 됩니다.`,
    faqs: [
      {
        q: '회화 원본과 판화의 차이는 무엇인가요?',
        a: '회화 원본은 작가가 캔버스나 종이에 직접 그린 단 한 점의 작품(유니크 피스)이고, 판화는 같은 도판으로 여러 장(에디션)을 제작합니다. 같은 작가의 같은 이미지라도 회화 원본은 판화보다 가격이 5~10배 높은 경우가 많으며, 보존·전시 가치가 더 큽니다.',
      },
      {
        q: '회화 작품은 어떻게 보관해야 하나요?',
        a: '직사광선과 습도 변화를 피하는 것이 가장 중요합니다. 적정 습도는 50~60%이며, 캔버스 작품은 통풍이 잘 되는 곳에 걸어두시면 됩니다. 액자가 없는 캔버스 작품은 그대로 벽에 걸 수 있으며, 종이·한지 작품은 자외선 차단 유리가 있는 액자에 보관하시는 것을 권장합니다.',
      },
      {
        q: '처음 회화 원본을 살 때 가격대는 어느 정도가 적정한가요?',
        a: '국내 신진·중견 작가의 경우 10호(53×45cm) 기준 50만~300만 원선에서 좋은 작품을 만나실 수 있습니다. 씨앗페에는 ₩200,000부터 시작하는 소품부터 거장의 대형 작품까지 다양한 가격대가 있으며, 가격은 크기·재료·작가의 경력과 시장가를 모두 반영해 책정됩니다.',
      },
    ],
    introEn: `Painting is the most traditional and universal art form, applying pigments directly onto canvas or paper. In Korean contemporary art, painting has evolved through abstract expressionism, monochrome, Minjung art, and neo-expressionism since the 1950s, and remains the medium where the artist's hand and time are most directly expressed. All paintings in SAF are unique original works—only one of each exists in the world.

When considering original painting for the first time, look at the price range, size, and material (oil, acrylic, watercolor, or pigment on Korean paper) together. Oil on canvas offers the best preservation and richest colors over time. Acrylics provide vivid colors and easy maintenance, recommended for first collectors. Pigment on hanji or jangji preserves the unique texture of Korean painting while adding contemporary sensibility.

Buying an original painting at SAF gives the artist fair compensation and turns sales into a low-interest mutual aid loan fund for fellow artists. One painting becomes both a possibility for one artist's next work and capital for another to weather a crisis.`,
    faqsEn: [
      {
        q: 'What is the difference between an original painting and a print?',
        a: 'An original painting is a unique piece directly made by the artist on canvas or paper—only one exists. A print is one of multiple editions made from the same plate. Original paintings are typically 5–10× more expensive than prints by the same artist, with greater preservation and exhibition value.',
      },
      {
        q: 'How should I store a painting?',
        a: 'Avoid direct sunlight and humidity fluctuations. Maintain 50–60% humidity. Canvas works can be hung in well-ventilated spaces; paper or hanji works should be framed with UV-blocking glass.',
      },
      {
        q: "What's a reasonable price for my first original painting?",
        a: 'For emerging or mid-career Korean artists, expect ₩500,000–₩3,000,000 for a 10-ho (53×45cm) work. SAF offers everything from small works starting at ₩200,000 to major pieces by master artists.',
      },
    ],
  },

  한국화: {
    intro: `한국화는 한지나 장지에 먹과 안료로 그리는 동아시아 회화의 한국적 전통을 잇는 장르입니다. 조선시대 문인화·산수화·풍속화의 맥을 따라 발전해왔으며, 20세기 이후 현대 한국화는 전통 재료와 현대적 감각을 결합해 새로운 표현을 모색해왔습니다. 화선지 특유의 번짐과 발묵, 장지의 깊고 따뜻한 채색, 먹의 농담 변화는 서양 회화와는 다른 독특한 미감을 만들어냅니다.

씨앗페의 한국화 작품은 전통 산수·인물·화조부터 현대적 추상·실험까지 다양하게 포괄하며, 모두 작가가 한지·장지에 직접 그린 원본입니다. 한국화는 서양 회화에 비해 보관과 액자 작업이 까다로울 수 있지만, 적절히 관리하면 백 년 이상 색과 질감이 유지되는 견고한 매체입니다.

한국화는 거실·서재·차분한 공간에 잘 어울리며, 동양적 여백의 미와 함께 공간에 정신적 깊이를 더합니다. 처음 한국화를 구매하실 때는 작가의 표구(액자) 추천을 받아 자외선 차단 유리로 보관하시면 보존 가치를 오래 유지할 수 있습니다. 씨앗페의 한국화 작품 구매는 한국 전통 매체의 현대적 계승에 힘을 보태는 의미 있는 선택입니다.`,
    faqs: [
      {
        q: '한국화와 동양화는 같은 의미인가요?',
        a: '엄밀히 말하면 동양화는 한국·중국·일본 등 동아시아 회화 전반을 포괄하는 큰 범주이고, 한국화는 그 중 한국적 전통과 정체성을 이어받은 회화를 가리킵니다. 1970년대 이후 한국 화단에서는 자국의 전통을 강조하는 의미로 "한국화"라는 명칭을 적극적으로 사용해왔습니다.',
      },
      {
        q: '한국화는 어떻게 표구해야 하나요?',
        a: '전통적으로는 족자(걸이형) 또는 액자 형태로 표구하며, 자외선 차단 유리와 산성도가 낮은 마운팅 보드를 사용해야 변색을 막을 수 있습니다. 작가가 직접 표구를 추천하거나 제작해주는 경우가 많으니 구매 시 문의해보시는 것을 권장합니다.',
      },
      {
        q: '한지에 그린 작품은 보존성이 떨어지지 않나요?',
        a: '한지(특히 닥종이로 만든 정통 한지)는 천 년 이상 보존된 사례가 있을 정도로 매우 견고한 재료입니다. 자외선·습도만 잘 관리하면 캔버스 작품 못지않게 오래 보존됩니다.',
      },
    ],
  },

  판화: {
    intro: `판화는 나무·금속·돌·실크스크린 등 판(版)에 그림을 새겨 잉크를 묻혀 종이에 찍어내는 미술 매체입니다. 같은 도판으로 여러 장이 인쇄되지만, 각 장은 작가가 직접 인쇄·검수·서명하기에 모두 "원본"으로 인정됩니다. 보통 작품에 "1/100"처럼 에디션 번호가 적히는데, 이는 100장 중 첫 번째 장이라는 뜻입니다. 작가의 서명과 에디션 번호가 함께 있어야 정식 한정판 판화입니다.

한국 현대 판화는 1960년대 이후 신체파·현실과 발언·민중미술 흐름을 거치며 사회적 메시지를 담는 강력한 매체로 자리잡았습니다. 오윤·이철수·박불똥·이윤엽 같은 작가들의 목판화·동판화는 한국 미술사의 중요한 유산이며, 씨앗페에서는 이러한 거장의 작품과 동시대 작가들의 신작을 함께 만나실 수 있습니다.

판화는 회화 원본보다 합리적인 가격으로 작가의 작품을 소장할 수 있는 좋은 입문 매체입니다. 일반적으로 같은 작가의 회화 원본 가격의 5분의 1에서 10분의 1 수준으로 구매하실 수 있으며, 한정 에디션이라는 희소성과 작가 서명의 가치가 함께 보장됩니다. 처음 미술 컬렉션을 시작하시는 분, 합리적인 가격으로 의미 있는 작품을 소장하고 싶으신 분께 특히 추천드립니다.`,
    faqs: [
      {
        q: '에디션 넘버링(1/100, AP, EA)은 어떤 의미인가요?',
        a: '"1/100"은 100장 한정으로 인쇄된 판화 중 첫 번째 장이라는 뜻이고, 분모가 작을수록(예: 1/30) 희소가치가 높습니다. AP(Artist\'s Proof)는 작가 보관용, EA(Épreuve d\'Artiste)는 프랑스식 작가 보관용 표기로 보통 에디션 외에 5~10장 별도 제작되며 시장가가 더 높습니다. HC(Hors Commerce)는 비매품으로 표시한 검수용입니다.',
      },
      {
        q: '판화는 어떻게 종류가 나뉘나요?',
        a: '제작 방식에 따라 목판화(나무 판), 동판화/에칭(금속 판), 석판화/리소그래프(돌·알루미늄 판), 실크스크린/세리그래피(망사 판), 모노타이프(1회성 판화) 등으로 나뉩니다. 각 기법마다 선의 질감과 색의 표현이 달라 같은 이미지라도 매체에 따라 분위기가 크게 달라집니다.',
      },
      {
        q: '판화 가격은 어떻게 결정되나요?',
        a: '에디션 수(분모가 작을수록 희소), 작가의 명성과 시장가, 크기, 제작 방식의 난이도, 보존 상태가 종합적으로 반영됩니다. 한국 작가 판화는 보통 ₩100,000~₩2,000,000선에서 다양한 작품을 만나실 수 있으며, 거장의 인기 에디션은 그 이상으로 형성됩니다.',
      },
    ],
  },

  사진: {
    intro: `사진은 카메라로 포착한 순간을 인화·프린트로 작품화한 매체로, 20세기 이후 현대미술의 핵심 영역으로 자리잡았습니다. 한국 사진예술은 다큐멘터리·인물·풍경·개념적 연출·디지털 콜라주까지 다양하게 분화되어 있으며, 작가의 시선과 사회적 맥락이 한 장의 이미지에 응축됩니다.

씨앗페에 출품된 사진 작품은 모두 한정 에디션 파인아트 프린트(Fine Art Print)로 제작됩니다. 일반 인화와 달리 아키이벌(archival) 기준의 안료 잉크와 두꺼운 종이를 사용해 100~200년의 보존성을 갖추며, 작가의 직접 서명·번호와 함께 발행됩니다. 같은 이미지라도 인화 매체(아키이벌 피그먼트 프린트, 실크스크린, 디지털 C-print 등)에 따라 색감과 질감이 크게 달라지므로, 작가가 의도한 매체로 인쇄된 정식 한정판인지 확인이 중요합니다.

사진 작품은 다른 회화·판화에 비해 합리적인 가격대(₩300,000~₩3,000,000)로 작가의 시그니처 이미지를 소장할 수 있어, 미술 컬렉션 입문자에게도 부담이 적습니다. 또한 같은 작품을 여러 사이즈로 발행하는 작가도 많아, 공간 크기에 맞게 선택하실 수 있습니다. 씨앗페에서는 강레아·조문호·정영신·손은영 등 한국 사진예술의 다양한 흐름을 만나실 수 있습니다.`,
    faqs: [
      {
        q: '아키이벌 피그먼트 프린트(Archival Pigment Print)는 무엇인가요?',
        a: '안료 기반 잉크와 산성도가 낮은 미술 전용 종이를 사용해 인쇄한 파인아트 사진 프린트입니다. 일반 잉크젯·실버할라이드(은염) 인화에 비해 변색에 강해 100~200년 보존이 가능하며, 현재 미술관·갤러리에서 표준으로 사용하는 인쇄 방식입니다.',
      },
      {
        q: '디지털 사진도 "원본"으로 볼 수 있나요?',
        a: '디지털 사진의 "원본"은 작가가 정해진 한정 에디션으로 발행한 파인아트 프린트를 의미합니다. 작가가 직접 또는 공인 인화소에서 인쇄·검수·서명한 작품만 정식 원본으로 인정되며, 같은 디지털 파일이 무한 복제 가능하더라도 한정 에디션이라는 희소성이 가치를 보장합니다.',
      },
      {
        q: '사진 작품은 어떻게 보관해야 하나요?',
        a: '직사광선·습도(특히 70% 이상)·담배 연기를 피하시고, 자외선 차단 유리와 산성도 낮은 매트(mat) 보드가 있는 액자에 보관하시면 됩니다. 액자 없이 받으셨다면 작가가 추천하는 표구사를 통해 아키이벌 표준에 맞춰 액자 작업을 하시는 것을 권장합니다.',
      },
    ],
  },

  조각: {
    intro: `조각은 입체로 공간을 점유하며 사방에서 감상할 수 있는 미술 매체입니다. 흙·돌·나무·금속·합성수지·유리 등 다양한 재료로 제작되며, 작가의 손길이 가장 물리적으로 드러나는 분야입니다. 한국 현대 조각은 김종영·문신 등 1세대 추상 조각가부터 양주열·신학철 등 사회적 메시지를 담은 작가들, 그리고 동시대 신진 작가들의 실험적 작품까지 폭넓게 펼쳐져 있습니다.

씨앗페의 조각 작품은 작가가 직접 제작·서명한 유니크 피스 또는 한정 에디션으로 출품되며, 청동·합성수지(FRP) 캐스팅의 경우 보통 5~10점 한정 에디션으로 발행됩니다. 회화에 비해 보관·운송이 까다로울 수 있지만, 공간에 단단한 존재감을 더하는 매력은 다른 매체가 대신할 수 없습니다. 거실의 한쪽 코너, 책장 위, 정원의 일부 등 다양한 위치에 배치 가능하며, 작가가 권장하는 받침(좌대)이나 디스플레이 방식이 있다면 함께 문의하시는 것이 좋습니다.

조각은 가격대가 크기·재료에 따라 큰 폭으로 형성됩니다. 손바닥 크기의 소품(₩300,000~)부터 거실 메인 작품(₩1M~10M), 야외용 대형 작품(수천만 원~수억 원)까지 다양합니다. 처음 조각을 구매하실 때는 공간 크기·하중·이동 가능성을 고려하시는 것이 좋습니다.`,
    faqs: [
      {
        q: '조각 작품도 한정 에디션이 있나요?',
        a: '청동(브론즈) 캐스팅이나 합성수지(FRP)로 제작된 조각은 같은 원형 틀에서 여러 점을 떠낼 수 있어 보통 5~10점 한정 에디션으로 발행됩니다. 직접 깎는 단일 조각(나무·돌·테라코타)은 유니크 피스(1점만 존재)로 분류됩니다. 에디션 번호와 작가 서명이 작품 하단·뒷면에 새겨집니다.',
      },
      {
        q: '실내에서 조각 작품을 어떻게 배치하면 좋을까요?',
        a: '시선이 자연스럽게 닿는 위치(거실 코너, 책장 위, 콘솔 위)에 좌대를 두고 배치하시면 효과가 좋습니다. 사방 감상이 가능한 작품은 벽에서 30cm 이상 띄워 회전 동선을 확보하시고, 조명은 작품 위에서 살짝 비스듬히 비추는 것이 그림자를 살려 입체감을 강조합니다.',
      },
      {
        q: '청동 조각은 시간이 지나면 어떻게 변하나요?',
        a: '청동(브론즈)은 시간이 지나면 산화로 인해 녹청(파티나)이 자연스럽게 형성되며, 이는 작품의 가치를 손상시키지 않고 오히려 깊이감을 더합니다. 실내 보관 시에는 표면을 부드러운 천으로 가볍게 닦고 직사광선과 다습 환경을 피하시면 백 년 이상 보존이 가능합니다.',
      },
    ],
  },
};

/** 카테고리명으로 SEO 콘텐츠 조회. 매핑 없으면 undefined. */
export function getCategorySeoContent(category: string): CategorySeoContent | undefined {
  return CATEGORY_SEO_CONTENT[category];
}
