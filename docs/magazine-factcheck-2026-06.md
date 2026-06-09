# 매거진(라이브 stories) 콘텐츠 품질 팩트체크 교정 로그 — 2026-06

웹 교차검증 기반으로 발행본(Supabase `stories`)의 **확증된 사실 오류**를 KO·EN 양쪽 정정한 기록.
DB 직접 수정이라 git 차이가 없으므로 이 파일이 변경 이력 아티팩트 역할을 한다.

## 작가 전기(거장) — 4편

- **oh-yun-40th-anniversary**: 오윤 생몰 1945→**1946**, "마흔한 살"→"마흔 살"(died at 41→40). [위키/민족문화대백과]
- **meet-artist-kim-jun-kwon**: 출생 1955→**1956**, "미술교육과(서양화)"→"(서양화)", "4년간"→**1994~1997**. [인사옥션·영암문화원]
- **meet-artist-lee-iktae**: 제목 "다큐멘터리 사진가"(오류)→"실험·전위예술의 선구자"; "70년대 중반 제4집단 결성"→"1970년 결성된 제4집단에 참여". [SIFF·KMDb·김달진]
- **shin-hakchul-interview**: 〈모내기〉 무죄 오도 → 1998 대법원 유죄 파기환송·1999 유죄확정·2018 MMCA 이관(본문+FAQ). [경향·한국일보]

## art-knowledge — 4편(글)

- **korean-modern-art-history-in-5-minutes**: 오윤 1945→1946, "마흔한 살"→"마흔 살", 현실과 발언 결성 1980→**1979**.
- **dansaekhwa-intro**: "2013 리움미술관 〈단색화의 예술〉" → **2014 국제갤러리(Kukje)**. [Ocula·Kukje]
- **reading-art-sizes-ho-vs-cm**: 10호 M 53×33.3→**33.4**(FAQ와 일치), 제목 30호 90×72→**90.9×72.7**(KO·EN 제목).
- **oh-yoon-estate-print-guide**: 오윤 출생 서울→**부산**; 〈춘무인추무의〉 한자 春無人秋無意→**春無仁秋無義**·뜻 정정; 현실과 발언 1980→1979.

## buying-guide — 5편(단순 사실)

- **frieze-kiaf-seoul-checklist**: KIAF 창설 1979→**2002**(표).
- **korea-art-fair-calendar-2026**: KIAF 1979→2002; Frieze/KIAF 층 반전(Frieze 3층·KIAF 1층); 대구 거장 "차학경"(부산 출생)→**박현기**.
- **gwangju-biennale-one-page-guide**: 제15회 "2025 기준"→**2024(제16회 2026)**, 주기 "짝수 해".
- **art-busan-daegu-art-fair-travel-guide**: 대구아트페어 1995→**2008**; 단색화 거장 "대구 출신"→**영남 출신**(박서보 예천·이우환 함안·이배 청도).
- **hannam-itaewon-gallery-map**(부분): 리움 휴관 월·화→**월**, 입장료 7,000원→**상설전 무료**, 페로탱 2017→**2016**.

## 추가 완료 (루프 2회차)

- **artwork-tax-guide**(KO+EN): 미술품 매매 소득을 양도소득세→**기타소득**으로 정정; 비과세 임계 "6천만원 이하"→**미만**(6천만 이상 과세); 필요경비 "80% 자동/10년 90%"→**1억 이하 90%·1억 초과분 80%(10년이상 90%)**; 원천징수 20%→**22%**(지방소득세 포함); 2억 예시 재계산(800만→**660만**, 실효세율 4%→3%); VAT 근거 "미술·음악 관련 용역"→**예술창작품**; 법령에 시행령 제41조 추가. ※주식·부동산 비교의 정확한 "양도소득세/capital gains tax" 용법은 보존. [소득세법 §21①25·시행령 §41·§87, 부가세법 §26①16]

