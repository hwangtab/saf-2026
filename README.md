# 🌱 씨앗:페 2026 공식 웹사이트

[SAF(Seed Art Festival) 2026](https://saf2026.vercel.app)의 공식 웹사이트입니다.

한국 예술인들의 금융 위기를 해결하기 위한 상호부조 캠페인의 모든 정보를 담고 있습니다.

## 🚀 프로젝트 개요

- **기술 스택**: Next.js 14+, TypeScript, Tailwind CSS, React
- **호스팅**: Vercel
- **배포 방식**: SSG (Static Site Generation)
- **대상 기간**: 2025년 11월 15일 ~ 12월 30일

## 📋 페이지 구성

| 페이지 | 경로 | 설명 |
|--------|------|------|
| 홈 | `/` | 캠페인 개요, 동적 통계 카운터 |
| 우리의 현실 | `/our-reality` | 6개 통계 그래프로 보는 현황 |
| 우리의 증명 | `/our-proof` | 95% 상환율 등 신뢰도 증명 |
| 참여 예술가 | `/artists` | 참여 뮤지션, 화가 목록 |
| 아카이브 | `/archive` | 2023년 행사 기록, 언론 보도 |
| 전시 안내 | `/exhibition` | 일시, 장소, 오시는 길 |

## 🛠️ 설치 및 실행

### 필수 사항
- Node.js 18+
- npm 또는 yarn

### 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 타입 체크
npm run type-check

# 코드 포맷팅
npm run format

# 린팅
npm run lint
```

### 프로덕션 빌드

```bash
# 빌드
npm run build

# 프리뷰
npm run start
```

## 📝 환경 설정

`.env.local.example`을 참고하여 `.env.local` 파일을 생성하세요:

```bash
# Kakao 지도(JavaScript 키)
NEXT_PUBLIC_KAKAO_MAP_KEY=your_kakao_map_key_here

# Kakao 공유(JavaScript 키)
NEXT_PUBLIC_KAKAO_JS_KEY=your_kakao_js_key_here

# Google Analytics (선택사항)
NEXT_PUBLIC_GA_ID=your_google_analytics_id
```

## 📂 디렉토리 구조

```
saf/
├── app/                    # Next.js App Router 페이지
│   ├── layout.tsx         # 루트 레이아웃 (Header, Footer)
│   ├── page.tsx           # 홈페이지
│   ├── our-reality/       # 우리의 현실 페이지
│   ├── our-proof/         # 우리의 증명 페이지
│   ├── artists/           # 참여 예술가 페이지
│   ├── archive/           # 아카이브 페이지
│   └── exhibition/        # 전시 안내 페이지
├── components/
│   ├── common/            # 레이아웃 컴포넌트 (Header, Footer)
│   ├── features/          # 기능 컴포넌트 (차트, 애니메이션, 공유)
│   └── ui/                # 재사용 UI 컴포넌트
├── content/               # 데이터 파일
│   ├── artists.ts         # 참여 예술가 목록
│   └── news.ts            # 언론 보도 목록
├── lib/
│   ├── constants.ts       # 상수 (링크, 연락처 등)
│   ├── types.ts           # TypeScript 타입 정의
│   └── global.d.ts        # 전역 타입 선언
├── public/                # 정적 자산 (이미지, 폰트)
├── styles/
│   └── globals.css        # 전역 스타일
└── docs/                  # 프로젝트 문서 (PRD, FRD, TRD, MRD)
```

## 🎨 디자인 시스템

### 색상
- **주 색상**: `#F4D03F` (따뜻한 노란색 - 희망과 연대)
- **배경**: 다크/화이트 톤
- **강조 색상**: 빨강, 주황

### 폰트
- **기본 폰트**: Pretendard, SUIT
- **폰트 크기**: 반응형 (모바일 first)

### 레이아웃
- **Breakpoints**: sm(640px), md(768px), lg(1024px), xl(1280px)
- **그리드**: Tailwind CSS의 기본 그리드 시스템
- **간격**: Consistent spacing 사용

## 📊 핵심 기능

### 1. 동적 통계 카운터 (Home)
- `react-countup` + `react-intersection-observer` 조합
- 뷰포트 진입 시 0부터 목표값까지 애니메이션

### 2. 인터랙티브 차트 (우리의 현실)
- **라이브러리**: Recharts
- **차트 종류**: Pie Chart(도넛), Bar Chart(가로/세로)
- **인터랙션**: 마우스 호버 시 툴팁 표시
- **반응형**: 모바일에서 스크롤 가능

### 3. 동적 콘텐츠 렌더링
- `/content` 폴더의 TypeScript 파일에서 데이터 로드
- 비개발자도 쉽게 업데이트 가능
- `.map()` 함수로 UI 컴포넌트 생성

### 4. SNS 공유
- **라이브러리**: react-share
- **지원 플랫폼**: Facebook, Twitter/X, KakaoTalk, 링크 복사
- **메타데이터**: 각 페이지의 Open Graph 태그 활용

### 5. Mobile 최적화
- **헤더**: 데스크톱은 가로 메뉴, 모바일은 햄버거 메뉴
- **레이아웃**: 1단 또는 2단 그리드로 자동 전환
- **터치**: 모바일 터치에 적합한 버튼 크기

## 🚀 배포

### Vercel 배포
```bash
# GitHub에 push하면 자동 배포
git push origin main

# Vercel Dashboard에서 배포 상태 확인 가능
# PR 생성 시 Preview URL 자동 생성
```

### 도메인 설정
1. Vercel에서 도메인 구매 또는 외부 도메인 연결
2. DNS 설정 (외부 도메인 사용 시)
3. SSL 인증서 자동 적용

## 📈 모니터링

### 성능 지표 (NFR-01)
- Google PageSpeed Insights: 모바일 80점 이상
- LCP (Largest Contentful Paint): 2.5초 미만
- 이미지 포맷: WebP 자동 변환

### SEO (NFR-02)
- 각 페이지 고유 메타태그
- Open Graph 태그 구현
- 시맨틱 HTML

### 접근성 (NFR-03)
- 모든 이미지 alt 텍스트
- 키보드 네비게이션
- Lighthouse Accessibility 85점 이상

## 🔧 유지보수

### 콘텐츠 업데이트
1. **작가 목록 추가**: `content/artists.ts` 수정
2. **뉴스 추가**: `content/news.ts` 수정
3. **외부 링크 변경**: `lib/constants.ts` 수정

### 스타일 수정
- Tailwind CSS를 사용한 인라인 스타일
- `styles/globals.css`에 전역 스타일

### 컴포넌트 추가
- `components/ui/`에 재사용 가능한 컴포넌트 생성
- `components/features/`에 페이지별 기능 컴포넌트 생성

## 📞 문의

- **이메일**: contact@kosmart.co.kr
- **전화**: 02-764-3114
- **담당자**: 황경하 조직국장
- **주소**: 서울시 종로구 효자로31

## 📄 라이선스

이 프로젝트는 한국스마트협동조합 소유입니다.

## 🙏 기여

씨앗:페 2026의 성공을 위해 다양한 방식으로 참여할 수 있습니다:

- 💰 [후원하기](https://www.socialfunch.org/SAF)
- 🎨 [작품 구매](https://auto-graph.co.kr)
- 📣 SNS에서 공유하기
- 🏛️ [전시 방문하기](https://saf2026.vercel.app/exhibition)

---

**함께하면 더 강합니다. 씨앗:페 2026을 응원해주세요!** 🌱❤️
