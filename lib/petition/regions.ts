/**
 * 청원 서명 폼의 거주 지역 드롭다운 데이터.
 *
 * - `key`     : DB `petition_signatures.region_top` 칼럼에 저장되는 짧은 키.
 *               마이그레이션 `20260427034000_petition_signatures.sql`의 CHECK 제약과
 *               1:1 일치해야 INSERT가 통과한다.
 * - `label`   : UI 노출용 풀네임 (특별자치시·특별자치도 정식 명칭).
 * - `subs`    : 시·군·구 목록 (가나다순). 세종·해외는 빈 배열.
 *
 * 시·군·구 출처: 행정안전부 행정구역 현황 (군위군 2023-07-01 경북 → 대구 편입 반영,
 * 강원특별자치도 2023-06-11, 전북특별자치도 2024-01-18 명칭 변경 반영).
 */

export interface RegionSubdivision {
  readonly key: string;
  readonly label: string;
  readonly subs: readonly string[];
}

export const REGIONS: readonly RegionSubdivision[] = [
  {
    key: '서울',
    label: '서울특별시',
    subs: [
      '강남구',
      '강동구',
      '강북구',
      '강서구',
      '관악구',
      '광진구',
      '구로구',
      '금천구',
      '노원구',
      '도봉구',
      '동대문구',
      '동작구',
      '마포구',
      '서대문구',
      '서초구',
      '성동구',
      '성북구',
      '송파구',
      '양천구',
      '영등포구',
      '용산구',
      '은평구',
      '종로구',
      '중구',
      '중랑구',
    ],
  },
  {
    key: '부산',
    label: '부산광역시',
    subs: [
      '강서구',
      '금정구',
      '기장군',
      '남구',
      '동구',
      '동래구',
      '부산진구',
      '북구',
      '사상구',
      '사하구',
      '서구',
      '수영구',
      '연제구',
      '영도구',
      '중구',
      '해운대구',
    ],
  },
  {
    key: '대구',
    label: '대구광역시',
    subs: ['군위군', '남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
  },
  {
    key: '인천',
    label: '인천광역시',
    subs: [
      '강화군',
      '계양구',
      '남동구',
      '동구',
      '미추홀구',
      '부평구',
      '서구',
      '연수구',
      '옹진군',
      '중구',
    ],
  },
  {
    key: '광주',
    label: '광주광역시',
    subs: ['광산구', '남구', '동구', '북구', '서구'],
  },
  {
    key: '대전',
    label: '대전광역시',
    subs: ['대덕구', '동구', '서구', '유성구', '중구'],
  },
  {
    key: '울산',
    label: '울산광역시',
    subs: ['남구', '동구', '북구', '울주군', '중구'],
  },
  {
    key: '세종',
    label: '세종특별자치시',
    subs: [],
  },
  {
    key: '경기',
    label: '경기도',
    subs: [
      '가평군',
      '고양시',
      '과천시',
      '광명시',
      '광주시',
      '구리시',
      '군포시',
      '김포시',
      '남양주시',
      '동두천시',
      '부천시',
      '성남시',
      '수원시',
      '시흥시',
      '안산시',
      '안성시',
      '안양시',
      '양주시',
      '양평군',
      '여주시',
      '연천군',
      '오산시',
      '용인시',
      '의왕시',
      '의정부시',
      '이천시',
      '파주시',
      '평택시',
      '포천시',
      '하남시',
      '화성시',
    ],
  },
  {
    key: '강원',
    label: '강원특별자치도',
    subs: [
      '강릉시',
      '고성군',
      '동해시',
      '삼척시',
      '속초시',
      '양구군',
      '양양군',
      '영월군',
      '원주시',
      '인제군',
      '정선군',
      '철원군',
      '춘천시',
      '태백시',
      '평창군',
      '홍천군',
      '화천군',
      '횡성군',
    ],
  },
  {
    key: '충북',
    label: '충청북도',
    subs: [
      '괴산군',
      '단양군',
      '보은군',
      '영동군',
      '옥천군',
      '음성군',
      '제천시',
      '증평군',
      '진천군',
      '청주시',
      '충주시',
    ],
  },
  {
    key: '충남',
    label: '충청남도',
    subs: [
      '계룡시',
      '공주시',
      '금산군',
      '논산시',
      '당진시',
      '보령시',
      '부여군',
      '서산시',
      '서천군',
      '아산시',
      '예산군',
      '천안시',
      '청양군',
      '태안군',
      '홍성군',
    ],
  },
  {
    key: '전북',
    label: '전북특별자치도',
    subs: [
      '고창군',
      '군산시',
      '김제시',
      '남원시',
      '무주군',
      '부안군',
      '순창군',
      '완주군',
      '익산시',
      '임실군',
      '장수군',
      '전주시',
      '정읍시',
      '진안군',
    ],
  },
  {
    key: '전남',
    label: '전라남도',
    subs: [
      '강진군',
      '고흥군',
      '곡성군',
      '광양시',
      '구례군',
      '나주시',
      '담양군',
      '목포시',
      '무안군',
      '보성군',
      '순천시',
      '신안군',
      '여수시',
      '영광군',
      '영암군',
      '완도군',
      '장성군',
      '장흥군',
      '진도군',
      '함평군',
      '해남군',
      '화순군',
    ],
  },
  {
    key: '경북',
    label: '경상북도',
    subs: [
      '경산시',
      '경주시',
      '고령군',
      '구미시',
      '김천시',
      '문경시',
      '봉화군',
      '상주시',
      '성주군',
      '안동시',
      '영덕군',
      '영양군',
      '영주시',
      '영천시',
      '예천군',
      '울릉군',
      '울진군',
      '의성군',
      '청도군',
      '청송군',
      '칠곡군',
      '포항시',
    ],
  },
  {
    key: '경남',
    label: '경상남도',
    subs: [
      '거제시',
      '거창군',
      '고성군',
      '김해시',
      '남해군',
      '밀양시',
      '사천시',
      '산청군',
      '양산시',
      '의령군',
      '진주시',
      '창녕군',
      '창원시',
      '통영시',
      '하동군',
      '함안군',
      '함양군',
      '합천군',
    ],
  },
  {
    key: '제주',
    label: '제주특별자치도',
    subs: ['서귀포시', '제주시'],
  },
  {
    key: '해외',
    label: '해외',
    subs: [],
  },
] as const;

/**
 * DB CHECK 제약(`region_top IN (...)`)에 들어간 키 목록.
 * 클라이언트·서버 검증에서 동일 소스를 본다.
 */
export const REGION_TOP_KEYS: readonly string[] = REGIONS.map((r) => r.key);

const REGION_BY_KEY: ReadonlyMap<string, RegionSubdivision> = new Map(
  REGIONS.map((r) => [r.key, r] as const)
);

export function getRegionByKey(key: string): RegionSubdivision | undefined {
  return REGION_BY_KEY.get(key);
}

export function getSubregions(key: string): readonly string[] {
  return REGION_BY_KEY.get(key)?.subs ?? [];
}

/**
 * 폼 제출 시 (region_top, region_sub) 페어 검증.
 * - region_top은 17개 시·도 + '해외' 중 하나.
 * - 시·군·구가 있는 시·도라면 region_sub가 필수이고 목록에 포함되어야 한다.
 * - 시·군·구가 없는 시·도(세종, 해외)는 region_sub가 null/빈 문자열이어야 한다.
 */
export function isValidRegionPair(top: string, sub: string | null | undefined): boolean {
  const region = REGION_BY_KEY.get(top);
  if (!region) return false;

  const normalizedSub = sub == null ? '' : sub.trim();

  if (region.subs.length === 0) {
    return normalizedSub === '';
  }

  return normalizedSub !== '' && region.subs.includes(normalizedSub);
}