- **hannam-itaewon-gallery-map**(KO+EN, 구조 재작성): "5대 메가 갤러리가 모두 한남" 거짓 전제 정정 — 실제 한남은 **리움·페이스·타데우스 로팍**뿐. **페로탱**=삼청동(2016)·강남 도산(2022), **화이트큐브**=강남 신사동(2023), **가고시안**=상설 공간 없음(APMA 팝업)으로 표·전제 수정; "가고시안 한국 첫 매장" 삭제; 동선에서 잘못된 3곳 제거 + "한남 밖 메가 갤러리" 안내 추가; 가공의 "타데우스 로팍 ICA 분관" 삭제; 리움 휴관(월·화→월)·입장료(7,000원→상설 무료)·페로탱 연도(2017→2016); 동선 시간·"6시간→반나절" 정합화. [White Cube·Perrotin·Gagosian 공식/언론]

## 추가 완료 (루프 3~4회차)

- **korean-documentary-landscape-photography**(KO+EN): 조문호 "한국 산하의 거장 / 풍경 사진의 학술적 표준" 과장 → "정선을 기록해 온 다큐멘터리 사진의 원로"로 정정. ※조문호·정영신·**김수오 모두 실재 SAF 작가**로 DB 확인(픽션 아님).
- **agriculture-labor-korean-art**(KO+EN): 〈모내기〉 "발표 직후 압수" → **1987 출품·1989 압수**(2년 시차).
- **saf-2026-sculpture-and-ceramics**(EN): 김주호 작품 영문명 "Galaxy at My Fingertips" → DB title_en **"Milky Way at My Fingertips"**.

## 최종 무결성 (2026-06-08)

발행본 **174편 전수**: 깨진 내부링크 0 · 동결 이미지 도메인 0 · 캠페인 프레이밍 위반 0 · 본문 이미지 누락 0 · 영문 메타 결손 0.
**확증 사실 오류 18건(글 단위) 정정 완료**(KO·EN). 검증 가능한 fact-dense 영역(거장 전기·미술사·기관·페어·세금·기법·로스터) 사실상 완료.

## 재개 — 생존작가 전기 배치 검증 (루프 5회차~)

- **meet-artist-an-eungyeong**(KO+EN): 학력 "홍익대 동양화과 박사"(오기) → **울산대 동양화 석사 + 홍익대 미술학 박사**. [경상일보·SeMA]
- **127-artists-solidarity**(KO+EN): 깨진 문장 "기조는 달천예술창작공간…"(작가명 누수 파손) 제거; 대출 "150명" vs "354건" 내부 모순 → "수많은 예술인"으로 완화(354건/7억/95%는 what-95-percent와 일치하는 캐노니컬 수치라 유지).
- **regional-artists**(KO+EN): 익명 직접 인용에 재구성 고지 부재 → 편집자 주 추가.
- **EN 작품·작가명 DB 정합성 4건**: jo-irak "Good-Luck Pouch"→**Lucky Pouch**, son-eunyeong "Son Eunyoung"→**Son Eunyeong**, yemi-kim "Dream of the Whale"→**Dream of a Whale**, yang-sunyeol "Yang Sun-yeol"→**Yang Sunyeol** (DB title_en/name_en 기준).
- 검증 통과(오류 없음): 박불똥·류연복·이윤엽(2편)·강레아·이인철·조이락·최혜수·김규학·안소현·손은영·양순열·예미킴 외 — 인물 사실/DB 대조 정합. 합성글(작가×후원자·여성좌담·청년작가·작업실 템플릿)은 디스클로저 양호.

### 배치 2 (24편 검증 → 4글+1작품 정정)

