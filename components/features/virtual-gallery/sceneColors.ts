/**
 * 3D 가상 갤러리 씬 전용 재질 색상 토큰.
 *
 * BRAND_COLORS(lib/colors.ts)는 UI chrome 토큰(갤러리 white cube 정체성)이고
 * 이 파일은 R3F 씬의 물리적 재질(우드/패브릭/식물/메탈/라이팅)을 정의한다.
 * 두 파일의 관심사가 다르므로 병합하지 않는다.
 */
export const SCENE_COLORS = {
  wood: {
    espresso: '#3a3028', // 가장 어두운 프레임/다리 (소파, 액센트 체어)
    frameDark: '#2a2018', // ArtworkPlane 프레임 (가장 어두운 목재 액자)
    frameBrass: '#8b7d5e', // ArtworkPlane inner lip (황동/골드 프레임)
    walnut: '#5a4a3a', // mid-dark — 다이닝/카페 테이블 다리, 의자 다리
    walnutAlt: '#5c4a3a', // walnut 근사치 — TV 콘솔, 사이드테이블, 헤드보드
    walnutDeep: '#4a3a2c', // 커피 테이블 다리 (가장 짙은 다크)
    walnutMid: '#6b5a4a', // 서랍 도어면, 선반
    oakDark: '#6b5a48', // 침대 프레임 베이스, 협탁, 서랍장
    oakWarm: '#7a6a58', // 책상 패널, 서랍장 앞면
    oakLight: '#8a7a68', // 책상 상판, 밝은 오크
    pecan: '#9a8068', // 카운터 상판, 벽 선반
    maple: '#b8a080', // 원형 카페 테이블 상판
    blondeOak: '#b09878', // 카운터 앞면
    sandalwood: '#7a5c4a', // 다이닝 의자 좌석
    chestnut: '#8b7060', // 장식 박스 (따뜻한 톤)
    cocoa: '#6a5040', // 장식 박스 (어두운 톤)
    honeyOak: '#a08868', // 카페 의자 좌석·등받이
    shelfWood: '#7a6050', // 선반 나무
    terracottaPot: '#6b5344', // 화분
    bookOlive: '#9a8a5a', // 올리브 책 등
    oakBrown: '#9a7a5a', // 우드 텍스처 기본 색 (proceduralTextures default)
    oakMid: '#7a5a3a', // 우드 결 색 (proceduralTextures grain default)
  },
  fabric: {
    cream: '#f5f0e0', // 테이블 램프 갓 (기본)
    linen: '#f0ebe0', // 플로어 램프 갓
    linenWarm: '#f0ece6', // 갤러리 받침대 (페데스탈)
    rugTaupe: '#c8b8a0', // 러그 타이프, 장식 오브제, 창틀
    rugBrown: '#8b7355', // 리빙룸 러그
    sofaSeat: '#6b6054', // 소파 좌석
    sofaArm: '#5e5549', // 소파 등받이·팔걸이
    cushionWarm: '#b8a088', // 쿠션 (웜 베이지)
    cushionTan: '#c4a882', // 쿠션 (탄 톤)
    cushionSage: '#9aaa90', // 쿠션 (세이지 그린)
    mattress: '#f0ece4', // 매트리스
    pillow: '#e8e4dc', // 베개
    duvet: '#c8bfb0', // 이불
    blanket: '#a89880', // 접힌 담요
    rugSoft: '#b0a090', // 침실 러그, 독서 의자 패브릭
    chairBack: '#a09080', // 독서 의자 등받이
    windowFrame: '#e0d8cc', // 창틀 프레임
    artMat: '#f5f3ee', // ArtworkPlane 매트 (mount 배경, 오프화이트)
    porcelain: '#f5f0e8', // 도자기 컵·소서
    jarCream: '#e8dcc8', // 항아리 크림 색
    ceramic: '#e0d4c0', // 작은 도자기 화병
    canvasMutedTan: '#e8e0d0', // WallFrame 캔버스 (탄)
    canvasMutedGray: '#d0d8d4', // WallFrame 캔버스 (그레이)
    canvasMutedBeige: '#d8d0c4', // WallFrame 캔버스 (베이지)
    canvasMutedGreen: '#c8d0c8', // WallFrame 캔버스 (세이지 그레이)
    canvasMutedWarm: '#d0c4b0', // WallFrame 캔버스 (웜 탄)
    canvasMutedSage: '#b8c8b8', // WallFrame 캔버스 (세이지)
  },
  plant: {
    foliage: '#3a6b35', // 식물 캐노피 메인
    foliageHighlight: '#4a7d43', // 식물 캐노피 하이라이트
    plantDining: '#4a8044', // 다이닝 룸 화분
    bookSage: '#5a7a5a', // 책 등 (세이지)
    shelfMuted: '#5a6a5a', // 선반 오브제 (뮤트 그린)
    plantSmall: '#4a7a44', // 서랍장 위 소형 화분
    chalkboardDark: '#2a3a2a', // 칠판 배경
  },
  metal: {
    matteBlack: '#2a2a2a', // 플로어 램프 베이스, 트랙 조명 레일, 갤러리 벤치 시트
    tvScreen: '#0a0a0a', // TV 스크린 블랙
    pendantGray: '#707070', // 갤러리 벤치 금속 프레임·다리
    sculptureSphere: '#404040', // 조각품 구체 (대)
    sculptureSmall: '#505050', // 조각품 구체 (소)
    vaseDark: '#3a3a3a', // 어두운 금속 화병
    pendantCord: '#555555', // 펜던트 코드·갓
    chrome: '#c0c0c0', // 에스프레소 머신
    lampBrass: '#8b7d6b', // 테이블 램프 베이스 (황동)
    doorDark: '#333333', // VirtualRoom 도어
  },
  light: {
    warmBulb: '#fff3e0', // 테이블·플로어 램프 포인트 라이트
    warmBulbSoft: '#ffecd0', // 침실 테이블 램프 갓 (더 부드러운 웜)
    moodAmber: '#ffcc80', // 침실 무드 포인트 라이트
    pendantWarm: '#fff0cc', // 카페 펜던트 라이트
    artworkAccent: '#fff8e8', // 창문 포인트 라이트 (데이라이트 느낌)
    artworkSpot: '#fff6e8', // ArtworkPlane 스팟 조명 (PR-B에서 사용)
    windowSky: '#c8d8e8', // 침실 창문 유리 (하늘 색)
    windowSkyBright: '#d8e8f0', // 카페 창문 유리 (밝은 하늘)
    fillCool: '#d4e5ff', // 룸 프리셋 fill light (cool) — PR-B에서 사용
  },
  accent: {
    bookBurgundy: '#8b4040', // 책 등 (버건디)
    bookNavy: '#3a5a7a', // 책 등 (네이비)
    bookPurple: '#6a5a8a', // 책 등 (퍼플)
    vaseTan: '#c49a6a', // 화병 (탄)
    decorTeal: '#4a6a7a', // 장식 오브제 (틸)
    canvasMuted: '#a0b0a8', // WallFrame 캔버스 (뮤트 틸)
    artworkCanvas: '#c0a880', // 작품 캔버스 웜 오크
    bookBrownRed: '#8b6050', // 책 등 (브라운 레드)
    bookBlueGray: '#506880', // 책 등 (블루 그레이)
    shelfJarTan: '#c0a888', // 카페 선반 항아리 (탄)
    shelfJarCream: '#e0cca0', // 카페 선반 항아리 (크림)
    shelfJarBrown: '#c0a070', // 카페 선반 항아리 (브라운)
  },
  // roomPresets.ts 룸별 환경 색상 — 벽/바닥/조명 등 씬 분위기 토큰
  preset: {
    living: {
      wall: '#e8e0d4', // 웜 베이지 벽
      backWall: '#ede6dc', // 뒤쪽 벽 (약간 더 밝은 베이지)
      floor: '#b8956a', // 오크 바닥
      ceiling: '#f5f0eb', // 밝은 천장
      baseboard: '#f0ebe5', // 걸레받이
      ambient: '#fff5e6', // 앰비언트 라이트 (따뜻한 웜 화이트)
      spot: '#fff2dc', // 스폿 라이트
      fill: '#d4e5ff', // 필 라이트 (쿨 하늘빛)
    },
    bedroom: {
      wall: '#ddd8d0', // 쿨 베이지 벽
      backWall: '#e2ddd6',
      floor: '#b89868', // 따뜻한 오크 바닥
      ceiling: '#e8e4de',
      baseboard: '#d0c8c0',
      fog: '#1a1610', // 따뜻한 짙은 안개 (어두운 분위기)
      ambient: '#ffd8a0', // 앰버 앰비언트
      spot: '#ffcfa0', // 앰버 스폿
      fill: '#ffd0a0', // 앰버 필
    },
    gallery: {
      wall: '#f6f6f6', // 갤러리 벽 (near-white, BRAND_COLORS.canvas보다 약간 다름)
      floor: '#d8d8d8', // 폴리싱 콘크리트 바닥
      baseboard: '#eeeeee', // 갤러리 걸레받이
    },
    cafe: {
      wall: '#bfb09a', // 따뜻한 크림 벽
      backWall: '#c8b8a0', // 뒤쪽 벽 (fabric.rugTaupe와 동일값)
      floor: '#8a6a4a', // 어두운 오크 바닥
      ceiling: '#d8d0c0', // 따뜻한 천장
      baseboard: '#5a4a38', // 어두운 우드 걸레받이 (walnut과 근사)
      ambient: '#ffe8b0', // 따뜻한 캔들 앰비언트
      spot: '#ffdfa0', // 캔들 스폿
      fill: '#ffd898', // 캔들 필
    },
  },
} as const;