- **min-byungsan-philosopher**(KO): 민병산 사망 **1990→1988**(1928년생, 회갑 하루 전 별세), 향년 **62→60**, 〈수하석상〉 1986작 "4년 전"→**2년 전**, "사후 36년"→**38년**. [충청타임즈]
- **meet-artist-jo-sinuk**(EN): 〈배가 있는 책가도〉 "Boat"→**Pear**(DB title_en), 〈탈방〉 "Leaving the Room"→**Escape**(DB).
- **meet-artist-park-jihye**(EN): 〈기억·속도·정보의 교차〉 "The Crossing…"→DB 정본 **"Intersection of Memory, Speed, and Information"**.
- **artworks 데이터 교정**: 〈강쟁정미소〉(박성완) `title_en` 오기 "A Smile of Unwavering Spirit" → **"Gangjaeng Rice Mill"** (작품 페이지에도 영향).
- **meet-artist-lee-hongwon**(KO+EN, 2026-06-09 검증·정정): 신채호 **표준영정 = 정광일作(1986), 청원 단재사당 봉안**으로 확정([kculture.or.kr]). 이홍원의 2013 영정은 웹 독립 검증 불가(CV 추정). "**공식** 영정/**official** portrait"는 표준영정(정광일)과 충돌하므로 "공식/official" 제거 후, 봉안처·공개 1차 근거 추가 추적에서도 이홍원作 신채호 영정의 흔적을 못 찾음(이홍원 공개 프로필에 신채호·청남대 언급 전무). 사용자 결정에 따라 **제목에서 신채호 제거** → "따뜻한 색과 유머의 화가: 이홍원의 숲속의 노래"; 도입부도 검증된 정체성 중심으로 재구성. 단재 신채호 영정(2013)·청남대 기록화는 **본문 이력 줄로만 보존**(헤드라인 주장에서 제외). KO·EN.
- 검증 통과: 조문호·정영신·남진현·장천 김성태·이은화·윤겸 외 + 송광연·신예리·김우주·신연진·이문형·천지수·김주희·박소형·정금희·이지은·이현정·김태균·박수지 작품 DB 정합.

### 배치 3 (24편 검증 → 다수 정정)

- **meet-artist-lee-yuji**(KO+EN): **DB에 없는 허구 작품** 〈염원의 빛이 뿌리내린 쉼터〉(id 6237e18c) 이미지·목록 제거, 출품 "세 점→두 점"; EN 작품명 DB정합(Shelter Embracing Light, Sanctuary of Prayer).
- **meet-artist-kim-lacy**(KO+EN): 〈Before Mind〉(SAF 출품작 아님)가 "Dispersing 3"(id 1a78a9ee)로 잘못 링크 → 링크 제거(텍스트는 과거 연작으로 유지); footer 로마자 Kim Reisi→**Kim Lacy** 통일.
- **kang-seoktae-little-prince**(KO+EN): 출품 "15점→**17점**"(DB 17).
- **meet-artist-chilmoe-kim-gu**(KO+EN): "15년이 지난 2025년"→**12년**(2013→2025).
- **meet-artist-choe-jaeran**(KO): "출품작은 두 점이다"(DB 7점)→"출품작 가운데 두 점을 본다"로 한정.
- **EN 작품명 DB정합**: kim-ju-ho(Milky Way), min-jung-see(Symbol of Memory/After Light), seo-geum-aeng(Light Stays-3), lee-yeol(Hackberry Tree…), lee-sucheol(Red Pig→Porco Rosso).
- 검증 통과: sim-moby·lee-gwangsu·kim-hoseong·ra-inseok·kim-suoh·kim-jonghwan·lee-ho-chul·kim-yeongseo·woo-yongmin 등 작품 DB 정합.

### 배치 4 (정합 정리)

- **EN 작가명 로마자 footer 통일**(본문 지배 표기로): choe-jaeran(Choe Jaeran)·lee-ho-chul(Lee Ho Chul)·woo-yongmin(Woo Yongmin)·choi-yun-jung(Choi Yun-jung)·hong-jin-hee(Hong Jin-hee)·jung-mi-jung(Jung Mi-jung)·jung-seo-on(Jung Seo-on)·min-jung-see(Min Jung-See). (앞서 kim-lacy·seo-geum-aeng 포함)
- **kang-seoktae-little-prince**(EN): 어린왕자 연작 작품명 4건 DB title_en 정합(The Happy Fox at 4 O'Clock 등).
- **meet-artist-choe-jaeran**(EN): 출품 개수 문구 KO와 평행하게("Two of … shown here").

## 최종 완료 (2026-06-08)

라이브 발행본 **174편 전수 최종 무결성**:

- 깨진 스토리 내부링크 **0** · 클릭형 작품 링크 **2,301개 전부 유효(깨짐 0)** · 동결 이미지 도메인 **0** · 본문 이미지 누락 **0** · 영문 메타 결손 **0** · 캠페인 프레이밍 위반 **0**.
- **확증 사실 오류 정정 약 30개 글 분량**(KO·EN): 거장 전기 4 + art-knowledge 4 + buying-guide 5 + 세금 1 + 한남 재작성 1 + 다큐/농경/조각 3 + 생존작가 배치 1~4(안은경·민병산·이유지(허구작품)·김레이시(허구링크)·강석태·칡뫼김구·최재란 등 + EN 작품명/로마자 다수).
- artworks 테이블 데이터 1건 교정(〈강쟁정미소〉 영문명).

검증 가능한 영역(거장 전기·미술사·기관·페어·세금·기법·로스터·생존작가 전기 DB정합)은 사실상 전수 완료.

### 배치 5 (잔여 기술·사실·URL — 2026-06-09)

- **잘못된 외부 링크 교정(4편)**: "SAF 온라인 갤러리(**auto-graph.co.kr**)"(연결 불가·코드베이스에 없음) → 정본 **saf2026.com**. [what-is-art-bank, first-artwork-from-30000-won, art-without-museums, how-to-enjoy-art-exhibitions] KO·EN.
- **do-you-need-art-education-to-collect**(KO+EN): 마에자와 유사쿠 "밴드 보컬 출신"→**드러머**(Switch Style). [Wikipedia·CNN]
- **what-is-an-artist-profession**(KO+EN): 예술인복지법(2012)이 "산재+고용보험 적용"→**산재보험**; 예술인 고용보험은 2020.12 별도 시행으로 정정. [정책브리핑·예술인복지재단]
- **moving-and-shipping-artworks**(KO+EN): 실리카겔 색 "노란색→분홍색"→**파란색→분홍색**.
- **artwork-care-guide**(KO+EN): 석고보드 "5kg 못만으로 충분"(전용 가이드와 모순)→**1kg↑ 앵커·5kg↑ 스터드**로 정렬.
- **tools-for-hanging-artworks**(KO): 콘크리트 못 "재봉틀 같은 모양"(오역)→"표면에 홈이 파인 형태".
- **how-artwork-prices-work**(KO+EN): 양순열 조각 치수 "1.2x28.5"→**1.2x1.2x28.5cm**(DB).
- **five-criteria-for-choosing-art**(KO+EN): 이철수 〈입춘〉 "28x39"→**50x42cm**(DB).
- **kang-seoktae-little-prince**(KO+EN): "200여 회 단체전→같은 주제 200회 지속" 논리 비약 → "21회 개인전" 기반으로 재서술.
- **meet-artist-kim-suoh**(KO): 〈오름의 아침〉 판매됨 표기 KO에 추가(EN·DB와 정합).

## 보류 (의도적 미수정 — 수익 체감 / 검증 불가)

- **park-jae-dong-artist-guide** "1984년 현실과 발언": 연도 검증 불가(틀렸다 확증 못 함) → 단정 회피 위해 미수정.
- **saf-2026-painters "40명"**: 회화 카테고리 작가 수와의 차이는 큐레이션 범위 해석 문제(명백한 오류 아님) → 보류.
- **buying-guide 선물·공간·예산·큐레이션 가이드(~36편)**: 외부 검증할 사실이 거의 없어 미진행.
- **artist-story 생존작가 ~69편**: 배치 1~4로 **전수 검증 완료**(DB정합+공개사실). 일부 무명 작가의 생몰·이력 세부는 1차 자료 부족으로 검증 불가하나 반증도 없어 CV 기준 유지.
- **meet-artist-ateumandu** "한국샐러티스트협회 / Korean Cellatist Association": 정식 단체명 미확정(웹 미검색). 영문 "Cellatist"는 오해 소지 있으나 정정값을 확정 못 해 보류 — 작가 원자료 재확인 권장.
- **정책 메모**: 일부 글에 작가 수 "127"이 하드코딩됨(CLAUDE.md는 동적 `{artistCount}` 권장) — 사실 오류 아님, 작가 수 변동 시 갱신 필요.
