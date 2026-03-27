-- Backfill artist bio/history from static files (artists-data.ts + batch-005.ts)
-- Safety: only updates where column is NULL or empty
-- Does NOT overwrite data edited by artists via dashboard
BEGIN;

------------------------------------------------------------
-- 1. bio from artists-data.ts (profile -> bio)
------------------------------------------------------------
UPDATE artists SET bio = '강석태는 생텍쥐페리의 소설 어린 왕자에서 영감을 받아 아이의 순수한 마음을 담은 어린 왕자를 모티브로 작업을 해오고 있다. 작품 속 어린 왕자가 만나는 풍경과 재해석된 서사를 통해 감성과 위로를 전해주는 작품으로 21회의 개인전과 200여 회의 단체전에 참가하였으며, 저서로는 <어린 왕자에게 말을 걸다>, <나무에 문화꽃이 피었습니다>가 있다. 제22회 중앙미술대전에서 특선, 한·독미술협회공모전에서 특별상을 수상하였고, 주요 작품 소장처로 국립현대미술관 미술은행, 주한프랑스문화원, 한국예술종합학교, 남해군청, 푸르메재단, 순천 기적의 도서관, 넥슨어린이재활병원, 창원 한마음병원 등이 있다.' WHERE name_ko = '강석태' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '달천예술창작공간 입주 작가로 활동하며, 갈등 이후 남겨지는 감정을 평면 회화 및 목각 채색 기법으로 표현하는 시각 예술가이다.' WHERE name_ko = '기조' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '김상구는 1945년 서울에서 태어나 홍대 서양화과와 동대학원을 졸업하였다. 그는 현대 산업사회의 기계화시대에 역행하는 듯한 목판화와 철저한 수공적 공정을 고수하고 있는 보기 드문 작가이다. 목각예술은 현란한 세련미 대신에 우직함과 단순함을 특징으로 하는 동양적 장인정신과 서민적 속성을 그 뿌리로 한다.
이런 점에서 그의 목판화 작업은 가장 인간적인 작업영역이며, 또한 우리 사회에 인간미를 더해주는 시정과 같은 것으로 이해되어 진다.
그의 목판화 세계는 "화려한 것보다는 투박한 것, 복잡한 것보다는 단순한 가운데 스며드는 토담과 같은 것, 입체적 표현보다는 평면적인 것, 흑백의 대비, 가득 차 있는 것보다는 여백의 미"로서 함축될 수 있다.
70년대 후반 이래 발표활동을 계속해 오고 있는 화가의 근작은 다색판화로 엮어지고 있다. 세심한 작업이 요구되는 다색판화를 통해 다양한 표현영역을 넓히면서 그는 여전히 꾸준하고 깊이 있는 작품을 추구해 가고 있는 것이다.' WHERE name_ko = '김상구' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '대학에서 판화를 전공하였으며 현재 판화공방 <판화방>을 운영 중이다. 현재 한국현대판화가협회, 홍익판화가협회 회원으로 활동하고 있으며, 그린 책으로는 《반쪽이》, 《도깨비 씨름 잔치》, 《홍길동》, 《한비자》, 《+-*/마술쇼》, 《한양에 담긴 조선의 꿈》, 《황금용과 무지개》 등이 있고, 월간지의 각종 삽화도 그렸다.' WHERE name_ko = '김종환' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '김주호는 서울대학교 미술대학 조소과와 동 대학원을 졸업하고, <사람사이>(관훈갤러리, 20120, <생생풍경>(가회동 60, 2012) 개인전 및 다수의 기획전에 참여해 왔으먀 국립현대미술관, 대전시립미술관, 소마미술관 등에 작품이 소장되어 있다. 그는 사람과 일상의 풍경을 작가 특유의 사색과 여유로 재해석하여 입체 혹은 평면작업들을 일관되게 이끌어 왔다. 일상으로부터 시작된 작가의 사색적 자세는 우리 주변으로부터 다양한 이야기를 이끌어내며 공감과 소통을 이끌어 낸다.
작품 <조오타!>는 세상을 보는 호기심을, <세상을 보는 창>의 돋보기 형상은 대상을 투시하고 관계를 명확하게 보고자 하는 시선을 의미한다. 이런 독특한 작가의 조형적 인물 묘사는 돌고 도는 사람으로 연결되어 우리 삶의 인간관계를 말하는 듯하다.' WHERE name_ko = '김주호' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '이미지 오버랩 작가 김주희 입니다 저는 잊지못할 추억, 기억의 순간들을 오버랩합니다. 반복적인 중첩과 전혀 다른 공간의 오버랩을 통해 기억을 되새기고 또는 합성합니다. "그리다" 라는 말은 "그리워하다"에서 파생되었듯이 그리운 것들을 사랑하고 보고싶은 것들을 보고 또 보고 사진으로 찍어 겹쳐 작업합니다 그림속 이미지는 계속 중첩하여  파괴되는 것이 아니라 더 선명하게 되살아납니다 이는 현대인들의 욕망 가지고 싶은 것들 사라져버리는 것에 대한 아쉬움 을 포함하고  있습니다' WHERE name_ko = '김주희' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '김준권은 1956년 전남 영암 출생으로 1982년 홍익대학교 서양화 졸업, 1994년부터 1997년까지 중국 魯迅미술대학 목판화 연구원으로 활동했으며, 1997년에 한국 목판문화 연구소를 개설해 계속해서 목판화 작업을 이어나가고 있다.
목판화 작업을 통해 민중미술운동에 참여한 작가이기도 하다. 작가는 1980년대 미술교육운동에 몰두하던 시기에 리놀륨 판화(Linoleum cut) 작업으로, 민중목판화의 양식적 특성을 보여준다. 대동세상을 꿈꾸는 농민운동 지도자인 전봉준(全琫準)을 소재로 전통회화 양식, 특히 불화 중 ‘수월관음도(水月觀音圖)’의 양식을 참고하여 제작하며 명확하고 정직한 구성으로 전통에 대한 관심을 보여주었다.
김준권의 수성 다색목판화는 한국 현대 산수화의 방향을 제시할 만큼 독보적 위치를 점유하고 있다고 판단된다. 조선후기 진경산수화의 겸재 정선이나 단원 김홍도를 계승한 조형미를 떠오르게 하여 반갑기 짝이 없다. 현실의식을 기반으로 하는 국토사랑, 부지런한 발품, 생거진천(生居鎭川)의 땅에서 받는 에너지, 다년간 축적된 판화기술과 예술적 완숙, 한 작품에 대여섯 판 이상 파고 찍는 강도 높은 노동을 감내하는 장인정신 등이 돋보인다.' WHERE name_ko = '김준권' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '작가소개
경희대학교 사학과를 졸업하고 중앙대학교 사진학과를 나와 현대미술가로 활동하고 있다. 초기에는 사진,영상을 기반으로 현대인의 욕망과 방황을 주제로 한 작업을 주로 선보였다. 2018-2019년 24시간 출입 가능한 무인 갤러리를 운영하며 매달 전시를 하는 <먼슬리 프로젝트>를 통해 다양한 개념미술을 발표했다. 이후 매체의 경계를 넘나드는 실험을 지속하며 인간과 예술, 사회에 관한 사유를 작품으로 풀어내고 있다.' WHERE name_ko = '김호성' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '라인석 작가는 순수 사진부터 사진을 매체로 한 시각예술인 ArtWork을 넘나들며 다양하고 크레이티브한 작업으로 호평을 받고 있다. 피사체의 촉감을 전달하기 위해 인화지를 긁어내 그 사이로 잉크가 스며들게 하기도 했다. 초능력을 갖게 해 달라고 기도하다가 구부러지고 휘어진 세계를 포착하는 능력을 갖게 되었다. 그 덕분에 라인석 작가는 직선도 곡선으로 본다. 이름하여 ''반듯한 곡선''. 카메라에 포착된 직선은 휘어진 세계이다.' WHERE name_ko = '라인석' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '류연복은 경기도 가평에서 출생하여 서울에서 학업을 하다가 1977년 홍익대 미대에 입학하면서 본격적으로 민중미술의 세계에 뛰어든 작가이다. ‘아름다움은 많은 이들이 누릴 수 있어야 한다.’는 소박한 믿음은 그가 대학을 졸업하던 1984년 서울 미술공동체를 결성하고 벽화팀 ‘십장생’에서 벽화운동을 이끄는 원동력이 되었다. 그는 1985년 미술장터 격인 ‘을축년 미술 대동잔치’를 열어 서민들도 단돈 5천원이면 미술작품을 살 수 있도록 하는 행사를 진행하기도 했으며, 1986년 경찰의 탄압으로 중단되었던 전시 《20대의 힘》에 관여했으며, 1989년에는 임수경의 방북에 앞서 미국으로 가서 북쪽에 보낼 걸개그림과 판화를 만들기도 하였다.
목판화는 비교적 제작이 용이하고 거의 무제한으로 복제가 가능하다는 매체적 특징을 갖고 있다. 이러한 특징은 민중들이 단순히 미술을 바라보는 것만이 아니라 직접 제작하는 것을 목표로 하며 기존 미술이 소수의 부유층에게만 향유되는 것에 반대했던 민중미술 작가들에게는 매우 중요한 이점이었다. 따라서 1980년대에는 민중운동의 여파에 따라 판화의 제작이 매우 보편화되었으며, 그 중에서도 특히 목판화는 전통과의 연결이라는 점에서 더욱 환영 받았다. 류연복은 목판화의 특성에 맞게 거친 칼 맛을 잘 살려내어 단순한 화면 구성에서 역동적인 인물과 배경의 적절한 조화를 표현하였다.' WHERE name_ko = '류연복' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '류준화는 1990년대부터 현재까지 한국 여성주의 미술의 최전선에서 활동하며, 가부장적 사회가 규정한 여성의 역할을 해체하고 그 속에 감춰진 억압의 굴레를 시각화해 온 작가입니다. 그의 예술 세계는 단순히 여성을 묘사하는 데 그치지 않고, 사회적 금기에 도전하거나 남성 중심적인 시각 시스템을 전복시키는 강력한 예술적 실천을 지향합니다.
초기 작업에서 그는 성폭력이나 성매매와 같은 사회적 폭력의 희생자가 된 여성들의 현실을 화폭에 담아내며 당시 사회에 무거운 경종을 울렸습니다. 특히 ''매춘(賣春)''이라는 단어에서 ''파는 행위''가 아닌 ''사는 행위''에 주목하여 성을 구매하는 남성의 책임을 강조하는 등, 언어와 이미지를 통해 지배적인 통념을 뒤집는 날카로운 통찰력을 보여주었습니다.
또한, 바비 인형과 같은 대중적 오브제나 사진, 설치 작업을 활용하여 현대 사회가 여성에게 강요하는 ''정숙한 아내''와 ''성적 대상''이라는 이중적인 잣대를 비판했습니다. 관습적으로 남성의 전유물이었던 ''관찰하는 시선''을 빼앗아 남성을 관찰의 대상으로 치환하거나, 기혼 여성의 개성을 지워버리는 ''집사람''이라는 호칭 뒤에 숨은 폭력성을 유령 같은 형상으로 그려내기도 했습니다.
그의 활동은 개인적인 창작에 머물지 않고 페미니스트 아티스트 그룹 ''입김''을 통해 공동체적인 목소리로 확장되었습니다. 종묘라는 가부장적 상징 공간을 여성의 생명력이 깃든 ''아방궁(아름답고 방자한 자궁)''으로 재해석하려 했던 시도는 한국 여성주의 미술사에서 가장 상징적이고 저항적인 사건으로 평가받습니다.
최근에는 신화 속 바리데기나 역사 속 여성 독립운동가들을 재조명하며, 가부장제 역사관에 의해 가려졌던 여성들의 서사를 복원하는 데 주력하고 있습니다. 이처럼 류준화의 작업은 과거의 상처를 고발하는 것에서 나아가, 잊힌 여성의 역사를 발굴하고 새로운 여성 주체성을 세워가는 역사적 재조명의 과정으로 나아가고 있습니다.' WHERE name_ko = '류준화' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '굵고 거친 필치와 생생한 색감으로 일상 풍경을 그려내는 박성완은 전남대학교 예술대학 미술학과를 졸업하고 동 대학원 미술학과(서양화 전공) 석사과정을 마쳤다.' WHERE name_ko = '박성완' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '박소형 작가는 서울, 보스턴 뉴욕에서 조형예술가로 활동하고 있다. 보스턴대학에서 조형예술 석사 (BU MFA Sculpture ’23)를 전공하고, 뉴욕에 스쿨오브비주얼아트 ( SVA BFA ’21)에서 순수예술로 학사를 전공하였다. 박소형 작가는 조각, 설치미술, 비디오 아트 등 다양한 매체로 작업을 하고 있으며, AI를 결합한 미디어 작업이나 식물이나 버섯포자등 생태예술 장르를 넘나들며 독특한 예술세계를 구현하고 있다. 박소형 작가는 보스턴과 뉴욕, 서울을 중심으로 활동하고 있으며, 뉴잉글랜드 스컵쳐 어소시에이션(NESA), 보스턴 기후위기 아티스트 그룹 I3C(Inspiring Climate Change), 한국여성 아티스트 그룹 그린 레시피 랩의 멤버로 활동하고 있다. 2022년 Emerson College Media Art Gallery 에서 주최한 What''s next: Perspective Micro and Macro 전시에 선정되어 보스턴 내에서 활동하는 주목할 만한 신진 작가에 이름을 올렸다.' WHERE name_ko = '박소형' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '변경희는 점을 이용한 입체적 표현을 통해 존재와 관계의 본질을 탐구하는 작가다.2025년 개인전 《●에서 점으로》를 포함해 총 12회의 개인전을 개최하였고, 대한민국 미술대전을 비롯한 다수의 공모전에서 수상한 경력을 지녔다.40회 이상의 단체전과 예술 프로젝트에 참여하며 활발한 전시 활동을 이어가고 있다.작품은 홍콩, 국내 기업 및 개인 컬렉터들에게 소장되었으며,현재 홍익대학교 미술대학원을 휴학하고 작업에 전념하고 있다.점이라는 최소 단위를 통해 생명성과 시간, 관계에 대한 시각적 언어를 구축해오고 있다.' WHERE name_ko = '변경희' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '손장섭(孫壯燮, 1941- 2021)은 1980년대 민중 미술을 이끈 단체인 ''현실과 발언''의 창립 회원이었다. 그는 역사와 민중의 삶에 대한 깊은 애정과 현실 인식을 바탕으로 역사화, 풍경화 연작을 제작하면서 역사와 자연의 시간이 결합된 자신만의 독특한 풍경 회화를 구축했다.

손장섭의 1980년대 작품은 치열한 역사의식과 현실의 모순에 대한 저항 의식을 드러내는 전형적인 민중 미술 경향을 띤다. 그는 1990년대 말까지 역사화 연작과 함께 한국의 자연 풍경, 서민들의 모습을 담은 회화 작업을 꾸준히 지속했으며, 2000년대에 들어서는 ''나무'' 연작과 ''풍경화'' 연작을 작업하며 오랜 세월 한자리에서 버티며 역사의 현장을 고스란히 목격한 자연을 주인공으로 삼았다.' WHERE name_ko = '손장섭' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '신학철(申鶴澈, 1943‒)은 민중미술 경향의 작가로 초기에는 실험미술에 참여하여 1970년대 초 한국아방가르드협회(AG)전을 통해 작품을 발표하기도 하였다. 그러나 1980년대부터 신군부 독재 체제를 비판하며 사회적 소통과 발언을 위한 미술의 역할에 대해 고민하였고 한국 근현대사의 주요 사건을 극사실주의 기법과 포토몽타주 기법을 이용하여 제작하였다.
‹묵시 802›는 신학철이 1970년대 후반부터 1980년대 초반에 집중했던 콜라주 기법으로 제작된 작품으로, 구두 모양의 얼굴을 한 샐러리맨들이 일제히 한 방향을 보고 있는 것을 통해 일방적인 정보의 흐름과 억압된 표현의 자유를 초현실적으로 풍자한다. 신학철의 작품에 등장하는 대상들은 주로 노동자, 중산층, 농민 등으로 다양한 계층의 인물들은 미화되지 않고 사실적으로 표현되어 구체적인 실체로서의 역사를 드러내고 있다.' WHERE name_ko = '신학철' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = 'SIM_Moby는 천국과 지옥의 중간, 생/사 이전의 장소인 “연옥”을 표현한다.
“하나의 생명을 낳는 것은 하나의 죽음을 낳는 것과 같다.” 라는 작가의 어릴 적 반출생주의 깨달음으로부터, 생/사의 섭리가 작용하지 않는, 자유로운 대안 공간 “SIM_Purgatory : 연옥”을 탐색하고 정립한다.
‘현실 연계형 내세’ 라는 특성을 지닌 이상향적인 세계, SIM_Moby의 연옥은 현세의 개념들을 모티프로 차용하여 다양한 2D 풍경으로 그려지는데, 작가의 지난 삶의 경험과 동양적 정체성, 괴수적인 형태와 전생으로부터의 상상적 이미지들이 융합된 비물질적 공간이 된다. 이러한 연옥의 세계는 소멸이 없는 자유롭고 영원한 유토피아를 지향하며, 이 영속성을 위해 물리적 재료로부터 시작한 1차 작업 (스케치) 이후, 물리적 소멸이 없는 디지털에서의 2차 작업을 통해 기록된다.
물리적 재료로부터 시작해 디지털로 완성된 2D 이미지는 디스플레이를 통해 그대로 전달되기도 하고, 다양한 물리적 재료로 인쇄되어 현세에 소환되기도 한다. 물성을 갖게 된 연옥 세계는, 처음부터 유화나 아크릴로 채색한 작품인지, 아니면 디지털로 완성한 후에 인쇄된 것인지를 헷갈리게 하는 환영을 감상자에게 제공한다. 이러한 환영의 제공을 위해, 1차 작업 단계에서 지녔던 물성 재료의 질감을 디지털에서 여러 차례 독특하게 변환하는데, SIM_Moby는 이 변환의 방식을 ‘메가바이트의 침식 윤회’라 부르고 있다. 이 표현 방식은 디지털에서의 여러 차례의 침식과 부식을 통해 생기는 질감을 의미하며, 픽셀의 세계위에 독특한 밀도감을 자아내는 기술로 표현된다. 이러한 디지털 침식을 진행한 화면의 터치는 1990년대 VHS 화면이 갖는 노이즈의 질감을 전달하기도 한다. 이를 통해 연옥 작품은 2D 디지털 매체, JPG의 기록형식이 나타내야 하는 궁극적 미감을 추구하고 있다.
이러한 특성을 가진 2D 디지털 이미지는 다양한 물성 위에서 인쇄되었으나, 다시 해체(죽음)의 과정을 지나, 재결합되며 콜라주 방식으로 재탄생되기도 한다.
이미 침식윤회를 적용해 탄생된 고밀도의 2D 연옥 이미지들은 다양한 형태로 오려져, 각 조각들이 가톨릭에서 이야기하는 연옥 불꽃의 모습을 표현하게 된다. 천국에 들어서기 전, 생전의 죄악을 불태우는 정화의 불꽃 개념이 연옥 세계관에 존재하는데, 불꽃과도 같은 연옥 작품의 콜라주 조각들은 카오스적인 구성으로 서로 뒤섞이게 된다. 이 화면을 감상하는 현세의 감상자들은 현실의 가시감각으로는 온전히 인지할 수 없는 연옥의 불투명성을 감각하게 된다.
아크릴 스틱으로 마감된 작품들은 고밀도 콜라주 조각 부분과 접착제, 아크릴 스틱이 결합해 이루어내는 독특한 질감을 전달하며, 다시 한 번 침식윤회의 질감을 2D 디지털만이 아닌, 새로운 물성위에서 표현하게 된다.
이와 같은 다양한 과정과 작품을 통해, SIM_Moby의 작품은 탄생(스케치)과 죽음(디지털화), 다시 탄생(인쇄)과 죽음(콜라주)을 반복하며 연옥 세계관이 달성하려하는 ‘회화의 윤회’를 모색한다.' WHERE name_ko = '심모비' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '심현희는 1980년대 후반부터 1990년대에 이르기까지 한국 화단에 존재했던 이분법적 틀을 거부하고 독자적인 노선을 견지해 온 작가입니다. 서울대학교 미술대학과 동 대학원에서 동양화를 전공하며 수묵과 인물 중심의 정통 교육을 이수했으나, 그는 당시 화단을 지배하던 민중미술의 거대 서사나 기성 동양화단의 수묵 중심주의 중 어디에도 안주하지 않았습니다. 대신 그는 장르의 경계나 수사적인 어휘에 얽매이지 않고, ‘그려야 한다는 충동’에 집중하며 자신만의 작업 세계를 구축해 나갔습니다.
작가의 작품 세계에서 가장 두드러지는 소재는 ‘인물’입니다. 그는 삶의 궤적과 희로애락이 응축된 노인의 얼굴을 200~300호에 달하는 대작으로 그려내며 대상의 존재감을 극대화했습니다. 특히 그의 인물 묘사는 단일한 선으로 매끈하게 마감되는 것이 아니라, 여러 겹의 선과 붓질이 중첩되어 시시각각 변화하는 인상의 흐름을 한 화면에 담아내는 것이 특징입니다. 여기에 꽃, 민화적 도상, 일상적인 기물들을 병치함으로써 인물에 대한 사회문화적 시각과 개인적인 정서를 다층적으로 엮어냅니다.
심현희는 형식과 재료의 실험에 있어서도 매우 과감했습니다. 수묵에서 시작해 장지에 채색을 두껍게 올리는 농채 과정을 거쳤으며, 종이와 물감이 서로 밀어내는 한계를 극복하기 위해 캔버스와 아크릴 물감으로 재료를 확장했습니다. 그는 ‘한국화’라는 용어가 특정 개념에 반대하기 위해 사용되거나 재료에 따라 장르를 나누는 관행이 작가의 자유를 구속한다고 보았습니다. 그에게 중요한 것은 재료의 구분이 아니라, 한국인의 정체성이 자연스럽게 배어 나오는 ‘우리 시대의 그림’을 그리는 것이었습니다.
이러한 태도는 작품의 제목에서도 고스란히 드러납니다. 사변적이고 관념적인 제목 대신 <머리 묶은 애>, <꽃을 보다>와 같이 직관적이고 간결한 명명을 선호하는데, 이는 작가가 전달하고자 하는 핵심이 바로 그 대상 자체에 있기 때문입니다. 그는 권위적이고 번드르르한 껍데기를 벗어던지고, 설거지할 그릇이나 배추 한 포기처럼 일상에서 마주하는 절실하고 솔직한 대상에 주목했습니다.
결국 심현희의 작업은 주류 미술계가 정해놓은 편협한 분류법에서 벗어나려 했던 부단한 실천의 산물입니다. 그는 화가로서의 근엄한 모습보다는 생활인으로서 스스로를 성찰하며, 일상에서 우러나온 정서를 가장 직관적인 방식으로 화면에 옮겼습니다. 그의 작품은 유행을 따르기보다 자기만의 진실을 지키고자 했던 한 예술가의 단단한 기록이며, 오늘날 한국 현대미술의 지평을 넓힌 중요한 성취로 평가받고 있습니다.' WHERE name_ko = '심현희' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '안소현은 배우이자 도시의 풍경을 회화적 감각으로 재구성하는 시각예술가다. 사진이라는 매체를 기반으로 장면을 포착하고, 몽환적인 색채와 인식의 간극을 통해 실제와 허구 사이의 정서적 밀도를 표현한다. 작업은 도시를 유영하듯 걷는 일상에서 출발해, 찰나의 순간들을 감각 속에 머무르게 하며 미래를 향한 새로운 시선으로 확장된다.
상명대학교 사진영상미디어학과를 졸업한 이후, 2017년 첫 개인전을 시작으로 ‘CITY OASIS’, ‘공기 도시’ 등 다수의 전시에서 회화성과 정서적 리듬이 교차하는 도시적 이미지들을 선보이며 자신만의 시각 언어를 구축해왔다. 이대아트큐브, 포르쉐 Dreamers On Artists, 서울함 전시 등에 선정되었으며, 예술영화 ‘LUNATIC’을 직접 연출하고 출연해 뉴욕, 파리, 모스크바 등 세계 독립영화제에서 수상 및 초청을 받았다. 2023년에는 텍스트, 이미지, 퍼포먼스를 아우른 책 ‘사랑만이 정답일 뿐: 센스의 탄생’을 출간하며, 자기 정체성과 감각에 대한 다층적인 시도들을 확장해가고 있다. 최근에는 기획자와 큐레이터로서의 활동을, 전시와 화면을 넘나드는 다양한 예술 실천을 이어가며 변화하는 환경 속에서도 예술이 미래와 현재를 잇는 감각의 통로가 되도록 장면을 만들어가고 있다. 작업은 늘 ‘경계’를 기반으로, 이미지와 언어, 일상과 예술, 감정과 구조 사이의 틈을 기록해간다.' WHERE name_ko = '안소현' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '한국 현대미술의 거대한 산맥이자 민중의 삶을 예술로 승화시킨 오윤은, 격동의 1980년대가 낳은 가장 뜨겁고도 진솔한 예술가였습니다. 그는 소설 ‘갯마을’로 잘 알려진 오영수 작가의 아들로 태어나 예술적 토양이 비옥한 환경에서 자랐지만, 그의 시선은 언제나 화려한 화단보다는 척박한 땅을 딛고 서 있는 민초들의 삶을 향해 있었습니다. 서울대학교에서 조소를 전공하며 서구 미학의 세례를 받았음에도 불구하고, 그는 박물관에 갇힌 박제된 미학이 아닌 거리와 현장에서 호흡하는 살아있는 미술을 갈구했습니다. 이러한 고민 끝에 그가 선택한 매체는 목판화였습니다. 한 번의 칼질로 되돌릴 수 없는 흔적을 남기는 목판화는, 투박하면서도 힘찬 그의 예술 정신을 표현하기에 가장 적합한 도구였습니다.
오윤의 작품을 관통하는 가장 핵심적인 정서는 한국인의 심연에 깔린 ‘한(恨)’과 이를 단숨에 깨치고 일어서는 ‘신명’의 조화입니다. 그의 판화 속에 등장하는 인물들은 결코 가냘프거나 나약하지 않습니다. 굵고 거친 선으로 묘사된 그들의 몸짓, 특히 역동적으로 어깨를 들썩이는 춤사위는 억눌린 현실의 고통을 딛고 일어서는 강인한 생명력을 상징합니다. 그는 탈춤, 무속, 도깨비와 같은 민속적 소재들을 현대적 감각으로 재해석하여, 서구적 조형미에 길들여진 우리 미술계에 한국적 원형이 무엇인지를 강렬하게 각인시켰습니다. 그에게 판화는 단순히 그림을 찍어내는 기술이 아니라, 시대의 아픔을 칼끝으로 새기고 대중과 그 아픔을 나누는 소통의 의식이기도 했습니다.
그는 예술이 소수의 특권층이 향유하는 전유물이 되는 것을 경계했습니다. ""미술은 많은 사람이 나누어야 한다""는 신념 아래, 자신의 판화를 시집의 표지나 노동 현장의 전단지에 아낌없이 내어주었던 일화는 그가 추구했던 예술의 공공성을 잘 보여줍니다. 자본주의의 기형적인 욕망을 풍자한 대작부터 고단한 삶을 위로하는 따뜻한 드로잉까지, 그의 작업은 언제나 인간에 대한 깊은 신뢰와 사랑에 뿌리를 두고 있었습니다. 비록 1986년, 마흔 한 살이라는 너무도 이른 나이에 간경화로 짧은 생을 마감했지만, 그가 남긴 칼자국들은 40여 년이 흐른 오늘날까지도 지워지지 않는 깊은 울림을 전해줍니다.
2026년 현재, 우리는 그 어느 때보다 기술적으로 화려한 시대를 살아가고 있지만 오윤의 투박한 목판화가 여전히 큰 감동을 주는 이유는 그 안에 담긴 진정성 때문일 것입니다. 그는 예술가가 시대와 어떻게 마주해야 하는지, 그리고 가장 한국적인 것이 어떻게 보편적인 인간의 가치에 닿을 수 있는지를 몸소 보여주었습니다. 오윤은 떠났지만 그가 나무판 위에 새겨놓은 민중의 춤사위는 여전히 멈추지 않고 계속되고 있으며, 그의 예술은 한국 미술사에서 잊을 수 없는 가장 인간적이고도 찬란한 기록으로 남아 있습니다.' WHERE name_ko = '오윤' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '사진가 이수철은 일본 오사카예술대학교에서 사진을 전공하며 ''순수'' 사진이라는 범주 안에서 자신의 예술적 기반을 닦았습니다. 그가 수학한 ''순수'' 사진이란 사회적 메시지나 시대 정신을 직접적으로 담아내는 지사적인 행위보다는, 예술 그 자체의 내면적 가치에 집중하는 태도를 내포하고 있습니다. 이수철의 작업은 사진의 존재론적 경계를 확장하는 데 그 특징이 있습니다. 그는 사진을 단순히 대상을 포착하는 도구로만 보지 않습니다. 만약 사진이 단순히 이미지를 만들어내는 과정이라면, 반드시 카메라로 무언가를 찍어야 한다는 전통적인 전제는 허물어질 수 있다고 봅니다. 실제로 그는 카메라와 필름 없이 인화 과정만으로 결과물을 만들어내는 방식 등 사진의 다양한 프로세스를 수용합니다. 결과적으로 그에게 중요한 것은 최종적인 결과물이 ''포토그래피''인지, 혹은 ''이미지그래프''나 ''디지그래프''인지와 같은 장르적 명칭이 아닙니다. 그에게 카메라란 단지 현상을 포착하기 위한 하나의 메커니즘일 뿐이며, 작가만의 방식으로 이미지를 창조하고 이를 통해 메시지를 전달할 수 있다면 그것으로 충분한 예술적 가치를 지닌다고 믿습니다.' WHERE name_ko = '이수철' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '이열(Yoll Lee) 사진가는 2012년부터 나무를 소재로 자연과 생명의 아름다움을 사진으로 표현하고 있는 나무 사진가이다.
2013년 최초의 나무 사진 전시인 ‘푸른 나무’ 시리즈를 시작으로 ‘숲(2016)’, ‘꿈꾸는 나무(2017)’, ‘인간 나무(2018)’시리즈를 전시하였고, 해외 나무 사진 시리즈로 네팔 히말라야의 랄리구라스(2017), 이탈리아의 올리브나무(2018), 아프리카 마다가스카르의 바오밥나무(2020), 그리고 남태평양 피지의 맹그로브나무(2023) 등을 촬영하였다.
몇 년 전부터 국내의 섬 나무 사진 촬영을 시작하여 ‘제주신목(2021)’과 ‘신안신목(2022)’, 통영신목(2023)을 발표하였고, 2024년에 ‘남해신목’을 전시하였다.
사진가 이열은 낮에 나무를 찾고, 밤에 작업을 한다. 밤새 한 나무에 조명을 주어 사진가가 나무, 지역, 그 지역의 역사 등을 통해 느낀 개인적인 감정과 영감을 사진에 표현한다. 이런 일련의 과정을 거쳐 촬영한 나무는 실제의 나무가 가지는 사실성을 넘어, 다른 사진가의 나무 사진과는 다른 그 만의 나무 사진이 된다. 즉, 사진의 기록성을 바탕으로 하되, 조명을 통해 주관적인 감정의 흐름까지 가미한다는 점이 다큐멘터리 사진과 구별되는 이열 사진의 특징이다.
이열은 나무 사진가일 뿐만 아니라, 2013년 ‘양재천 둑방길 나무 지키기 운동’을 주도하여 성공하였고, 자연과 예술이 함께하는 ‘예술의숲’을 꿈꾸고 있다.' WHERE name_ko = '이열' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '회화, 설치, 뉴미디어, 출판 등 다양한 매체를 넘나들며 활동하는 전방위 아티스트.
2000년대 초반부터 문자와 기호, 도시민의 욕망과 정체성, 인간의 감정과 심리 등을
탐구해 왔다. 지금까지 아홉 번의 개인전을 가졌고, 서울시립미술관, 국립현대미술관,
부산시립미술관, 성곡미술관 등 주요 미술관의 기획전에 참가했다.
미술과 타 분야를 융합한 새로운 형식의 예술을 끊임없이 개발하고 있으며, 회화와 기록,
영상을 결합한 프로젝트 <텔미 더 스토리: 우리의 이야기가 역사가 될 때>를 성남시와 성남문화재단 지원(2024년)으로 진행했다.
경상남도와 창원시가 주최한 2025년 경남국제아트페어에 초대작가로 단독 선정돼 관객 참여로 완성되는 <환대의 방: 웰컴 VIP>를 선보여 큰 호응을 이끌었다.
하슬라미술관, ㈜아트북스 등에 작품이 소장돼 있고, 「사연 있는 그림」 「북유럽 미술관 여행」 「그림의 방」 을 비롯한 다수의 미술책을 쓴 저술가로도 활동하고 있다.' WHERE name_ko = '이은화' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '이익태는 한국의 다재다능한 ''토탈 아티스트''로, 화가이자 영화감독, 연극 연출가, 퍼포먼스 아티스트였다. 그는 1947년생으로 2025년 12월 7일 78세의 나이로 사망했다.
초기 경력
서울예술대학 재학 중 1970년 한국 최초의 독립영화 「아침과 저녁 사이」를 연출·출연하며 전위예술계에 등장했다. 1970년대 ''제4집단'' 멤버로 방태수, 김구림 등과 활동하며 기성 예술에 도전했다.
미국 활동
1977년 화가의 꿈으로 미국으로 이주해 뉴욕과 LA에서 퍼포먼스 그룹 ''Theater 1981''을 창단했다. 1992년 LA 폭동 후 「볼케이노 아일랜드」와 「허깅 엔젤스」로 재난 치유와 사회 화합을 표현했다.
귀국 후 작품
1999년 귀국 후 「빙벽」 시리즈로 분단 현실을 상징적으로 다뤘다. 노년기 「피에로」와 「아이쿠」 시리즈에서는 자연과 내면을 탐구하며 무위의 경지로 나아갔다.
예술 철학
동아일보 신춘문예 등단 시나리오 작가 출신으로, 예술을 삶의 번역으로 보았다. "유명해지기보다 자신의 이야기를 하라"고 후배를 조언한 휴머니스트였다.' WHERE name_ko = '이익태' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '우리 시대의 대표적인 판화가 이철수는 1954년 서울에서 태어났다. 한때는 독서에 심취한 문학 소년이었으며, 군 제대 후 화가의 길을 선택하고 홀로 그림을 공부하였다. 1981년 서울에서 첫 개인전을 연 이후 전국 곳곳에서 여러 차례 개인전을 열었고, 1989년에는 독일과 스위스의 주요 도시에서 개인전을 가졌다. 이후 미국 시애틀을 비롯한 해외 주요 도시에서 전시를 열었고, 2011년에는 데뷔 30주년 판화전을 하고, 주요 작품이 수록된 [나무에 새긴 마음]을 펴냈다. 탁월한 민중판화가로 평가받았던 이철수는 이후 사람살이 속에 깃든 선(禪)과 영성에 관심을 쏟아 심오한 영적 세계와 예술혼이 하나로 어우러진 절묘한 작품을 선보이고 있다. 당대의 화두를 손에서 놓지 않는 그는, 평화와 환경 의제에 각별한 관심을 가지고 농사와 판화 작업을 하고 지낸다.' WHERE name_ko = '이철수' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '이호철 작가의 그림에는 닫혀 있는 세계와 열려 있는 세계의 묘한 함수관계 같은 것이 암시되어 있다. 작가의 작품에 자주 등장 하는 서랍이나 틀의 이미지는 닫힘과 열림의 경계에 있는 하나의 문지방 역할을 하기도 하며, 백자 뿐 아니라 대접, 흔히 사발이라 부르는 다완은 담백하고 수더분한 자태를 지닌다. 두툼한 기벽 외면의 굵은 물레 자국의 빠른 움직임이 순식간에 휙 지나간 듯 도자기 외벽에 거칠게 나 있는 것을 그대로 그렸다. 물의 흐름처럼, 바람이 불어오는 것 처럼 도체 전면을 분장하여 자유로움을 표현하고 있는 이호철 작가의 달항아리 작품은 백토의 자연스러운 흔적을 상당히 정교하고 섬세하게 묘사해 내고 있다. 더 없는 회화적인 맛을 풍성하게 표현하고 있는 백토는 충분히 매력적인 붓질의 회화 작품으로 추상화처럼 느껴진다. 이호철 작가는 홍익대학교 서양화과를 거쳐 동대학교 대학원 서양화과를 졸업한 후 1990년 금호 미술관에서의 첫 개인전을 시작으로 노화랑, 표갤러리, 아라리오, 선화랑 등 다수의 개인전을 가졌으며, 국제 Impact Art Festival (일본, 경도(京都)), 제8회 JAALA (TOKYO, JAPAN), 한국현대회화 50년 조망전(서울 갤러리) 등 국내외 단체전에 150여회 참여하였다.' WHERE name_ko = '이호철' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '장경호 작가는 설치미술가로, 80년대 초반 민주화가 진행 중인 시대에 시대적 위기에 맞서 인간과 삶의 문제를 풀어가던 우리 미술의 한 축인 형상미술을 주도해 왔다. 그는 관훈미술관장 시절부터 지속적으로 한국현대 형상회화전을 열면서 형상미술의 실체를 대중에게 보여주기위해 노력해 왔다. 이를 통해, 그림으로 잘못된 세상을 부정하고 스스로를 반성하는 진정한 형상미술 작가를 발굴하고자 했다.' WHERE name_ko = '장경호' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '정서온 작가(b.1984)는 대구대학교 및 동 대학원에서 미술디자인학과 회화를 전공하며 2009년 B.F.A. 학위를 취득한 이후, 현대미술 분야에서 활발히 활동을 이어가고 있는 작가이다. 그는 대구를 기반으로 활동을 시작했지만, 국내외에서 폭넓게 작품 세계를 확장하며 국제적 인 경험을 쌓아왔다. 2009년 영천창작스튜디오에서 첫 창작 활동을 시작한 그는, 2013년 부터 2017년, 그리고 2020년에는 베를린에 거주하며 다양한 전시와 프로젝트에 참여했다. 2023년에는 대구 앞산 갤러리와 2024년에는 문화예술팩토리와 포항 에서 개인전을 개최했으며 새로운 작품을 선보이는 등 꾸준히 창작과 전시 활동을 이어가고 있다.
정서온의 작품 세계는 ‘집’이라는 형상을 매개로 공간, 사물, 그리고 인간과 세계 간의 관계를 탐 구하는 데 중심을 두고 있다. 그의 작업은 물리적 공간을 넘어서 정신적 공간까지 다루며, 깊이 있는 사유와 독창적인 시각을 통해 관람객에게 존재와 관계에 대한 새로운 통찰을 제시한다.' WHERE name_ko = '정서온' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '주재환은 1940년 서울에서 태어났다. 중학교 시절, 반 고흐(Van Gogh)에 반해 미술가로써 꿈을 키웠다. 1960년 홍익대학교 미술대학에 입학했다가 한학기만에 중퇴했다. 학교 등록금으로 더 많은 재료를 구해 작업하고자 하는 의지가 그 이유였다. 주재환은 이후 20년간 미술과 아무 상관 없는 다양한 직종을 전전하며 생계를 위한 시절을 보냈다. 20대에는 피아노 외판원, 창경궁 아이스크림 장사꾼, 파출소 방범대원 등으로 일했다. 30대에 들어 민속학자 심우성을 도와 잡지사, 출판사 일을 시작했다. 독서생활, 삼성출판사, 미술과 생활, 출판문화연구소, 미진사를 거쳤다. 그는 이 과정을 통해 한국의 사회 현실을 몸으로 익힐 수 있었다. 덧붙여, 수더분하면서도 재치 있는 표정과 태도, 남을 널리 포용할 줄 아는 도량 역시 선물로 얻었다.
주재환은 작가 활동을 하지 않는 기간에도 문화예술계 인사들과 어울림을 멈추지 않았다. 대학로 학림다방, 르네상스, 명동 은성, 송석 등 다방과 술집이 주로 모이는 장소였다. 대학교 선후배부터 미술평론가 이일, 시인 김수영 등을 만날 수 있었다. 이 영향으로 창작욕이 생겨 1970년대 초반에는 김인환이 하던 광화문 술집 쪽샘에서 작은 개인전을 열기도 했다.
주재환은 1979년 ''현실과 발언''의 결성 과정과 1980년 ''현실과 발언'' 창립전 출품을 계기로 미술계라 불리는 곳에 첫걸음을 내디뎠다. 이 시기 그의 작품은 주로 당시 역사적, 정치적 주제와 깊게 연관되어 있었다. 당시 그린 <몬드리안 호텔>(1980)과 <계단을 내려오는 봄비>(1980)는 지금껏 대표작으로 회자된다. ''현실과 발언'' 이후 주재환의 사회적 삶은 진보적 지식인, 작가, 활동가 등에 걸친 복잡한 것이었다. 쉽지 않았던 86년의 장준하 선생 새긴돌 건립일이나 90년의 4.19혁명 30주기 기념행사 준비 등이 그 예다. 이런 류의 재야쪽 공공적 일에 그는 많은 애정과 시간을 쏟았다.
주재환은 1990년대 들어 역사, 정치가 아닌 자본 구조에 대한 비판을 주제로 하는 작품을 발표한다. 이 무렵은 80년대적 민주화 운동의 가투식 분위기가 어느 정도 진정되고 사회 전반의 분위기가 많이 바뀌고 있던 때였다. 해외에서는 베를린 장벽이 무너졌고 국내에선 김영삼 대통령이 정권을 잡았다. 그의 90년대 작품은 변화한 사회를 80년대 작품과 다른 시각으로 포착, 비판한 것이다. <미제점 송가>, <짜장면 배달>, <쇼핑맨> 등이 90년대 대표작이다.
주재환은 2000년대에 들어서 그 어느 때보다 활발한 활동을 보여주고 있다. 그는 젊은이들이 그의 다양한 작업 방식에서 느끼는 해방감이 기회를 만들어주는 것 같다고 말한다. 2001년 아트선재센터 개인전 ''이 유쾌한 씨를 보라'', 2007 대안공간 사루비아 다방 개인전, 2003 제 50회 베니스비엔날레 특별전 등에서 작품을 선보였으며 2001년 제 10회 민족예술인상, 2002년 유네스코 프라이즈 특별상을 받았다.' WHERE name_ko = '주재환' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '최경선 작가는 자연을 소재로 꾸준히 삶의 생동, 슬픔, 치유 등을 화폭에 담아왔다. 이번 전시에서 새롭게 선보이는 신작을 포함한 작품들은 ‘마음의 유영(遊泳)’을 표현한 작품들이다. 작가는 공중제비와 같은 마음의 동선에 대해 자주 사유한다. 고요한 수면, 야트막하게 핀 꽃, 흔들리는 풀숲, 아이의 몸짓,  물의 콧잔등에서 마음이 물고기처럼 유연해진다고 믿는다. 작가는 공간을 누비는 마음이 이탈을 꿈꾸는 심상과는 거리가 있으며, 자신에게서 타인으로, 보이는 것에서 보이지 않는 것으로 건너가게 해주는 중심 리듬임을 밝힌다. 이는 기쁨, 낙심, 애도에 기꺼이 몸을 싣는 모양과도 같은 듯하다. 계절의 변화가 갑자기 느껴지듯 고통이 슬픔으로 환기되는 미미한 전환의 순간에 작가는 특별히 감응한다. 대치되었던 모든 것들이 그 차이를 넘나드는 바로 그 때 생명의 언어가 태어나는 순간일지 모르기 때문이다. 또한 보는 이들로 하여금 작가는 부대낌이 있더라도 자연과 사람 안에 있는 태초의 명랑함을 볼 수 있는 삶의 리듬을 지니게 되기를 희망한다.' WHERE name_ko = '최경선' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '최윤정 작가는 자신이 살아가고 있는 시대를 섬세하게 들여다보고자 한다. pop kids는 현재를 표현하고자 기획된 시리즈이다. 현대사회는 과거 어느 때보다 미디어가 큰 영향력을 발휘하는 사회이다. 현대사회를 사는 우리는 스스로 욕망하기 전에 미디어로부터 행동을 권유받고 그것에 끌린다. pop kids에서 안경은 미디어의 영향을 받은 우리 사고의 프레임을 상징하는 장치로 사용되었다. 현대인의 사고의 프레임에 막대한 영향을 미치는 미디어와 인간의 욕망과 존재방식은 무엇일까?' WHERE name_ko = '최윤정' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '최혜수는 인간 존재와 삶의 의미에 대한 질문을 예술로 기록하는 시각 예술가이다.그의 작업은 유한한 생을 관찰하고 재해석하는 과정에서 비롯되며, 반복되는 일상 속에 숨은 충만과 결핍, 연결과 단절의 순간들을 드러낸다. 이를 통해 그는 관객이 스스로의 존재와 여정을 성찰하도록 이끌며, 각자의 삶이 지닌 고유한 소명과 의미에 대한 사유를 확장한다.' WHERE name_ko = '최혜수' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '한애규(b.1953)는 서울대학교에서 응용미술과와 동 대학원에서 도예를 전공하고 프랑스 앙굴렘 미술학교를 졸업하였다. 국내외 다수의 개인전과 단체전에 참여하였으며 주요 개인전으로는 《흙의 감정, 흙의 여정》(갤러리세줄, 2024), 《Beside》 (아트사이드 갤러리, 서울, 2022), 《푸른 길》 (아트사이드 갤러리, 서울, 2018), 《폐허에서》 (아트사이드 갤러리, 베이징, 2010), 《조우》 (포스코 미술관, 서울, 2009), 《꽃을 든 사람》 (가나 아트 센터, 서울, 2008) 과 주요 단체전은 《한국의 채색화 특별전》 (국립현대미술관, 과천, 2022>, 《토요일展》 (서울, 2012-2020), 《긴 호흡》 (소마미술관, 서울, 2014), 《테라코타, 원시적 미래》 (클레이아크 김해미술관, 경상남도, 2011) 등에 참여하였다. 주요 소장처로는 국립현대미술관, 서울시립미술관, 서울역사박물관, 대전시립미술관, 전북도립미술관, 서울시청, 이화여자대학교 박물관, 고려대학교 박물관 등이 있다.' WHERE name_ko = '한애규' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '예술은 제게 삶의 본질이자 자연스러운 흐름이었습니다. 서울여자대학교 서양화과를 졸업하고, 영국 노팅엄 트렌트 대학교와 미국 프랫 인스티튜트에서 석사과정을 마쳤습니다. 구상 작업을 통해 회화의 구조적 기반을 다진 뒤, 추상 회화로 전환하면서 내면의 균형과 존재의 본질을 선과 색으로 탐구해 왔습니다. 뉴욕, 시카고, 빈, 마이애미, 서울 등 다양한 도시에서 전시를 이어오며, 서로 다른 문화와 미적 감각이 교차하는 지점을 작업 속에 반영하고 있습니다. 예술은 제게 자신을 이해하고 타인과 연결되는 하나의 언어이며, 이를 통해 관람자 각자의 감각과 경험이 예술을 통해 직관적으로 교류될 수 있을 가능성을 모색하고 있습니다. 현재는 이러한 경험을 바탕으로 예술의 교육적 확장에도 관심을 두고, 창작과 나눔이 공존하는 예술 활동을 지속하고 있습니다.' WHERE name_ko = '김레이시' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '박은선은 동국대학교 예술대학 서양화과를 졸업, 이태리 로마국립아카데미를 졸업하였고, 아트파크, 아트사이드, 가나인사아트센터, 가나아트스페이스, 갤러리현대윈도우, 갤러리 룩스, THE GALLERY D, 조선일보사 갤러리 One,  Cite'' Internationale Des Arts갤러리(프랑스), Passages-현대예술 센터(프랑스) 등 18회의 개인전과 200회 이상의 국내외 기획전 및 단체전에 참여하였다.
국내외 입주작가 프로그램에 선정되어,‘D’ 국제 레지던시 프로그램(대명 스튜디오), 가나아뜰리에 입주2기, 창동미술스튜디오 입주1기, Birla Academy of Art and Culture 레지던스(인도 캘커타, 샨티니케탄), Passages(프랑스 트로아), 국제예술공동체(Cite'' Internationale Des Arts) 등에 입주하여 활동하였다.' WHERE name_ko = '박은선' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '김현철 작가는 한국 전통 회화를 현대적으로 재해석하며 초상화(전신)와 산수화(진경) 분야에서 독자적 세계를 구축한 동양화가로, 서울대 대학원 졸업 후 간송미술관에서 전통 공부를 했으며 ''시중재''를 호로 쓰며 현대미술 속 전통의 현재성을 추구한다. ''금릉 김현철''로 불리기도 하며, 특히 쪽빛 색채와 깊은 정신성을 담은 작품, 《춘향영정》 제작 등 전통과 현대의 조화를 이루는 작업으로 주목받는다.' WHERE name_ko = '김현철' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '조이락 작가는 동아대와 부산대에서 서양화를 전공하고 서양화가로 활동하다가 고려 불화 수월관음도에 매료되었다. 용인대학교 대학원에서 고려불화와 유물재현으로 석사학위를 받고 정재문화재보존연구소에서 유물재현에 참여했다. 20여년 간 고려불화 재현에 매진하면서 뉴욕과 LA 등 해외에도 고려불화의 아름다움을 알려온 그의 작품은 국립중앙박물관, 서울역사박물관, 수원시청 등 국공립 기관 등에 소장되어 있다.' WHERE name_ko = '조이락' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '살누스는 서울을 기반으로 활동하는 회화 및 드로잉 작가이다. 회화, 드로잉, 설치, 애니메이션 등 다양한 매체를 실험해 왔으며, 최근에는 페인팅과 드로잉을 중심으로 작업을 이어가고 있다. 작업은 기하학적 구조, 투명한 오브제, 구(球)와 원형 구조, 신체의 변형된 이미지 등을 반복적으로 다루며, 관음, 그로테스크, ‘보여짐과 가려짐’의 관계를 주요한 주제로 삼고 있다.
살누스는 특히 유리, 수정구슬, 반투명한 구조물 등 투명한 재료와 기하학적 형식을 통해 장식성과 폭력성, 질서와 불안정성 사이의 긴장을 화면 안에 병치시키는 작업을 지속해왔다. 회화와 설치, 평면과 입체, 서사와 구조 사이를 넘나드는 방식으로, 감각적이면서도 구조적인 이미지 세계를 구축하는 데 관심을 두고 있다.
서울을 중심으로 활동하며, 개인전 《역추격》(2014)을 비롯해 다수의 기획전에 참여했다. 최근에는 과거의 드로잉과 에스키스를 확장한 설치 작업과, ‘구슬을 따라간 뱀의 이야기’ 연작을 통해 평면과 입체, 전시 공간 전체를 하나의 서사적 구조로 엮는 방식의 작업을 전개하고 있다.' WHERE name_ko = 'Salnus' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '사람만 찍는 다큐멘터리 사진가다. 청량리 사창가 여인, 강원도 산골 농민, 인사동 풍류객, 장터꾼, 쪽방촌 빈민을 렌즈에 담아왔다. 찾아가 촬영한 것이 아니라 현지에서 그들과 함께 살면서 작업해왔다. 『월간사진』, 『한국사협』, 『삼성포토패밀리』 편집장으로 일했으며, 1995년부터 10년간 「한국환경사진가회」 회장을 역임하며 우리나라 자연환경 기록에도 힘썼다. 현재 동자동 쪽방촌에 살며 빈민의 삶을 기록하고 있다.' WHERE name_ko = '조문호' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '1958년 전남 함평 출생으로, 40년째 오일장을 탐구해온 기록사진가이며 소설가. 전국의 장터를 작업장 삼아 우리나라에서 열리는 6백여곳 오일장을 모두 기록한 바람의 여행자. 오일장을 고향의 텃밭처럼 그리워하며, 장에 두고 온 것을 찾아다니는 철부지 촌사람.' WHERE name_ko = '정영신' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '작가 양순열은 회화와 조각 등 다양한 장르를 넘나드는 컨템포리 아티스트다. 작가가 평생에 걸쳐 작업을 수행해온 주제는 존재와 사물 일반에 대한 깊은 시적 공감과 연관된 것이다. 특히 그녀는 확장된 모성의 회복을 통해 이 시대가 처한 위기의 극복과, 인간/사물/자연 사이의 영적 교감의 가능성을 탐색한다.' WHERE name_ko = '양순열' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '이윤엽은 농부나 노동자, 주변의 소박한 사물들을 재치 있게 표현하는데 흰 여백 위에 굵은 선을 사용하여 투박하면서도 정겨운 목판화의 특징을 잘 보여준다. 그에게 목판화는 나무를 깎고 작업의 도구를 다루며 그의 몸을 움직이게 만드는 매체로써, 노동을 이해하는 사람들 사이의 공감을 만들어 내거나 노동의 가치 그 자체에 대한 이해를 이끌어내는 방법이기도 하다.
이윤엽은 공장 바닥에 까는 고무판을 사용해서 조각도로 깎아냈다. <산드래미 최씨>(1996)는 이윤엽의 첫 판화 작품으로서 당시 작가가 살던 집 근처에 살고 있던 이웃 농민을 재현한 것이다. 첫 작품 이후 작가는 본격적으로 판화를 본인의 매체로 사용하게 되는데, 특히 스스로를 ‘파견미술가’라고 부르며 파업 시위 현장 등에서 노동자들과 함께 판화를 제작하는 액티비스트로서의 작가의 면모를 드러내게 된다.' WHERE name_ko = '이윤엽' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '류호식 작가의 작품들은 부조리한 현실과 그 안에서 의미를 찾고자 하는 정서를 표명한다. 주로 자연에서 영감을 받는 그는 그 순간들의 소중함을 기록한다. 작가는 과거의 어둠을 통해 새로운 희망과 행복을 발견하며, 일상의 이상적인 순간을 간직하고자 하는 소망에서 작품을 제작한다. 류호식 작가는 ''페이퍼클레이 페인팅'' 기법을 사용한다. 1250도의 가마에서 소성되어 나온 작품들은 류호식 작가 작품 특유의 질감을 만들어낸다.' WHERE name_ko = '류호식' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '자연에서 영감을 받은 작품을 주로 만드는 도예가로, ''순 돋는 나무'', ''나무 한 그루'' 등의 시리즈를 통해 심플하고 자연주의적인 작품 세계를 보여준다.' WHERE name_ko = '김지영' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '서울과학기술대학교 도예과를 졸업한 도예가로, 전통 도자기를 재해석하여 각진 형태나 조각보 이미지를 결합한 현대적인 도예 작업을 선보인다.' WHERE name_ko = '김태희' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '민병산(閔炳山, 1928~1990) 작가는 ''거리의 철학자'', ''한국의 디오게네스''로 불린 충북 청주 출신의 문필가, 서예가로, 자유분방한 삶과 독특한 ''민병산체'' 서체, 그리고 ''철학의 즐거움'' 같은 산문집으로 알려져 있으며, 세속을 초월한 삶을 실천했던 예술가다.' WHERE name_ko = '민병산' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '하선영은 홍익대학교에서 회화를 전공한 후 프랑스 아를국립사진학교에서 사진을 전공하였다. 나무의 초상화 작업과, 이후 팬데믹 시대의 힘겨운 사람들에게 아름다운 세계의 자연을 소재로 한 작품으로 우리에게 위안을 주는 작업을 계속하고 있다.' WHERE name_ko = '하선영' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '홍익대학교 회화과를 졸업했다. ''Middle Ground''는 그의 대표 추상 회화 시리즈로, 두터운 질감과 긁어내는 기법을 통해 관계와 갈등, 그리고 타협의 과정을 시각적으로 표현한다.' WHERE name_ko = '정재철' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '홍익대를 졸업하고 동 대학원(박사)을 마쳤다. 캔버스 표면의 요철과 색채의 상호작용을 탐구하는 ''Folded tint'' 시리즈로 유명한 장희진 작가는 캔버스 위에 모델링 컴파운드를 바른 뒤, 요철을 만들고 그 위에 채색을 입힌 후 표면을 갈아내는 수행적인 노동집약적 작업 과정을 통해 독특한 질감과 시각적 깊이를 만들어낸다. 이러한 작업을 통해 평면 회화의 한계를 넘어 공간적 깊이와 리듬감을 표현한다.' WHERE name_ko = '장희진' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '''폭발의 다음'' 시리즈 등을 통해 감정이 담긴 풍경과 관계 속의 외로움을 주제로 작업한다. 오픈갤러리 등 다양한 플랫폼에서 활동하고 있다.' WHERE name_ko = '김유진' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '서울대학교 미술대학 박사를 졸업했다. ''정원''과 ''식물''을 소재로 자아와 세상의 이치를 탐구하는 작업을 지속해오고 있으며, 2007년 세오 영 아티스트로 선정된 바 있다.' WHERE name_ko = '고자영' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '1964년 서귀포에서 난 고현주 작가는 2008년부터 안양소년원 아이들에게 사진 찍기를 가르치며 삶의 희망을 전하는 ‘꿈꾸는 카메라'' 작업을 했다. 2016년 암 선고를 받고 2년 후인 2018년부터 제주 4·3 사건 체험자들의 기억을 기록하는 작업을 해 그 결과물이 허은실씨가 글을 쓴 책 <기억의 목소리: 사물에 스민 제주 4·3 이야기>(문학동네)로 나왔고, 제8회 고정희상을 받았다.' WHERE name_ko = '고현주' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '최연택 작가는 화가, 도예 디자이너, 작가로 활동하며, 특히 그림과 글을 결합한 에세이, 동화책 삽화, 도자기 디자인 등 다양한 분야에서 활동하는 다재다능한 예술가다. 주요 작품으로는 『하루를 더 살기로 했다』, 『무정』 등의 삽화 작업이 있으며, 과거 청와대 식기 디자인에 참여하고 신영복 선생님과 작업하는 등 폭넓은 이력을 가졌다.' WHERE name_ko = '최연택' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '1956년 경상남도 하동에서 태어났고, 홍익대학교에서 서양화를 공부했다. 추상화풍의 미술교육에 염증을 느낀 그는 대신, 사회 참여 예술을 지향하는 미술인 동인 ‘현실과 발언’의 멤버가 되어 활발한 활동을 펼친다. 1985년 박불똥은 《한국미술, 20대의 힘》 전시를 기획하고 작품을 출품하였으나 경찰에 의해 전시가 문을 닫게 되었는데, 이는 한국미술사에서 공권력에 의해 강제로 막을 내린 첫 번째 전시로 기록되고 있다. 사진을 개념적으로 접근하는 포토몽타주 작업에서 탁월한 성과를 내기도 했으며, 쿠바의 아바나비엔날레, 광주비엔날레를 비롯해서 국내외 크고 작은 무수한 단체전에 참여하였으며, 2012년까지 11번의 개인전을 갖기도 했다.' WHERE name_ko = '박불똥' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '서울산업대(현 서울과학기술대) 도예과를 졸업했다. 다수의 공예대전 수상 경력을 가지고 있으며, ''이동구 도예공방''을 운영하며 활발한 작품 활동과 소통을 이어가고 있다.' WHERE name_ko = '이동구' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '김남진(金南鎭)은 1957년 충남 공주 출생으로 고려대를 졸업했다.
1987년 파인힐 갤러리에서 개인전 ''이태원의 밤''과 1993년 바탕골예술관에서 ''폴라로이드 누드''전을 가진 바 있다.
그가 1984년부터 시도한 일련의 ''이태원의 밤'' 다큐먼트는 성공한 한국사진의 자생적 형식 실험의 하나로 평가받고 있다.
이후 폴라 컬러의 이미지 전사를 이용한 누드 사진의 새로운 표현양식을 실험하였고,
1987년부터는 김남진 사진공방을 운영하며 현대사진의 제경향과 이론 그리고 사진미학을 체계화하여 국내에 소개하고 많은 후배 사진가들을 양성하였다.

전시기획자로서 서울국제사진페스티벌과 충무로사진축제를 기획•진행한 바 있으며, 현재 사진문화포럼과 갤러리 브레송의 대표로 있다.' WHERE name_ko = '김남진' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '평생을 일본풍의 그림을 그리는 화가로 살았지만, 생애 마지막 8년 동안 놀랍고도 대담한 예술적 변신을 성공해냈다. 토함산 해돋이, 탈, 단군, 십장생, 창, 불상, 단청, 부적, 무당 등 지극히 한국적인 주제를 선택해서, 수묵화에 강렬한 오방색의 채색을 혼합하는 독창적인 기법을 선보였다. 강렬한 색채와 자유로운 화면구성을 통해, 한국의 토속적인 정서와 민족성이 마치 들끓어 오르는 생명력으로 다가온다. 한국현대미술사의 새롭고도 독창적인 장르를 구축해낸, 수묵채색화의 거장으로 평가받고 있다.' WHERE name_ko = '박생광' AND (bio IS NULL OR trim(bio) = '');

------------------------------------------------------------
-- 2. bio_en from artists-data.ts (profile_en -> bio_en)
------------------------------------------------------------
UPDATE artists SET bio_en = 'Kang Seoktae draws inspiration from Antoine de Saint-Exupéry''s novel The Little Prince, creating works centered on the motif of the Little Prince embodying a child''s pure heart. Through the landscapes and reinterpreted narratives that the Little Prince encounters in his works, he conveys emotion and solace. He has participated in 21 solo exhibitions and over 200 group exhibitions. His publications include Speaking to the Little Prince and A Cultural Flower Bloomed on a Tree. He received a special selection at the 22nd Joongang Fine Arts Competition and a special award at the Korea-Germany Art Association Competition. His works are held in notable collections including Art Bank (MMCA), the French Cultural Center in Korea, Korea National University of Arts, Namhae County Office, the Purme Foundation, Suncheon Miracle Library, Nexon Children''s Rehabilitation Hospital, and Changwon Hanmaeum Hospital.' WHERE name_ko = '강석태' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Gijo is a visual artist and resident artist at Dalcheon Art Creation Space, expressing emotions that linger after conflict through flat painting and painted wood carving techniques.' WHERE name_ko = '기조' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Kim Sanggu was born in Seoul in 1945 and graduated from Hongik University''s Department of Western Painting and the same university''s graduate school. He is a rare artist who persists in the seemingly anachronistic craft of woodblock printing and thoroughly manual processes in an era of mechanization in modern industrial society. Wood carving art is rooted in an Eastern artisan spirit and common sensibility, characterized by straightforwardness and simplicity rather than dazzling sophistication. In this sense, his woodblock printing is one of the most humane domains of artistic work, understood as something akin to the poetry of daily life that adds warmth to our society. His woodblock world can be summarized as ''the rustic over the splendid, the simplicity that permeates like an earthen wall rather than complexity, the flat over the three-dimensional, the contrast of black and white, and the beauty of empty space over fullness.'' Since the late 1970s, the artist has continued to exhibit, and his recent works are woven through multi-color woodblock prints. Through the multi-color process, which demands meticulous labor, he broadens his expressive range while steadily pursuing works of consistency and depth.' WHERE name_ko = '김상구' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Kim Jonghwan majored in printmaking at university and currently runs ''Panhwabang,'' a printmaking studio. He is an active member of the Korean Contemporary Printmakers Association and the Hongik Printmakers Association. His illustrated books include Half-and-Half, Dokkaebi Wrestling Festival, Hong Gildong, Han Feizi, The +-x÷ Magic Show, Dreams of Joseon Captured in Hanyang, and The Golden Dragon and the Rainbow, and he has also created illustrations for various monthly magazines.' WHERE name_ko = '김종환' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Kim Juho graduated from Seoul National University''s College of Fine Arts, Department of Sculpture, and its graduate school. He has held solo exhibitions including Between People (Gwanhun Gallery, 2012) and Lively Landscape (Gahoedong 60, 2012), and has participated in numerous curated exhibitions. His works are in the collections of the National Museum of Modern and Contemporary Art, Daejeon Museum of Art, and Seoul Olympic Museum of Art (SOMA), among others. He has consistently produced three-dimensional and two-dimensional works that reinterpret people and everyday landscapes with his distinctive contemplation and ease. Beginning from everyday life, his meditative approach draws diverse stories from our surroundings, fostering empathy and communication. His work Wonderful! conveys a curiosity about the world, while the magnifying glass form in Window to the World signifies the desire to see through objects and clarify relationships. These distinctive figurative depictions of the human form connect to his revolving figures, seemingly speaking to the human relationships in our lives.' WHERE name_ko = '김주호' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Kim Juhee is an image overlap artist who overlaps unforgettable memories and momentary recollections. Through repetitive layering and the overlapping of entirely different spaces, she revisits and synthesizes memories. Just as the Korean word for ''to draw'' (grida) derives from ''to miss'' (griwohada), she photographs and layers the things she loves and longs to see, again and again. The images within her paintings are not destroyed through continuous layering but instead revive more vividly. This reflects the desires of modern people, the things they want to possess, and the wistfulness over things that vanish.' WHERE name_ko = '김주희' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Kim Joonkwon, born in 1956 in Yeongam, South Jeolla Province, graduated from Hongik University''s Western Painting department in 1982 and worked as a woodblock print researcher at China''s Lu Xun Academy of Fine Arts from 1994 to 1997. In 1997, he established the Korean Woodblock Culture Research Institute and has continued his woodblock printing practice ever since. He is also an artist who participated in the Minjung (People''s) Art movement through woodblock printing. During the 1980s, when he was immersed in the art education movement, he worked with linoleum cut techniques, exemplifying the stylistic characteristics of Minjung woodblock art. Using Jeon Bongjun, the peasant movement leader who dreamed of a great communal world, as his subject, he referenced the formal qualities of traditional Korean painting—particularly the Water-Moon Avalokitesvara style from Buddhist art—and demonstrated his interest in tradition through clear, honest compositions. Kim Joonkwon''s water-based multi-color woodblock prints occupy a singular position in Korean contemporary art, considered significant enough to chart a new direction for modern Korean landscape painting. His works evoke the aesthetic legacy of Gyeomjae Jeong Seon and Danwon Kim Hongdo, the great masters of true-view landscape painting from the late Joseon period. Notable qualities include his love for the Korean homeland rooted in a spirit of realism, his diligent fieldwork, the energy drawn from his home in Jincheon, decades of accumulated printmaking skill and artistic maturity, and the artisan spirit that endures the intense labor of carving and printing five or six blocks per work.' WHERE name_ko = '김준권' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Kim Hoseong graduated from Kyung Hee University with a degree in history and from Chung-Ang University with a degree in photography, and works as a contemporary artist. In his early career, he primarily presented works exploring modern desire and wandering through photography and video. From 2018 to 2019, he operated an unmanned gallery accessible 24 hours a day, presenting various conceptual art works through his Monthly Project, which featured a new exhibition each month. Since then, he has continued experimenting across media boundaries, translating reflections on humanity, art, and society into his work.' WHERE name_ko = '김호성' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Ra Inseok is recognized for his diverse and creative works that range from pure photography to visual art using photography as a medium. To convey the tactile quality of his subjects, he has scratched the surfaces of photographic paper to allow ink to seep through. Having prayed for supernatural powers, he acquired the ability to capture a bent and curved world. Thanks to this, Ra Inseok sees even straight lines as curves—what he calls ''upright curves.'' The straight lines captured by his camera belong to a curved world.' WHERE name_ko = '라인석' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Ryu Yeonbok was born in Gapyeong, Gyeonggi Province, studied in Seoul, and entered the world of Minjung (People''s) Art in earnest when he enrolled at Hongik University''s College of Fine Arts in 1977. His simple belief that ''beauty should be enjoyed by many'' became the driving force behind founding the Seoul Art Community upon his graduation in 1984 and leading the mural movement through the mural team ''Shipjangsaeng.'' In 1985, he organized the ''Eulchuk Year Art Grand Festival,'' a marketplace-style event where ordinary people could purchase artworks for as little as 5,000 won. In 1986, he was involved in the exhibition The Power of the Twenties in Korean Art, which was shut down by police. In 1989, prior to Lim Su-kyung''s visit to North Korea, he traveled to the United States to create large-scale banner paintings and prints to send to the North. Woodblock printing is a medium characterized by relatively easy production and virtually unlimited reproduction. These qualities were of great importance to Minjung Art artists, who aimed not only for the public to view art but also to create it themselves, opposing the exclusive enjoyment of art by a wealthy elite. Consequently, printmaking became highly prevalent during the 1980s under the influence of the people''s movement, and woodblock printing was particularly welcomed for its connection to tradition. Ryu Yeonbok skillfully brought out the rough texture of the chisel inherent in woodblock printing, expressing a harmonious balance of dynamic figures and backgrounds within simple compositions.' WHERE name_ko = '류연복' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Ryu Junhwa has been at the forefront of Korean feminist art from the 1990s to the present, deconstructing women''s roles as defined by patriarchal society and visualizing the hidden layers of oppression within them. Her artistic practice does not merely depict women but aims to challenge social taboos and subvert male-centered visual systems through powerful artistic interventions. In her early work, she brought to canvas the reality of women victimized by social violence such as sexual assault and prostitution, sounding an urgent alarm to society. Notably, by focusing not on the act of ''selling'' but on the act of ''buying'' in the Korean term maechun (prostitution), she emphasized the responsibility of men who purchase sex, demonstrating sharp insight in overturning dominant assumptions through language and imagery. She also employed popular objects such as Barbie dolls, photographs, and installation works to critique the double standard that modern society imposes on women—simultaneously demanding them to be ''chaste wives'' and ''sexual objects.'' She appropriated the conventionally male prerogative of the ''observing gaze,'' replacing men as subjects of observation, or depicted the violence hidden behind the term jipsaram (''housewife,'' literally ''house person''), which erases the individuality of married women, through ghostly figures. Her activism extended beyond individual creation into a collective voice through the feminist artist group ''Ipgim'' (Breath). The attempt to reinterpret Jongmyo, a patriarchal symbolic space, as Abanggung (a palace of beauty and audacity, a play on the word for ''uterus'') stands as one of the most iconic and resistant events in the history of Korean feminist art. In recent years, she has focused on reexamining mythological figures such as Princess Bari and historical women independence activists, working to restore women''s narratives that had been obscured by patriarchal historiography. In this way, Ryu Junhwa''s practice has evolved from exposing past wounds to excavating forgotten women''s histories and constructing new forms of female subjectivity.' WHERE name_ko = '류준화' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Park Seongwan depicts everyday landscapes with bold, rough brushstrokes and vivid colors. He graduated from Chonnam National University''s College of Arts, Department of Fine Arts, and completed his M.A. in Fine Arts (Western Painting) at the same university''s graduate school.' WHERE name_ko = '박성완' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Park Sohyung is a sculptor and visual artist active in Seoul, Boston, and New York. She holds an M.F.A. in Sculpture from Boston University (BU MFA Sculpture ''23) and a B.F.A. in Fine Arts from the School of Visual Arts in New York (SVA BFA ''21). She works across diverse media including sculpture, installation art, and video art, and navigates genres ranging from AI-integrated media works to bio-art using plants and mushroom spores, realizing a unique artistic world. Based between Boston, New York, and Seoul, she is a member of the New England Sculptors Association (NESA), the Boston climate crisis artist group I3C (Inspiring Climate Change), and the Korean women artist group Green Recipe Lab. In 2022, she was selected for the exhibition What''s Next: Perspectives Micro and Macro hosted by the Emerson College Media Art Gallery, earning recognition as a notable emerging artist active in Boston.' WHERE name_ko = '박소형' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Byun Kyunghee is an artist who explores the essence of existence and relationships through three-dimensional expression using dots. She has held a total of 12 solo exhibitions including Dots to Points (2025), and has been awarded at numerous competitions including the Grand Art Exhibition of Korea. She has participated in over 40 group exhibitions and art projects, maintaining an active exhibition practice. Her works are collected by clients in Hong Kong, Korean corporations, and private collectors. Currently on leave from the Graduate School of Fine Arts at Hongik University to devote herself to her work, she continues to build a visual language addressing vitality, time, and relationships through the minimal unit of the dot.' WHERE name_ko = '변경희' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Son Jangsub (1941–2021) was a founding member of ''Reality and Utterance,'' a group that spearheaded the Minjung (People''s) Art movement in the 1980s. Based on a deep affection for history and the lives of ordinary people, combined with an awareness of social reality, he produced series of historical paintings and landscape paintings, constructing his own distinctive landscape painting that merged historical and natural temporalities. His 1980s works exhibit the typical characteristics of Minjung Art, revealing an intense historical consciousness and a spirit of resistance against social contradictions. Through the late 1990s, he continued his historical painting series alongside paintings depicting Korean natural landscapes and the lives of common people. In the 2000s, he embarked on his ''Tree'' series and ''Landscape'' series, making nature—which has endured in one place through long ages, silently witnessing the sites of history—the protagonist of his work.' WHERE name_ko = '손장섭' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Shin Hakchul (b. 1943) is an artist associated with the Minjung (People''s) Art movement who initially participated in experimental art, exhibiting works through the Korean Avant-Garde Association (AG) exhibitions in the early 1970s. However, from the 1980s onward, he turned to critiquing the new military dictatorship, contemplating the role of art in social communication and discourse, and depicting major events in Korean modern and contemporary history using hyperrealist and photomontage techniques. Apocalypse 802 was created using the collage technique he concentrated on from the late 1970s to the early 1980s. In it, salarymen with shoe-shaped faces all look in one direction, surreally satirizing the unilateral flow of information and suppressed freedom of expression. The subjects in Shin''s works are primarily workers, the middle class, and farmers; these figures from various social strata are depicted realistically without idealization, revealing history as a concrete reality.' WHERE name_ko = '신학철' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'SIM_Moby expresses ''Purgatory''—a place between heaven and hell, prior to life and death. From the artist''s childhood realization of antinatalism that ''giving birth to one life is the same as giving birth to one death,'' he explores and establishes ''SIM_Purgatory,'' a free alternative space where the laws of life and death do not apply. This idealistic world, characterized as an ''afterlife connected to reality,'' borrows concepts from the present world as motifs and is depicted as diverse 2D landscapes, becoming an immaterial space that fuses the artist''s past life experiences, East Asian identity, monstrous forms, and imaginary images from past lives. This purgatorial world aspires to a free and eternal utopia without extinction, and for this permanence, after the primary physical work (sketching), it is recorded through secondary work in the digital realm where physical decay is absent. The 2D images, beginning with physical materials and completed digitally, are sometimes delivered directly through displays and sometimes printed on various physical materials to be summoned into the present world. The purgatorial world given materiality provides viewers with an illusion—making it difficult to tell whether the work was originally painted in oils or acrylics, or completed digitally and then printed. To produce this illusion, the artist uniquely transforms the material textures from the primary stage multiple times in the digital realm, a process SIM_Moby calls ''erosion reincarnation in megabytes.'' This expression refers to the textures generated through multiple cycles of digital erosion and corrosion, rendered as a technique that creates a distinctive sense of density on the pixel surface. The touch of these digitally eroded surfaces sometimes conveys the noise texture of 1990s VHS screens. Through this, purgatory works pursue the ultimate aesthetic that the 2D digital medium and JPG format can express. These 2D digital images, possessing such characteristics, are printed on various materials but then undergo a process of deconstruction (death), are recombined, and reborn through collage. The high-density purgatorial images, already created through erosion reincarnation, are cut into various shapes, with each fragment expressing the purgatorial flames described in Catholic theology. Before entering heaven, the concept of purifying flames that burn away sins from life exists in purgatorial theology, and the flame-like collage fragments are chaotically intermingled. Viewers in the present world sense the opacity of purgatory that cannot be fully perceived through the visible senses of reality. Works finished with acrylic sticks deliver a distinctive texture formed by the combination of high-density collage fragments, adhesive, and acrylic sticks, once again expressing the texture of erosion reincarnation on a new material surface beyond 2D digital alone. Through these diverse processes and works, SIM_Moby''s art explores ''the reincarnation of painting'' by repeating cycles of birth (sketch) and death (digitalization), birth again (printing) and death again (collage), in pursuit of the purgatorial worldview.' WHERE name_ko = '심모비' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Shim Hyunhee is an artist who has maintained an independent path since the late 1980s through the 1990s, rejecting the dichotomous frameworks that dominated the Korean art scene. After studying traditional East Asian painting, focusing on ink wash and figurative work at Seoul National University''s College of Fine Arts and its graduate school, she refused to settle into either the grand narratives of Minjung Art or the ink-centric orthodoxy of the established East Asian painting establishment. Instead, unbound by genre boundaries or rhetorical vocabulary, she focused on the ''compulsion to paint'' and built her own artistic world. The most prominent subject in her oeuvre is the ''human figure.'' She has painted the faces of elderly people—concentrating the trajectories of life and its joys and sorrows—as large-scale works of 200 to 300 ho (roughly 2 to 3 meters), maximizing the presence of her subjects. Her figurative depictions are notable for their layering of multiple lines and brushstrokes rather than smooth single-line finishes, capturing the flow of ever-changing impressions within a single canvas. By juxtaposing flowers, folk painting motifs, and everyday objects, she weaves sociocultural perspectives and personal sentiments toward her subjects in multiple layers. Shim was also remarkably bold in her formal and material experimentation. Starting with ink wash, she moved through thick coloring on traditional Korean paper (jangji), and overcame the limitations of paper repelling paint by expanding to canvas and acrylic. She viewed the term ''Korean painting'' (Hanguk-hwa) as constraining artistic freedom when used to oppose certain concepts or to categorize art by materials. What mattered to her was not material classification but painting ''pictures of our time'' in which Korean identity naturally permeates. This attitude is evident in her titles: she prefers intuitive, concise names like Girl with Tied Hair or Looking at Flowers over speculative, abstract titles, because the essence she wishes to convey lies in the subject itself. She stripped away authoritative and polished pretenses, focusing instead on the earnest, honest subjects encountered in daily life—like dishes to wash or a head of napa cabbage. Ultimately, Shim Hyunhee''s work is the product of a persistent practice of breaking free from the narrow classification systems imposed by the mainstream art world. Rather than projecting the solemnity of an artist, she reflected on herself as an everyday person, translating sentiments arising from daily life onto her canvases in the most intuitive manner. Her work stands as the solid record of an artist who chose to protect her own truth over following trends, and is recognized as an important achievement that broadened the horizons of Korean contemporary art.' WHERE name_ko = '심현희' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Ahn Sohyun is an actress and visual artist who reconstructs urban landscapes with a painterly sensibility. Working primarily with the medium of photography, she captures scenes and expresses the emotional density between reality and fiction through dreamlike colors and perceptual gaps. Her work begins from the act of drifting through the city like swimming, allowing fleeting moments to linger in the senses and expanding them into new perspectives toward the future. After graduating from Sangmyung University''s Department of Photography, Film, and Media, she has been building her own visual language since her first solo exhibition in 2017, presenting urban images where painterly qualities and emotional rhythms intersect in exhibitions such as CITY OASIS and Authentic City. She was selected for the Ewha Art Cube, Porsche Dreamers On Artists, and the Seoul Battleship exhibition, and directed and starred in the art film LUNATIC, which received awards and invitations at independent film festivals in New York, Paris, Moscow, and elsewhere. In 2023, she published the book Only Love Is the Answer: The Birth of Sens, encompassing text, images, and performance, expanding her multilayered explorations of identity and sensation. Recently, she has been extending her activities as a planner and curator, creating scenes across exhibitions and screens, ensuring that art serves as a sensory conduit connecting the future and the present in changing environments. Her work is always grounded in ''boundaries,'' recording the gaps between image and language, everyday life and art, emotion and structure.' WHERE name_ko = '안소현' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Oh Yun was a towering figure in Korean contemporary art, the most passionate and honest artist of the tumultuous 1980s, who elevated the lives of ordinary people into art. Born to Oh Youngsu, the author well known for the novel Seaside Village, he grew up in a fertile artistic environment, yet his gaze was always directed toward the lives of common people standing on barren ground rather than the glamorous art world. Despite receiving a Western aesthetic education studying sculpture at Seoul National University, he yearned not for a preserved aesthetics confined to museums but for living art that breathed in the streets and on the ground. After much deliberation, the medium he chose was woodblock printing. The woodblock, which leaves an irreversible mark with each cut of the knife, was the most fitting tool to express his robust and powerful artistic spirit. The most essential sentiment running through Oh Yun''s works is the harmony between han (a deep-seated Korean emotion of sorrow and resentment) and sinmyeong (the ecstatic vitality that breaks through it at once). The figures in his prints are never frail or weak. Their gestures, depicted with bold, rough lines—especially their dynamic shoulder movements in dance—symbolize a powerful life force that rises above the pain of oppressed reality. He reinterpreted folk subjects such as mask dance, shamanism, and dokkaebi (Korean goblins) with a modern sensibility, powerfully imprinting upon an art world accustomed to Western aesthetics the question of what constitutes a Korean archetype. For him, printmaking was not merely a technique for reproducing images but a ritual of communication—etching the pain of the times with his blade and sharing it with the public. He was wary of art becoming the exclusive property of a privileged few. Under his conviction that ''art should be shared by many,'' his generous practice of lending his prints for poetry book covers and labor movement leaflets exemplifies his commitment to the public nature of art. From grand works satirizing the grotesque desires of capitalism to warm drawings comforting hard lives, his work was always rooted in a deep trust and love for humanity. Although he died of liver cirrhosis at the tragically young age of 41 in 1986, the marks he carved remain an unfading, deeply resonant legacy more than 40 years later. In 2026, we live in an era more technologically dazzling than ever, yet Oh Yun''s rough woodblock prints continue to move us deeply—perhaps because of the authenticity they contain. He demonstrated through his own life and work how an artist should confront the times, and how the most Korean qualities can reach universal human values. Oh Yun is gone, but the people''s dance he carved into wood never stops, and his art endures as the most humane and luminous record in Korean art history.' WHERE name_ko = '오윤' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Photographer Lee Soocheol studied photography at Osaka University of Arts, establishing his artistic foundation within the category of ''pure'' photography. The ''pure'' photography in which he trained implies an attitude focused on the intrinsic value of art itself, rather than directly conveying social messages or the spirit of the times. Lee''s work is characterized by expanding the ontological boundaries of photography. He does not view photography merely as a tool for capturing subjects. If photography is simply a process of creating images, then the traditional premise that one must photograph something with a camera can be dismantled. Indeed, he embraces diverse photographic processes, including methods that produce results using only the printing process without a camera or film. Ultimately, what matters to him is not whether the final product is classified as ''photography,'' ''imagegraph,'' or ''digigraph.'' For him, the camera is merely one mechanism for capturing phenomena, and he believes that if an artist can create images in their own way and convey a message through them, that in itself holds sufficient artistic value.' WHERE name_ko = '이수철' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Lee Yoll (Yoll Lee) is a tree photographer who has been expressing the beauty of nature and life through photography since 2012, using trees as his primary subject. Beginning with his first tree photography exhibition, the Blue Trees series in 2013, he has exhibited the Forest (2016), Dreaming Trees (2017), and Human Trees (2018) series. His overseas tree photography series includes Nepal''s Himalayan Rhododendrons (2017), Italian Olive Trees (2018), Madagascar''s Baobab Trees (2020), and Fiji''s Mangrove Trees (2023). In recent years, he began photographing island trees across Korea, presenting Jeju Sacred Trees (2021), Shinan Sacred Trees (2022), and Tongyeong Sacred Trees (2023), followed by Namhae Sacred Trees in 2024. Lee Yoll searches for trees by day and works at night. Spending the night illuminating a single tree, he expresses through photography the personal emotions and inspirations he draws from the tree, the region, and its history. Through this process, the photographed tree transcends the factual reality of actual trees, becoming his own distinctive tree photograph unlike any other photographer''s work. In other words, while grounded in photography''s documentary nature, the addition of subjective emotional flow through lighting distinguishes Lee Yoll''s photography from documentary photography. Beyond being a tree photographer, Lee Yoll led the successful ''Yangjae Stream Embankment Road Tree Preservation Movement'' in 2013 and dreams of an ''Art Forest'' where nature and art coexist.' WHERE name_ko = '이열' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Lee Eunhwa is a multidisciplinary artist working across painting, installation, new media, and publishing. Since the early 2000s, she has explored text and symbols, urban desire and identity, and human emotions and psychology. She has held nine solo exhibitions and participated in curated exhibitions at major institutions including the Seoul Museum of Art, the National Museum of Modern and Contemporary Art, the Busan Museum of Art, and the Sungkok Art Museum. She constantly develops new forms of art that fuse fine art with other fields. She carried out the project Tell Me The Story: When Our Stories Become History, combining painting, documentation, and video, with the support of the City of Seongnam and the Seongnam Cultural Foundation (2024). She was exclusively selected as an invited artist for the 2025 Gyeongnam International Art Fair, hosted by Gyeongsangnam-do Province and the City of Changwon, where she presented Room of Hospitality: Welcome VIP, a participatory work completed through audience engagement, to great acclaim. Her works are in the collections of Haslla Art World and Art Books Inc., among others, and she is also active as an author, having written numerous art books including Stories Behind Paintings, Nordic Museum Journeys, and The Room of Paintings.' WHERE name_ko = '이은화' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Lee Iktae was a versatile Korean ''total artist''—a painter, film director, theater director, and performance artist. Born in 1947, he passed away on December 7, 2025, at the age of 78. During his studies at Seoul Institute of the Arts, he emerged on the avant-garde scene in 1970 by directing and starring in Korea''s first independent film, Between Morning and Evening. As a member of ''The Fourth Group'' in the 1970s, he challenged established art alongside artists such as Bang Taesu and Kim Kulim. In 1977, he moved to the United States with dreams of becoming a painter and founded the performance group ''Theater 1981'' in New York and Los Angeles. After the 1992 LA riots, he expressed disaster healing and social reconciliation through works including Volcano Island and Hugging Angels. After returning to Korea in 1999, his Ice Wall series symbolically addressed the reality of national division. In his later years, the Pierrot and Aiku series explored nature and inner life, advancing toward a state of effortless being (wu-wei). A screenwriter who debuted through the Dong-A Ilbo New Year''s Literary Competition, he viewed art as a translation of life. He was a humanist who advised younger artists to ''tell your own story rather than seeking fame.''' WHERE name_ko = '이익태' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Lee Cheolsu, one of the most representative printmakers of our time, was born in Seoul in 1954. He was once a literature-obsessed youth, but after completing his military service, he chose the path of the artist and taught himself painting. Since holding his first solo exhibition in Seoul in 1981, he has held numerous solo exhibitions throughout Korea and, in 1989, had solo exhibitions in major cities across Germany and Switzerland. He subsequently exhibited in overseas cities including Seattle in the United States. In 2011, he held a 30th anniversary printmaking exhibition and published Tree-Carved Hearts, a collection of his major works. Initially acclaimed as an outstanding Minjung (People''s) printmaker, Lee has since turned his attention to Zen (Seon) and spirituality within everyday human life, presenting exquisite works that unite profound spiritual worlds with artistic soul. Never releasing the pressing issues of his era, he maintains a particular concern for peace and environmental causes while farming and continuing his printmaking practice.' WHERE name_ko = '이철수' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'The paintings of Lee Hochul suggest a subtle functional relationship between closed and open worlds. The images of drawers and frames that frequently appear in his work serve as thresholds at the boundary between closure and openness. Beyond white porcelain, the bowls commonly called dawan possess a plain and unpretentious form. The thick, coarse wheel marks on the outer surface of the vessel walls, as if the rapid movement of the potter''s wheel swept past in an instant, are depicted exactly as they appear in their rough state. Like the flow of water or the blowing of wind, Lee Hochul''s moon jar works—which express freedom by coating the entire surface with white slip—describe the natural traces of white clay with considerable precision and delicacy. The white clay, richly expressing an incomparable painterly quality, feels sufficiently compelling as a painting of brushstrokes, resembling abstract art. Lee Hochul graduated from Hongik University''s Western Painting department and its graduate school, and since his first solo exhibition at Kumho Museum of Art in 1990, he has held numerous solo exhibitions at galleries including Rho Gallery, Pyo Gallery, Arario, and Sun Gallery, and has participated in over 150 group exhibitions both domestically and internationally, including the International Impact Art Festival (Kyoto, Japan), the 8th JAALA (Tokyo, Japan), and the Korean Contemporary Painting 50 Years Retrospective (Seoul Gallery).' WHERE name_ko = '이호철' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Jang Kyungho is an installation artist who has been at the forefront of figurative art—one pillar of Korean art that addressed the crisis of the era by tackling issues of humanity and life during the democratization movement of the early 1980s. Since his tenure as director of the Gwanhun Gallery, he has consistently organized exhibitions of Korean contemporary figurative painting to present the substance of figurative art to the public. Through these efforts, he has sought to discover genuine figurative artists who use painting to challenge a flawed world and reflect upon themselves.' WHERE name_ko = '장경호' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Jeong Seoon (b. 1984) earned her B.F.A. in Painting from Daegu University and its graduate school in 2009, and has been actively working in the field of contemporary art. While she began her career based in Daegu, she has broadly expanded her artistic world both domestically and internationally. She began her first creative residency at Yeongcheon Creative Studio in 2009, and from 2013 to 2017 and again in 2020, she lived in Berlin, participating in various exhibitions and projects. In 2023 and 2024, she held solo exhibitions in Daegu and Pohang, continuing to present new works and sustain her creative and exhibition activities. Jeong Seoon''s artistic world centers on the form of the ''house'' as a medium to explore the relationships between space, objects, and the connections between human beings and the world. Her work extends beyond physical space to address mental space, offering viewers new insights into existence and relationships through depth of thought and original perspective.' WHERE name_ko = '정서온' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Joo Jaehwan was born in Seoul in 1940. As a middle school student, he became enamored with Van Gogh and nurtured dreams of becoming an artist. In 1960, he enrolled in Hongik University''s College of Fine Arts but dropped out after just one semester—his reason being the desire to purchase more materials for his work with the money that would have gone to tuition. For the next 20 years, Joo worked in various occupations unrelated to art to make a living. In his twenties, he worked as a piano salesman, an ice cream vendor at Changgyeonggung Palace, and a neighborhood watch volunteer at a police substation. In his thirties, he began working at magazines and publishing houses, assisting the folklorist Shim Wooseong. He passed through Dokseo Saenghwal (Reading Life), Samsung Publishing, Art and Life, the Publishing Culture Research Institute, and Mijinsa. Through this process, he gained firsthand experience of Korean social realities. In addition, he acquired an easygoing yet witty demeanor and a generous capacity to embrace others. Even during his years away from art, Joo never ceased socializing with figures in the cultural and arts community. Their gathering places were mainly teahouses and bars: Hakrim Dabang and Renaissance on Daehangno, and Eunseong and Songseok in Myeongdong. There he encountered university seniors and juniors as well as art critic Lee Il and poet Kim Suyoung. Inspired by these encounters, he held a small solo exhibition at Jjoksaem, a bar run by Kim Inhwan in Gwanghwamun, in the early 1970s. Joo took his first steps into what might be called the art world through the formation of ''Reality and Utterance'' in 1979 and his participation in its inaugural exhibition in 1980. His works from this period were deeply connected to the historical and political themes of the time. Mondrian Hotel (1980) and Spring Rain Descending a Staircase (1980), painted during this era, remain celebrated as representative works. After ''Reality and Utterance,'' Joo''s social life was complex, spanning progressive intellectual, artist, and activist roles. Examples include the difficult establishment of a memorial stone for Jang Junha in 1986 and preparations for the 30th anniversary of the April 19 Revolution in 1990. He devoted considerable affection and time to such civic and public endeavors. In the 1990s, Joo began presenting works that critique capital structures rather than history and politics. By this time, the combative atmosphere of the 1980s democratization movement had largely subsided, and the overall social mood was changing significantly. Abroad, the Berlin Wall had fallen; domestically, President Kim Young-sam had taken power. His 1990s works capture and critique the transformed society from a different perspective than his 1980s pieces. Representative works of this decade include Ode to American Dots, Jjajangmyeon Delivery, and Shopping Man. Since the 2000s, Joo has been more active than ever. He says the sense of liberation young people find in his diverse working methods creates opportunities for him. He presented works at his solo exhibition Behold This Delightful Man at Art Sonje Center (2001), Project Space Sarubia Dabang (2007), and the 50th Venice Biennale Special Exhibition (2003). He received the 10th National Arts Award (2001) and the UNESCO Prize Special Award (2002).' WHERE name_ko = '주재환' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Choi Kyungsun has consistently depicted the vitality, sorrow, and healing of life on canvas, drawing from nature as her primary subject. Her new works, including recent pieces premiering in her current exhibition, express the ''swim of the mind.'' The artist frequently reflects on the trajectory of the mind, like a somersault through air. She believes the mind becomes as fluid as a fish when encountering a still water surface, low-blooming flowers, swaying grasslands, a child''s gestures, or the ridge of water''s surface. She reveals that the mind navigating through space is not about dreaming of escape but rather serves as a central rhythm that carries one from self to others, from the visible to the invisible. This seems akin to willingly surrendering oneself to joy, dejection, and mourning. The artist is particularly attuned to the subtle moments of transition when pain shifts into sorrow, much like the sudden awareness of a changing season—because it may be at that precise moment, when all opposing elements traverse their differences, that the language of life is born. She also hopes that viewers will acquire a rhythm of life that allows them to perceive the primordial cheerfulness within nature and people, even amid the friction of existence.' WHERE name_ko = '최경선' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Artist Choi Yoonjung seeks to closely examine the era in which she lives. Pop Kids is a series conceived to express the present. Contemporary society is one where media exerts greater influence than at any point in the past. In this society, we are invited to act by media before we even desire something ourselves, and we are drawn to it. In Pop Kids, eyeglasses are used as a device symbolizing the frame of our thinking shaped by media influence. What are the desire and mode of existence of modern people, whose cognitive frameworks are so profoundly influenced by media?' WHERE name_ko = '최윤정' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Choi Hyesu is a visual artist who records questions about human existence and the meaning of life through art. Her work originates from observing and reinterpreting finite life, revealing moments of fullness and deficiency, connection and disconnection hidden within repetitive daily routines. Through this, she guides viewers to reflect on their own existence and journey, expanding contemplation on the unique calling and meaning inherent in each person''s life.' WHERE name_ko = '최혜수' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Han Aekyu (b. 1953) studied applied art and ceramics at Seoul National University and its graduate school, and graduated from the École d''Art d''Angoulême in France. She has participated in numerous solo and group exhibitions domestically and internationally. Major solo exhibitions include Emotions of Earth, Journey of Earth (Gallery Sejul, 2024), Beside (Artside Gallery, Seoul, 2022), Blue Path (Artside Gallery, Seoul, 2018), From Ruins (Artside Gallery, Beijing, 2010), Encounter (POSCO Art Museum, Seoul, 2009), and A Person Holding Flowers (Gana Art Center, Seoul, 2008). Notable group exhibitions include the Special Exhibition of Korean Polychrome Painting (National Museum of Modern and Contemporary Art, Gwacheon, 2022), Saturday Exhibition (Seoul, 2012–2020), Long Breath (SOMA Museum of Art, Seoul, 2014), and Terracotta, Primitive Future (Clayarch Gimhae Museum, Gyeongsangnam-do, 2011). Her works are held in major collections including the National Museum of Modern and Contemporary Art, Seoul Museum of Art, Seoul Museum of History, Daejeon Museum of Art, Jeonbuk Museum of Art, Seoul City Hall, Ewha Womans University Museum, and Korea University Museum.' WHERE name_ko = '한애규' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Art has always been the essence and natural flow of Lacey Kim''s life. After graduating from Seoul Women''s University with a degree in Western Painting, she completed master''s programs at Nottingham Trent University in the UK and Pratt Institute in the US. Having established a structural foundation in painting through figurative work, she transitioned to abstract painting, exploring inner balance and the essence of existence through line and color. She has exhibited in diverse cities including New York, Chicago, Vienna, Miami, and Seoul, reflecting in her work the intersections of different cultures and aesthetic sensibilities. For her, art is a language for understanding oneself and connecting with others, and through it she explores the possibility of intuitive exchange between viewers'' individual senses and experiences. Currently, drawing on this body of experience, she is also interested in the educational extension of art, sustaining artistic activities where creation and sharing coexist.' WHERE name_ko = '김레이시' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Park Eunsun graduated from Dongguk University''s College of Arts, Department of Western Painting, and from the Accademia di Belle Arti di Roma in Italy. She has held 18 solo exhibitions at venues including Art Park, Artside, Gana Insa Art Center, Gana Art Space, Gallery Hyundai Window, Gallery Lux, THE GALLERY D, Chosun Ilbo Gallery One, the Cité Internationale des Arts Gallery (France), and Passages Contemporary Art Center (France), and has participated in over 200 curated and group exhibitions domestically and internationally. She has been selected for artist-in-residence programs both in Korea and abroad, including the ''D'' International Residency Program (Daemyung Studio), Gana Atelier Residency (2nd cohort), Changdong Art Studio (1st cohort), Birla Academy of Art and Culture Residence (Kolkata and Santiniketan, India), Passages (Troyes, France), and the Cité Internationale des Arts (Paris, France).' WHERE name_ko = '박은선' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Kim Hyuncheol is an East Asian painting artist who has built an independent artistic world by reinterpreting traditional Korean painting in a contemporary context, specializing in portraiture (full-figure) and landscape painting (true-view). After graduating from Seoul National University''s graduate school, he studied traditional art at the Kansong Art Museum. Using ''Sijungjae'' as his pen name, he pursues the contemporary relevance of tradition within modern art. Also known as ''Geumneung Kim Hyuncheol,'' he is particularly noted for his indigo-hued palette and works imbued with deep spirituality, as well as his creation of the Portrait of Chunhyang, demonstrating a harmonious integration of tradition and modernity.' WHERE name_ko = '김현철' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Jo Irak majored in Western painting at Dong-A University and Pusan National University, and worked as a Western-style painter before becoming captivated by the Water-Moon Avalokitesvara paintings of Goryeo Buddhist art. She received her master''s degree from Yongin University''s graduate school, specializing in Goryeo Buddhist painting and artifact reproduction, and participated in artifact reproduction at the Jeongjae Cultural Heritage Conservation Research Institute. Having devoted over 20 years to reproducing Goryeo Buddhist paintings while sharing their beauty internationally in New York, Los Angeles, and beyond, her works are held in public collections including the National Museum of Korea, Seoul Museum of History, and Suwon City Hall.' WHERE name_ko = '조이락' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Salnus is a Seoul-based painting and drawing artist. Having experimented with various media including painting, drawing, installation, and animation, he has recently focused his practice on painting and drawing. His work repeatedly engages with geometric structures, transparent objects, spheres and circular forms, and distorted images of the body, addressing voyeurism, the grotesque, and the relationship between ''being seen and being concealed'' as major themes. Through transparent materials such as glass, crystal spheres, and semi-translucent structures combined with geometric forms, Salnus has consistently juxtaposed the tensions between decorativeness and violence, order and instability within his canvases. Moving between painting and installation, flat surface and three-dimensional form, narrative and structure, he is interested in constructing an image world that is both sensory and structural. Based in Seoul, he has participated in numerous curated exhibitions since his solo show Reverse Pursuit (2014). Recently, through expanded installations of past drawings and sketches and the serial work The Story of the Snake Following the Marble, he has been developing a practice that weaves flat and three-dimensional elements and the entire exhibition space into a single narrative structure.' WHERE name_ko = 'Salnus' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Jo Munho is a documentary photographer who photographs only people. He has captured the women of Cheongnyangni''s red-light district, mountain farmers of Gangwon Province, the artists and bohemians of Insadong, market vendors, and the urban poor in jjokbang (tiny single-room dwellings). Rather than visiting to photograph, he has lived among his subjects while working. He served as editor-in-chief of Monthly Photography, the Korean Photo Association journal, and Samsung Photo Family. From 1995, he served as president of the Korea Environmental Photographers Association for ten years, contributing to the documentation of Korea''s natural environment. He currently lives in the Dongjadong jjokbang neighborhood, documenting the lives of the urban poor.' WHERE name_ko = '조문호' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Jeong Yeongsin, born in 1958 in Hampyeong, South Jeolla Province, is a documentary photographer and novelist who has devoted 40 years to exploring Korea''s traditional five-day markets (oiljang). A traveler of the wind who has documented all 600-plus five-day markets held across the country, she yearns for these markets as if they were her hometown garden, a guileless country person searching for something she left behind at the market.' WHERE name_ko = '정영신' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Yang Sunryul is a contemporary artist who works across diverse genres including painting and sculpture. The subject she has pursued throughout her lifetime is deeply connected to a poetic empathy with existence and objects in general. In particular, she explores the possibility of overcoming the crises of our age through the recovery of an expanded maternal sensibility, and investigates the potential for spiritual communion between human beings, objects, and nature.' WHERE name_ko = '양순열' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Lee Yunyeop depicts farmers, laborers, and humble everyday objects with wit, using bold lines on white space to skillfully capture the rough yet endearing character of woodblock printing. For him, woodblock printing is a medium that engages his body through carving wood and handling tools, serving as a method to create empathy among people who understand labor or to foster understanding of the value of labor itself. Lee Yunyeop used rubber sheeting—the kind laid on factory floors—carved with engraving tools. Mr. Choi of Sandraemi (1996) was his first print work, depicting a neighboring farmer who lived near his home at the time. After this first work, the artist committed to printmaking as his primary medium, and notably called himself a ''dispatched artist,'' creating prints alongside workers at strike sites and protest scenes, revealing his activist dimension as an artist.' WHERE name_ko = '이윤엽' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Ryu Hosik''s works express the absurdities of reality and the emotions of seeking meaning within them. Primarily inspired by nature, he documents the preciousness of those moments. The artist discovers new hope and happiness through the darkness of the past, and creates his works out of a desire to preserve the ideal moments of daily life. Ryu Hosik employs a ''paper clay painting'' technique, in which works fired in a kiln at 1,250°C produce the distinctive texture characteristic of his art.' WHERE name_ko = '류호식' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Kim Jiyoung is a ceramic artist primarily creating works inspired by nature. Through series such as Sprouting Tree and A Single Tree, she presents a simple, naturalistic artistic world.' WHERE name_ko = '김지영' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Kim Taehee is a ceramic artist who graduated from Seoul National University of Science and Technology''s Department of Ceramics. She presents contemporary ceramic works that reinterpret traditional pottery by incorporating angular forms and jogakbo (patchwork wrapping cloth) imagery.' WHERE name_ko = '김태희' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Min Byungsan (1928–1990) was a literary figure and calligrapher from Cheongju, North Chungcheong Province, known as the ''Street Philosopher'' and ''Korea''s Diogenes.'' He was celebrated for his freewheeling lifestyle, his distinctive ''Min Byungsan Style'' calligraphy, and essay collections such as The Joy of Philosophy. He was an artist who practiced a life transcending worldly conventions.' WHERE name_ko = '민병산' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Ha Sunyoung majored in painting at Hongik University before studying photography at the École Nationale Supérieure de la Photographie d''Arles in France. She has continued working with portraits of trees, and subsequently with works featuring the beautiful natural landscapes of the world, offering solace to people enduring the hardships of the pandemic era.' WHERE name_ko = '하선영' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Jeong Jaecheol graduated from Hongik University''s Department of Painting. Middle Ground is his representative abstract painting series, which visually expresses the processes of relationship, conflict, and compromise through thick textures and scraping techniques.' WHERE name_ko = '정재철' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Jang Heejin graduated from Hongik University and completed her Ph.D. at the same institution. Known for her Folded Tint series, which explores the interplay of surface texture and color on canvas, Jang creates distinctive texture and visual depth through a labor-intensive, performative process of applying modeling compound to the canvas, creating relief patterns, applying paint, and then sanding the surface. Through this practice, she transcends the limitations of flat painting to express spatial depth and rhythm.' WHERE name_ko = '장희진' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Kim Yujin explores emotion-laden landscapes and loneliness within relationships through series such as The Day After the Explosion. She is active on various platforms including Open Gallery.' WHERE name_ko = '김유진' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Ko Jayoung holds a Ph.D. from Seoul National University''s College of Fine Arts. She has continuously explored the self and the principles of the world through the subjects of ''gardens'' and ''plants,'' and was selected as the SEO Young Artist in 2007.' WHERE name_ko = '고자영' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Ko Hyunju, born in 1964 in Seogwipo, Jeju, launched the ''Dreaming Camera'' project in 2008, teaching photography to juveniles at Anyang Youth Detention Center and inspiring hope in their lives. After being diagnosed with cancer in 2016, she began documenting the memories of survivors of the Jeju April 3 Incident two years later, in 2018. The resulting work was published as the book Voice of Memory: Stories of Jeju 4·3 Embedded in Objects (Munhakdongne), with text by Heo Eunsil, and received the 8th Ko Jeonghee Award.' WHERE name_ko = '고현주' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Choi Yeontaek is an artist active as a painter, ceramic designer, and author, known as a versatile artist working across diverse fields including essays combining illustrations and text, children''s book illustrations, and ceramic design. His notable works include illustrations for the books I Decided to Live One More Day and Heartless. He has participated in designing presidential tableware for the Blue House and collaborated with the late Professor Shin Youngbok, demonstrating his extensive career.' WHERE name_ko = '최연택' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Park Bulttong was born in 1956 in Hadong, South Gyeongsang Province, and studied Western painting at Hongik University. Disillusioned with the abstract painting-oriented art education, he instead became a member of ''Reality and Utterance,'' a group of artists committed to socially engaged art, where he was actively involved. In 1985, Park organized and exhibited works in the exhibition The Power of Korean Art in Their Twenties, which was shut down by police—recorded as the first exhibition in Korean art history to be forcibly closed by authorities. He also achieved outstanding results in photomontage, a conceptual approach to photography. He participated in numerous major exhibitions both domestically and internationally, including the Havana Biennale in Cuba and the Gwangju Biennale, and held 11 solo exhibitions through 2012.' WHERE name_ko = '박불똥' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Lee Donggu graduated from Seoul National University of Technology (now Seoul National University of Science and Technology), Department of Ceramics. With numerous craft competition awards to his credit, he runs the ''Lee Donggu Ceramics Studio'' and continues active artistic practice and engagement.' WHERE name_ko = '이동구' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Kim Namjin (b. 1957, Gongju, South Chungcheong Province) graduated from Korea University. He held solo exhibitions including Itaewon Nights at Finehill Gallery (1987) and Polaroid Nudes at Batanggol Arts Hall (1993). His Itaewon Nights documentary series, initiated in 1984, is recognized as one of the successful indigenous formal experiments in Korean photography. He subsequently experimented with new expressive approaches to nude photography using Polaroid color image transfer techniques. Since 1987, he has operated the Kim Namjin Photography Workshop, systematically introducing various trends and theories of contemporary photography and photographic aesthetics to Korea while mentoring many younger photographers. As an exhibition organizer, he has planned and directed the Seoul International Photo Festival and the Chungmuro Photo Festival. He currently serves as the representative of the Photo Culture Forum and Gallery Bresson.' WHERE name_ko = '김남진' AND (bio_en IS NULL OR trim(bio_en) = '');
UPDATE artists SET bio_en = 'Park Saenggwang spent most of his life painting in a Japanese-influenced style, but in the final eight years of his career, he achieved an astonishing and bold artistic transformation. He chose quintessentially Korean subjects—the sunrise over Tohamsan Mountain, traditional masks, Dangun (the mythical founder of Korea), the ten longevity symbols, windows, Buddhist statues, dancheong (traditional decorative painting), talismans, and shamans—and pioneered an original technique that combined powerful obangsaek (the five cardinal colors of Korean tradition) with ink wash painting. Through intense color and free compositional structure, Korean indigenous sentiments and national identity emerge with the force of surging life energy. He is acclaimed as a master of colored ink painting who forged a new and original genre in the history of Korean contemporary art.' WHERE name_ko = '박생광' AND (bio_en IS NULL OR trim(bio_en) = '');

------------------------------------------------------------
-- 3. history from artists-data.ts
------------------------------------------------------------
UPDATE artists SET history = '달천예술창작공간 입주 작가' WHERE name_ko = '기조' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '<학력>
중앙대학교 예술대학원 조형예술학과 졸업

<개인전>
2024 21세게 도시, KMJ아트갤러리, 인천
외 총 12회

<단체전>
2025 아시아프, 문화역서울284, 서울
2024「아트·T 인천」 미술은행 기획전시, 남동문화센터, 인천
평화와 생태계, 평화누리길 어울림센터, 연천
구입소장품전 픽셀(pixel):풍경의 재해석, 여주시미술관
아트뮤지엄 려, 여주
외 총 250 여회

<수상>
2019 안견사랑전국미술대전 대상
2019 앙데팡당KOREA 최우수상
2018 인천미술대전 대상
<선정>
2024 인천문화재단 예술창작 지원
2023 서울문화재단 원로예술지원
2023 인천문화재단 예술창작 지원
2020 고양 예술활동 지원사업 <고양예술은행>
2020 경기도 문화뉴딜코로나19 예술백신 프로젝트
2020 서울공공미술 프로젝트 작품기획안 공모
2019 인천문화재단 예술표현활동

<소장>
안국문화재단, 여주시미술관 아트뮤지엄 려, 인천문화재단 미술은행, 양평군립미술관, 경기문화재단,
국립현대미술관 미술은행, 양평군립미술관, 광주시립미술관, 삼탄아트마인' WHERE name_ko = '김규학' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '* 추계예술대학교 서양화과 졸업
* 동국대학교 교육대학원 미술교육과 졸업
* 석사학위 취득 논문: 고암 이응노 작품 연구
* 화집발간: A Collection of Kim Dong Seok Paintings (도서출판, 솔과학, 2019)
길...어디에도 있었다 (도서출판, 차이DEU, 2017)
THE PATH (도서출판, 차이DEU, 2017)
* 개인전 31회 (서울, 순천, 부산, 원주, 구미, 북경, LA)
* 아트페어 41회 (서울, 부산, 대구, 청주, 광주, 상하이, 북경, 홍콩, LA, 뉴욕, 덴마크, 싱가포르)
* 기획초대전 및 단체전 610여 회 참가
* 교육경력 및 주요경력
삼육의명대학, 삼육대학교, 추계예술대학교, 백석예술대학교, 전남대학교, 동국대학교 외래교수 역임, 북부교육청 미술영재교육, 강동교육청 미술영재교육, (사)한국미술협회 사무국장, (사)한국미술협회 송파지부장, 송파미술가협회 회장 역임
* 주요심사위원 및 운영위원
한성백제미술대상전 상임추진위원장, 대한민국평화미술대전, 행주미술대전, 심사임당미술대전, 대한민국문화미술대전, 광양미술대전, 충남미술대전, 순천미술대전, 여수바다사생미술제, 호국미술대전, 공무원미술대전 심사위원 등 전국미술대전 운영 및 심사위원 다수
* 주요작품소장:
국립현대미술관(미술은행), 한국불교미술박물관, 묵산미술박물관, 양평군립미술관, 김환기미술관, 전남도립미술관, 서울아산병원, SK 텔레콤 본사, 프랑스 대통령궁, 중국 엔따이 문경대학교, 국립순천대학교, 추계예술대학교, 송파구청, 안산문화예술의전당, 아침편지문화재단, 국민일보, 국방문화연구센터, 로얄스퀘어호텔, 서울동부지방검찰청, ㈜신풍제지, ㈜오알켐, ㈜김천 포도CC, 현대심리학개론 대학교교재 작품수록 출판사 솔과학, KBS, NETFLIX, OBS 등 출연 및 작품협찬, ㈜교학도서(고등학교 미술교과서 작품수록) 외 개인소장 다수
* 현: 전업작가, 국제저작권자협회 회원(©ADAGP), (사)한국미술협회, 송파미술가협회, 누리무리 회원' WHERE name_ko = '김동석' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력
1967년 홍익대학교 서양화 학사
홍익대학교 미술교육대학원 석사
기관 경력
한국판화가협회 회원
대한민국미술대전 심사위원

전시
1978년-2009년, 개인전 (20회)
1960년-1962년, 제1-3회 자유미술전, 중앙공보관
1963년, 김이김 3인전, 중앙공보관
1963년-1966년, 제1-4회 뚜아미전, 중앙공보관
1976년 10월 22일-10월 26일, 판화전, 그로리치화랑
1977년-1978년, 창작미협전, 국립현대미술관
1978년, 미술단체 초대전립전, 국립현대미술관
1978년-1992년, 현대판화가협회전
1978년-1981년, 서울국제판화교류전, 국립현대미술관
2000년 4월 8일-5월 10일, 판화전, 그림갤러리
2000년 6월 12일-6월 25일, 김상구판화전, 김내현화랑
2000년, 한국판화의 전개와 변모, 대전시립미술관
2001년, 한·중·일 목판화전, 김내현화랑
2001년, 아트북, 파리
2001년, 미술의 시작 III, 성곡미술관
2002년, 한국의 현대미술, 아르헨티나
2003년, 서울 북 아트-아트북아트, 국립현대미술관
2004년, A Window to Korea, 중국 상해
2004년, 프린트 14
2005년 3월, 김상구 목판화전, 인사아트센터
2005년 7월 4일-7월 14일, 김상구 목판전, 분도화랑
2007년 출판미술로 본 근현대목판화

수상
1962년-1963년, 제1-2회 신상회 공모전 특선, 장려상
1962년-1965년, 제11-12, 14회 국전 입선
1962년, 제6회 현대작가 초대 공모전 입선
1964년, 제3회 신인예술상전 장려상' WHERE name_ko = '김상구' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '홍익대학교 일반대학원 동양화과 석사 / 졸업

개인전
2022   <사라지는 것들의 아름다움>, 사이아트스페이스, 서울
주요 단체전
2025 <만류귀종>, 아이디어회관, 서울
청년예술인 기획전 <사이 사이 쉼>, 문화실험공간 호수, 서울
4인전 <NO MATTER>, N2아트스페이스, 서울
한겨레 큐레이팅스쿨 3기 선정작가 <사이, 혹은_사이>, 갤러리 일호, 서울
2024 동작아트갤러리 전시기획 공모사업 선정전시 <흔적의 깊이>, 동작아트갤러리, 서울
<동시다발전 Art Alliance>, N2아트스페이스, 서울
신진예술가 공모전시 <고운 기록>, 문화실험공간 호수, 서울
2023 신진작가 기획전 <작가 H의 상점>, 동탄아트스퀘어, 화성시문화재단, 경기도
<동작:확장>, 동작아트갤러리, 동작문화재단, 서울
3인 공모기획전, GS건설 갤러리시선, 서울
<사색 속에는 각자의 소리가 존재하고>, 에이라운지, 서울' WHERE name_ko = '김영서' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '2013 홍익대학교 일반대학원 회화과 석사 졸
2024 홍익대학교 일반대학원 회화과박사 수료

개인전
2016 Pictorial impulse, PiaLuxART갤러리, 서울, 한국
2023 Wildflower seaon1, 홍익대학교 현대미술관, 서울 한국

단체전
2024
서울시 청년작가 신예발굴 프로젝트 비상,세운홀, 서울, 한국
도약의 단초, 탑골미술관, 서울 한국
한국은행 신진 작가전, 한국은행 갤러리,서울, 한국
2021 Space Silmulation, AI Museum x VR Museum, 서울, 한국
2017 Union art pair, 서울, 한국
2016 OLD & NEW, 간송Art & Culture Foundation, 서울, 한국
2016 옥탑사리 전, Alternative space Oktop, 서울, 한국
2014 Flea market+AnotherChrismas, PoscoArt Museum, 서울, 한국
2013 도전, 홍익대학교 Moden Art Museum, 서울, 한국
2012 Close to you, Street Gallery, 서울, 한국
2014 Log Out , Litmus Gallery, 안산, 한국' WHERE name_ko = '김우주' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '현 판화공방 ''판화방'' 대표/ 한국현대판화가협회회원 / 홍익판화가협회회원
전 계원예대, 계원예술학교 출강

개인전
2018 세번째 개인전 ''옳고 그른''전 (문 프래그먼트 갤러리, 서울)
2006 ‘변신 에피소드’전, 선정 기획(대안공간 루프, 서울)
2004  첫 판화 개인전‘왕의 추억’, 초대 기획(청담 맥갤러리, 서울)
2003  김종환 판화집 발간
전공서 출간 2017 더디퍼런스 - 매일판화 처음이어도 괜찮아
단체기획전
2023 홍익판화가전 (토탈미술관, 서울)
2023 오(五) 와 열(熱) 선물전 (갤러리 내맘대로, 수원)
2022 한국현대판화가협회전 ''메타프린트2022'' (홍익대학교현대미술관, 서울)
2021 한국현대판화가협회전 ''포스트프린트2021'' (김희수아트센터아트갤러리, 서울)
2020 원주문화재단10주년 ‘원주미술의 격과 확장성’ 신진작가 5인 초대전(원주치악예술관, 원주)
판화를 이야기하다 (가온갤러리, 인천)
2019 한국현대판화가협회전 (동덕아트갤러리, 서울)
2018 대림창고 14번째 기획전 ''Ctrl V'' 판화5인전 (대림창고갤러리, 서울) /
한국현대판화가협회전 (동덕아트갤러리, 서울)
한국현대판화60년-판화하다 (경기도미술관, 안산)
2017 한국현대판화가협회전 (홍익대학교 현대미술관, 서울)
DMZ페스티벌 (철원, 인제 일대)
2008 서교난장 (KT&G 상상마당, 서울)
2007 서울 미술대전-판화 (서울시립미술관, 서울)
2006  석사청구 ''증후군''전 (홍익대학교 현대미술관, 서울)
현대판화가협회기획  ‘프린트 스펙트럼’전 (갤러리 선, 서울)
AFI 2006 프로그램 ''대안적 미술시장을 위한 모색'' (대안공간 루프, 서울)
한중판화교류전 (홍익대학교 현대미술관, 서울/ 노신대학교, 중국)
광주 비엔날레 열린 아트마켓 (광주시립민속박물관, 광주)
단원 수상작가 초청전 (안산 단원 미술관)
현대판화가협회기획 ‘현대사회를 찍다’전 (국민대학교 미술관, 서울)
2005  한중판화교류전 (노신대학교, 중국 심양)
찾아가는 미술관 (강원 화천 토마토 축제)
한국 현대판화 스웨덴전 (스웨덴, 인플란 미술관)
10주년 나우리 기획전‘[end]=[and]'' (서울 갤러리 올, 강원 원주 문화원)
한일문화교류전 ‘쓰고레미기’ (삼성동 코엑스 태평양홀4관, 서울)
홍익 판화가 협회전 (관훈 갤러리, 서울)
삼청 미술제 (갤러리 도올, 서울)
우수 청년 작가전 (갤러리 가이아, 서울)
인사동 사람들 ‘이상과 현실’전 (하나로 갤러리, 서울)
''Space of Repetition'' (갤러리 숲,3인전, 서울)
HOPE 한일 교류전 (일본 한국 대사관 한국 문화원, 서울)
‘닭의 꿈’기획 선정 작가전 (씽크씽크 어린이 미술관, 서울)
2004 ‘No frame''전 (아트 스페이스 휴, 서울)
2003 마사회+농림부 후원 ‘행복한 식탁’전 (인사아트센타, 2인전, 서울)
워크샵
2024 EBS 협찬 행사 - 실크스크린 워크샵 3회 진행

수상
2005 단원 미술대전 판화부문 ‘최우수상’ (안산 단원 미술관)
행주 미술대전 판화부문 ‘우수상’ (고양시 일산 호수공원)
2004 한국 현대판화 공모전 ‘이상욱상’ (한전 프라자, 서울)

작품소장
대림창고갤러리
아트스페이스 휴
안산외국인산업지원센타' WHERE name_ko = '김종환' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력
1986 서울대학교 대학원 조소과 졸업
1976 서울대학교 미술대학 조소과 졸업

저서
사람사이 출판사 헥사곤 한국현대미술선 003

개인전
2013 가회동 60, 서울 (Steel Drawing)
2012 관훈갤러리, 나무화랑 (사람사이)
2010 가회동 60 (생생풍경)
2012~1986 개인전 12회
기획전
2013 탄생, 미술여행 (양평군립미술관)
조각에 귀를 기울이다 (부평아트센터)
한국 현대미술의 궤적 (서울대학교 미술관)
우리들 이야기 (두원갤러리)
패션풍경 (종로 도시갤러리)
인간 그리고 실존 (김종영미술관)
2012 제2회 인천 평화미술 프로젝트 (인천아트플랫폼)
ADAMAS253 Prologue (아다마스253갤러리, 헤이리)
서촌, 땅속에서 만나다 (아트사이드 갤러리)
인천, 조각을 말하다 (가온갤러리. 인천)
서울 조각회 33회전 (모란미술관, 마석)
스승의 그림자, 제자들의 빛 (김종영미술관)
평화의 바다, 물위의 경계 (인천아트플랫홈)
Christmas in Korea (롯데갤러리, 영등포지점)
Artistic Period (갤러리 인터알리아)
2011 가만히 들이다 (인천아트플랫폼)
Happy together (롯데갤러리, 영등포)
나무조각전 (경북대학교 미술관)
Korean Art Today (호주 시드니 한국문화원)
분쟁의 바다, 화해의 바다 (인천아트플랫폼)
생활의 발견 (부평아트센터)
빌라다아르와 예술가들 (토포하우스)
2010 우리들 사는 이야기 (롯데갤러리, 대전)
인터_뷰 (인천아트플랫폼)
혜화동인전 (청아갤러리)
서울조각회 30주년 기념전 (서울아트센터)
오, 해피데이 (롯데갤러리, 안양지점)
2009 牛步萬里 (신세계갤러리)
해치 퍼레이드 (서울 도시갤러리 프로젝트 2009)
Love is rainbow (롯데갤러리)
서울조각회 30주년- 그 서른의 여로 (공평아트센터)
작품 소장
국립현대미술관, 경기도 과천
대전시립미술관, 대전
소마미술관, 서울
모란미술관, 경기도 남양주
국립민속박물관, 서울
인천아트플랫폼, 인천
김포국제조각공원, 경기도 김포
직지문화공원, 경상북도 김천
인천문화재단 미술은행, 인천

레지던시
2013 인천아트플랫폼 레지던시 프로그램 4기 입주작가, 인천' WHERE name_ko = '김주호' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '성신여자대학교 서양화과 졸업
홍익대학교 미술대학원 회화과 졸업

개인전(갤러리12회 총36회)
아트스페이스H,갤러리두,스페이스엄,갤러리탐,대안공간눈,그림손갤러리 등

단체전 185회
서울옥션,화랑미술제, 국회의사당, 63빌딩 스카이 아트뮤지엄, 세종문화회관 등
아트페어 화랑미술제 서울아트쇼 부산국제아트페어 아트아시아 뱅크아트페어  얼반브레이크 대구아트페어 아시아프  국제공예아트페어 롯데호텔아트페어 등
기타경력 국립현대미술관 작품소장, 서울시립미술관 SeMA선정작가,
키미아트 선정작가, 카니발피자 아트상품 콜라보레이션,
마을미술 프로젝트-마음으로 보는 미술 선정작가,
네이버프로젝트꽃 createrday4 선정작가' WHERE name_ko = '김주희' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '1955 전남 영암 출생
1982 홍익대학교 졸업(서양화)
1994~1997 중국 루쉰(魯迅) 미술대학 목판화 연구원 / 객원교수
1996~ 중국 루쉰(魯迅) 미술대학 명예 부교수
2017~ 한국 목판문화원 원장, 커뮤니티 목판대학
2022 우석대 공공정책대학원 객원교수

개인전 (최근)
2024
김준권 木版畫展 어머니의 땅을 걷다. (서울 아르떼 숲)
김준권 木版畫展 백두대간에 서다. (영암 하정웅 미술관)
김준권 木版畫展 백두대간에 스미다. (청주 충남대 대통령기록관 기획전시실)
2022~2023
KIM JOON KWON WALKING THE MOTHERLAND 김준권 목판화전 (진천 생거판화미술관)
2022
1985~2022 김준권 목판화 ― 칼의 노래, 판의 노래, 삶의 노래 (김해문화의전당 윤슬미술관)
김준권 목판화전 「산의 노래」전 (서울 예술의 전당)
2021
푸른 산 빛 깨치고… 김준권 목판전 (서울 / 나무화랑)
주요 단체전 (최근)
2024
제4회 목판대학展 (서울 나무화랑)
21세기 동시대 미술 in 부산 (부산진여사 전시장)
동학혁명 130주년 기념전 “세상을 위하여” (광주 동곡미술관)
동학혁명 130주년 기념 “特天與民”전 (광주 시립미술관)
세계혁명예술 (전주 완산도서관)
제10회 실크로드 국제예술제 (중국 시안 산시성 미술박물관)
2023
새로운 시작 - 네오아트 갤러리 개관초대전 (충북 청주)
주요 작품 소장처
국내
국립현대미술관, 정부미술은행, 서울시립미술관, 제주현대미술관, 광주시립미술관, 청주시립미술관,
영암 하정웅미술관, 대한민국 국회(기증) 등
해외
중국미술관, 중국 판화박물관, 루쉰(魯迅)대 미술관 등' WHERE name_ko = '김준권' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = 'Solo Exhibition
2025 <들풀은 아무렇게나 자란다>, 리각미술관, 천안, 한국
2025 <이것은 전시가 아니다>, N2 ART SPACE, 서울, 한국
2023 <시간의 표면>, CICA미술관, 경기, 한국

Group Exhibition
2024 <운명적 데이터>, 버징가, 강릉, 한국
2024 동강사진축제 국제공모전, 동강사진박물관, 영월, 한국
2024 <적막>, 한지가헌, 서울, 한국
2024. KTX20주년 전시 <여정 그 너머>, 문화역284, 서울, 한국
2023. <계단위의 관찰자>, 메타포32, 서울, 한국
2022 퍼플마블, 로얄엑스 갤러리, 화성, 한국
2018 <New york new york new york>, Art Space J, 경기, 한국
2017 <아시아프2017>, DDP, 서울, 한국
2016 <Hello Media Art>, kt 상상마당, 서울, 한국
2016 <Seen vs Shown>, 워싱턴 한국 문화원. 워싱턴, 미국
2016 <제1회 K-foto festival BUFF>, BEXCO, 부산, 한국
2016 <.JPG>, 지금 여기, 서울, 한국
2015 <남송 미디어아트 페스티벌>, 성남 아트센터 미술관, 경기, 한국
2014 <U-Street 미디어아트전>. 강남역 미디어폴, 서울, 한국
2013 <애니마믹 비엔날레>, 대구미술관, 대구, 한국
2013 <내가 그린 다른 그림전>, 서울미술관, 서울, 한국
2013 <세계의 스타전>, 예술의전당 한가람미술관, 서울, 한국
2012 <제9회 부산국제비디오아트페스티벌>, 부산시립미술관, 부산, 한국
2012 <기억의 정치>, 자하미술관, 서울, 한국
2012 <대구 국제사진 비엔날레 젊은 작가전>, 봉산문화회관, 대구, 한국
2011 <신세대 아트스타전>, 예술의전당 한가람미술관, 서울, 한국' WHERE name_ko = '김호성' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '개인전
2021 휘어진 세계로부터 갤러리 브레송, 서울 외 다수
2019 사건 으로부터, 로부터 갤러리구피, 서울
2019 사진은 세계를 만지고 포토그래퍼스 갤러리 코리아, 서울
2019 TOUCH 갤러리 브레송, 서울
2018 이미지의 귀환 third story IMAGE2IMAGE 공간더인 공간더인, 서울
2015 CONTACT 포토그래퍼스 갤러리 코리아, 서울
2013 IMAGE2IMAGE2 갤러리 유키, 도쿄 일본
2012 IMAGE2IMAGE 갤러리 유키, 서울
2009 낯선 하루 공간 루, 서울

단체전
2022 본질에 대하여 홍천 미술관, 홍천
2022 GRAPHOS 비움 갤러리, 서울
2022 인천개항장 국제사진영상페스티벌 한국작가 15인전 화교역사관, 인천 2022 TANGLED COSMOS 메탈하우스 갤러리, 양평
2022 Neo-orbis_新世界 홍천 미술관, 홍천
2022 Contemporary Korea Photography 김영섭사진화랑, 서울
2021 날씨의 맛 갤러리 브레송, 서울
2021 바라보다3-다시보다 갤러리 아지트, 서울
2021 환경전시: To The Negentropia 충무로 갤러리, 서울
2020 Seoul in my mind 금산 갤러리, 서울
2020 관계하다 비움 갤러리, 서울
2020 확장된 감각 와이아트 갤러리, 서울
2019 포스트 포토 토포 하우스, 서울
2019 On Photography 갤러리 브레송, 서울
2018 고양이 아미미술관, 당진 충남
2018 D cut Image for Yourself 아트스페이스엣, 서울
2018 경계해체, 사진과 회화의 경계 에코락 갤러리, 서울
2017 경계해체II 사진과 회화의 경계 에코락 갤러리, 서울
2012 Let''s Play Space Radio M, 서울
2011 사진,,,매체로서의 예술 스페이스 이노, 서울
2011 회사원전 작은공간 이소, 대구

출판
2019 <TOUCH> 나미브 출판사
2019 <On Photography> 눈빛 출판사 p37~43' WHERE name_ko = '라인석' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력
1984년 홍익대학교 미술대학 회화과 학사
기관 경력
1985년 서울미술공동체 대표
1987년 걸게그림패 활화산 회원
1991년 민족미술협의회 사무국장
1992년 한국민족예술인총연합 대외협력국장
1995년-1998년 한겨레 문화센터 목판화 강사
2004년-2006년 안성천살리기 시민모임 공동대표
2004년- 푸른안성맞춤21, 공동의장

전시
1983년, 류연복, 박종원, 신진식, 제3미술관
1984년, 삶의 미술전, 제3미술관, 관훈미술관, 아랍미술관
1985년, 을축년 미술대동잔치, 아랍미술관
1985년, 80년대 민족미술대표작품전, 하나로미술관
1985년, 한국미술 20대의 힘전, 아랍미술관
1986년, 젊은 세대에 의한 신선한 발언전, 그림마당민
1986년, 한국민중판화전, 오사카
1986년, JALLA전-민중의 아시아전, 동경
1986년-1990년, 통일전, 그림마당민
1987년, 풍자와 해학전, 그림마당민
1987년, 반고문전, 그림마당민
1987년, 한국민중판화전, 그림마당민
1988년, 한국민중판화전, 서울, 전주, 런던
1988년, JALLA전-아세아에 부는 바람, 동경
1988년, 한국민중미술전, 히라까다
1988년, 한국민중판화모음전, 그림마당민
1989년, 류연복 민중판화전, SPARC Gallery, LACC대학교, 시카고 한겨레지사
1989년, 민중판화전, 미국
1990년, 교육현장전, 그림마당민
1990년, 농민미술전, 연세대학교백양로
1990년, 광주여, 오월이여!, 그림마당민
2000년, 류연복의 생명전, 공평아트센터, 아트센터마노
2003년, 봉천동 나눔의집-함께 하는 세상 건립기금마련전
2004년, 류연복-딛고 선 땅전, 인사아트센터
2004년, 류연복의 목판화전, 안성시민회관
2004년, 미주이민 100주년 기념 판화초대 귀국전-한국의 숨결(The Breath of Korea), 복사골문화센터 복사골갤러리
2004년, 나무에 그림을 그리는 사람들, 경기문화재단전시실
2004년, 엄뫼, 모악전, 전북도립미술관
2005년, Red Blossom : 동북아 3국 현대목판화 특별전-한국의 고판화, 일민미술관
2005년, 예술과 만나러 우린 안성에 간다, 대안미술공간 소나무
2007년, 존재를 깨우는 정신의 힘, 가평 가일미술관
2009년, 개인전, 자인제노갤러리' WHERE name_ko = '류연복' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '2022 홍익대학교대학원동양화과박사재학중
2022 홍익대학교대학원동양화과석사졸업
2020 성신여자대학교미술대학동양화과졸업
주요단체전
2025 <만류귀종>, 플로우앤비트, 서울
<NO MATTER>, N2 아트스페이스, 서울
2024<관계전환지점>, 갤러리호호, 서울
<꿈과마주치다展>, 갤러리일호, 서울
<Landscape Liberation>, 갤러리자유, 서울
2023 <사색속에는각자의소리가존재하고>, 에이라운지갤러리, 서울
<Greekyland 이상한나라의괴짜들2023>, K현대미술관,서울
<연말동시단체전Art Alliance 2023>, 갤러리모스, 서울
<현대미술과 세종의 만남–세종이야기미디어전시>, 광화문광장, 서울
2022<갤러리시선2인공모기획전>, GS건설갤러리시선, 서울
아트페어
2024 <2024 인사동YOUNG & FUTURE Art Fair>, 인사센트럴뮤지엄, 서울
2023 <BAMA 부산국제화랑아트페어>, 벡스코, 부산
2022 <FOCUS ART FAIR PARIS -Art Boom>, Carrousel du Louvre, 프랑스

개인전
2022<보이지않는프로젝트>, 사이아트도큐먼트, 서울' WHERE name_ko = '리호' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력:
2010 석사, School of the Art Institute of Chicago, Printmedia, 미국
2002 학사, 홍익대학교, 판화과

수상경력:
2025 화랑미술제 Zoom-In 작가 선정, 사단법인 한국화랑협회, 서울
2018 소마미술관 드로잉센터 작가 선정, 서울
2017 뉴디스코스, 우수상, 사이아트미술연구소
2010 “Nippon steel competition/U.S.A” presidential award, 시카고, 미국
2009 The Korean Honor Scholarship, 주미 한국 대사관
2009 Thomas Baron scholarship, Ox-Bow School of Art, 미국
2009 청주국제공예비엔날레 입선, 청주
2009 Steve S. Kang Young Artist and Scholarships, 미국
2009 “Nippon steel competition/U.S.A” presidential award, 시카고, 미국
2008 “Nippon steel competition/U.S.A” presidential award, 시카고, 미국
2007 The Fine Art Finals Scholarship, Finalist, Mid-West, 미국

레지던시:
2021 청주미술창작스튜디오, 청주
2019 대구예술발전소, 대구
2016 영은미술관, 경기도
2016 Global Painting retreat, ChangJung University, 대만
2013 고양창작스튜디오, 국립현대미술관
2011 Frans Masereel Centrum, 벨기에
2010 Andover Newton Theological School, 보스톤, 미국

소장처:
2019 "Rain”(2010), Purdue University, 인디애나, 미국
2018 드로잉 포트폴리오, 소마미술관, 서울
2016 "Plastic Square" (2016), 영은미술관, 경기도
2016 “Resistance” 2작품 시리즈 (2014), 영은미술관, 경기도
2016 “5x7_Crazy about" 어린이와 작가 1:1협업프로젝트(2016), Artist book, 현대어린이책미술관, 경기도
2014 “Plastic Green” (2013) 공간291, 서울
2011 “Rain” (2011), Frans Masereel Centrum, 벨기에
2011 “if “U’ don’t understand me…” 9작품 시리즈 중 2작품 (2011), Frans Masereel Centrum, 벨기에
2011 “Do NOT ENTER” (2011), Frans Masereel Centrum, 벨기에
2010 “I said too much last night”(2010) John Flaxman Artist Book Collection, 시카고, 미국
2010 “Dithering” (2010) John Flaxman Artist Book Collection, 시카고, 미국

개인전:
2026 기억의 표상, 갤러리너트, 서울
2025 빛자국_반복, 갤러리다선, 경기
2024 빛 이후 표상, 서초문화재단 서리풀휴갤러리, 서울
2023 얇고판판한 상, 미사장갤러리, 서울
2022 Plasticated Transparency, 아트숨비, 서울
2021 Green gables happening, 청주미술창작스튜디오, 청주
2020 Green gables, ART SPACE IN, 인천국립대학교, 인천
2017 내가너를보다, 사이아트갤러리, 서울
2016 Plastic Promise, 영은미술관, 경기도, 용인문화재단, 광주시 후원, 경기
2016 웅크림돌을던지다, 청주시립 대청호미술관, 청주시 후원, 청주
2015 Plastic Society II, 대안공간눈, 수원
2014 Plastic Society I, 갤러리AG, 서울문화예술재단, 한국메세나, 안국약품, 낙원상가 후원, 서울
2014 Plastic Green, 공간291, 서울
2010 My One False Image-Plasticated Falsity, Gallery X , 시카고, 미국
2009 Plastic Beauty, Base Space, 시카고, 미국
주요 단체전:
2025 Kiaf 2025, 코엑스홀, 서울
2025 더드로잉, 소마미술관, 서울
2025 감정의채도, 갤러리다선, 경기
2025 화랑미술제_Zoom In 선정 특별전, 코엑스홀, 서울
2025 꿈과마주치다, 갤러리일호, 서울
2024 피어영상제, 피어컨템포러리, 서울
2022 앤더믹 업사이클, 광명아트센터, 경기
2022 Pexma2022_모험적출발, 피어컨템포러리, 서울
2021 내일전_Drag and Draw, 소마미술관, 서울
2021 예술과 기술의 만남, 갤러리박영, 경기
2021 낯선도시도착한사람들, 청주미술창작스튜디오, 청주
2020 영은지기, 영은미술관, 경기
2020 Goldcan Art Plan, 돈의문 박물관 서궁갤러리카페, 서울
2020 “이광기의온오프라인아트쇼” 영상3점, 유투브, 네이버TV, 아트경기& 스튜디오끼, 서울
2020 교차된시선, 대구예술발전소, 대구
2019 Editable_첨삭가능한, 수창청춘맨숀, 대구
2019 Young Korean Artists, Purdue University, 주미한국대사관 후원, 인디애나, 미국
2019 Cityscape, CICA Museum,경기
2018 Square, CICA Museum, 경기
2018 예술하라, 팔레드서울, 문화체육관광부후원, 서울
2017 조춘점묘, 경의선 책거리, 한국제지후원, 서울
2016 Empowerment, ChangJung University, 대만
2015 쓸모 없지만 쓸모 있는, 오산시립미술관, 아모레퍼시픽 후원, 경기
2015 사물이색 전, 경남도립미술관, 창원, 경남
2014 지속 가능한 도시-꽃Ⅱ, 에픽갤러리, 생태 미학 연구소 주최, 대전
2013 Once Upon A Time, Viridian Artists, 뉴욕, 미국
2013 지속 가능한 도시-꽃, 스페이스씨, 생태미학연구소 주최, 대전 문화재단 후원
2013 5mmX7, 아티스트 북 전시회, 고양창작스튜디오, 국립현대미술관 주최, 경기
2013 동종업계, 여인숙갤러리, 군산, 전북
2013 Fluxus Weather Forecast, 고양창작스튜디오, 국립현대미술관 주최, 경기
2013 우문현답, 쿤스트독 , 서울
2011 Community Show, Andover Newton Theological School, 보스톤' WHERE name_ko = '민정See' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력
전남대학교 예술대학 미술학과 졸업
동 대학원 미술학과(서양화 전공) 석사 졸업

개인전
2024 촛불광장에서 만난 사람들, 갤러리생각상자, 광주
2023 박성완 개인전, 김냇과갤러리, 광주
2023 스튜디오 더 탐사, 촛불갤러리, 남양주
2022 바람 밖의 풍경, 북구문화센터, 광주
2021 5월로 가는 4월, 전남대학교 용지관, 광주
2021 박성완전, 첨단보훈병원, 광주
2020 빛 그리고 마음의 고향-일상이상, 해동문화예술촌, 담양
2019 바다개구리, 소촌아트팩토리, 광주
2018 도시의 낯선 기억, 515갤러리, 광주
2018 박성완 초대전, 장수미술관, 장수 / Art G&G, 대구
2018 양심발산, 뽕뽕브릿지, 광주
2018 영아티스트 초대전, 소암미술관, 광주
2017 뜻밖의 일상, 롯데갤러리, 광주
2017 From Berlin to Georgetown, 차이나하우스, 페낭, 말레이시아
2017 Tru Blue, 달뫼미술관, 담양
2015 공사장 일기, 금호갤러리, 광주
2015 양심발산, 뽕뽕브릿지, 광주
2015 Under Construction, 스페이스K, 광주
2014 박성완 초대전, 커피볶는집 마루, 광주
2013 동네한바퀴, 로터스갤러리, 광주
2012 공사장 그림일기, 아시아문화마루, 광주
2012 풍경이多, 갤러리 생각상자, 광주

단체전
2025 망치는 아크릴, 갤러리B, 서울
2024 모두가 평등한 세상을 위하여, 동곡미술관, 광주
2024 오월미술제, 시민갤러리, 광주
2024 서로 엮은 이야기, 사키마미술관
2024 기후가 이상해, 연남장, 서울
2023 오월전, 무등갤러리, 광주
2023 정전협정30주년전, 은암미술관, 광주
2022 디어마이광주-미술장터, 신세계갤러리, 광주
2022 기후정의, 가톨릭평생교육원, 광주
2022 도시의 경계와 균열, 이강하미술관, 광주
2022 담양아트위크-유유자적, 다미담예술구, 담양
2021 남도 구상화단의 맥, 무안군오승우미술관
2021 청죽예찬, 담빛예술창고, 담양
2021 한중교류전-공간의 재해석과 확장, 담빛예술창고, 담양
2021 예술이 된 노무현, 오월미술관, 광주
2020 DEEP DIVE INTO YOU, 금호갤러리, 광주
2020 5‧18 40주년 오월미술제-우리가 그곳에 있었다, 오월미술관, 광주
2020 무등길 예술산책, 국윤미술관, 광주
2019 박제된 기억, 은암미술관, 광주
2019 시네마 광주- Into the memory, 롯데갤러리, 광주
2019 Contemporary Art in Namdo, 담빛예술창고, 담양
2019 빛고을 어재와 오늘, 예술공간집, 광주
2019 살아 있는 도시, 삶의 예술, 해동문화예술촌, 담양
2018 100인의 미술전, 광주시립미술관 금남로분관
2018 한불국제미술교류전-이음, 은암미술관, 광주
2018 아트광주18, 김대중컨벤션센터, 광주
2018 우리동네 겨울이야기, 롯데갤러리, 광주
2017 한국 태국 현대미술전, 실팟껀대학미술관·아터리갤러리, 태국
2016 RIVERS 전환적 삶의 방식-아시아현대미술연대, 광주시립미술관
2016 청춘예찬 5인전, 515갤러리, 광주
2016 Prologue, 페낭, 말레이시아
2015 김환기국제미술전, 김환기생가, 신안 안좌도
2014 신춘정담, 롯데갤러리, 광주
2014 아시아의 눈, 백민미술관, 보성
2014 KATALISTA, 바콜로드 라살라대학 갤러리, 필리핀
2013 플랫폼창고세일, 아트플랫폼, 인천
2013 우리시대의 열정, 백민미술관, 보성
2013 미감, 롯데갤러리, 광주
2012 시대영웅, 무안군오승우미술관
2012 청년작가지원전, 대동갤러리, 광주
2012 봄 도다리, 도화헌미술관, 고흥
2012 개화 속의 세가지 빛, 우제길미술관, 광주
2012 크리티컬 포인트, 스페이스K, 광주
2012 채러티바자, 스페이스K, 서울
2012 V-Party Vol 3, 슐츠&융 갤러리, 광주
2011 공평아트페어, 공평아트센터, 서울
2011 아牙될성부른, 학명미술관, 강진
2011 Art Process, 무등현대미술관, 광주
2011 V-Party Vol 2, 갤러리D, 광주
2010 창작스튜디오 입주작가전, 대동갤러리, 광주
2010 젊은 시선, 롯데갤러리, 광주
2010 제8회 광주비엔날레 만인보, 비엔날레전시관, 광주
2010 Hue, 천안시민문화여성학교

레지던시
2020 홍림창작스튜디오 입주작가
2012 말리홈 레지던시, 페낭, 말레이시아

수상
2012 어등미술제 대상' WHERE name_ko = '박성완' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '초대 개인전
2025  초대 개인전:과거의 파편과 미래의 조각이 스쳐 지나가는 그날을 기록하다, 갤러리 청풍, 강릉, 대한민국
초대 그룹전
2025 Future Yarning, Piano Craft Gallery, 보스턴, 미국
2025 Boundary and Beyond, Arts Collaborative Medford, MA, 미국
2025 Information overload, 808 Commonwealth gallery, 보스턴, 미국
2025 Urban Resistance, Arise Artspace, 부산, 대한민국
2024 Changing tides, Hopkinton Center for the Art, 매사추세츠, 미국
2024 Digital Soup residency at Fountain street art Sidewalk gallery, 보스턴, 미국
2023 Digital Soup residency at Cyber Art Gallery, 보스턴, 미국
2023 Water, Ancient Greek philosophy and in Western alchemy,LaguanaART.com Gallery, Mission Viejo, 캘리포니아, 미국
2023 Boston MFA Mixer, Nancy and Edward Roberts Gallery,Lesely UniversityCollege of Art and Design, 보스턴, 미국
2022 What''s Next:Perspectives, Micro to Macro, Emerson College Media Art Gallery, 보스턴, 미국
2022 Unfolding, Behind VS Shadow, 보스턴, 미국
2022 Burning Man Decompression, Knockdown Center, 뉴욕, 미국
2022 Banging the Door, Piano Craft Gallery, 보스턴, 미국
2021 “God of Water”, Bower Union, 뉴욕, 미국' WHERE name_ko = '박소형' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력
- 2016 무사시노 미술대학 ( Musashino Art University ) 유화학과 유화 전공

개인전
- 2025 갤러리 충장 22 초대전 < refresh Gwangju >
- 2025 도화헌 미술관 초대전 < refresh Goheung >
- 2024 갤러리 177 초대전 < refresh Busan >
- 2024 노을 아티잔 센터 초대전 < refresh Seoul >
- 2024 설미재 미술관 초대전 < refresh >
- 2020 아트 스페이스 앳 개인전 < 어흥전 >
- 2017 THE PLOT GALLERY 초대전 <그림이 싱싱해>
- 2017 BANKAN encore 초대전 ( Japan )
- 2015 BANKAN 초대전 ( Japan )

단체전
- 2024 N2 아트스페이스 단체전 < 동시다발전 >
- 2023 아리수 갤러리 단체전 < 아낌없이 주는 나무 >
- 2016 롯폰기 국립 신 미술관 5대 미술전 ( Japan )
- 2016 Musashino Art University graduation exhibit ( Japan )
작품 소장
- 2025 도화헌 미술관 / 작품명 : 블랙홀
강의
- 2018 세종과학예술영재학교 특별강연 [ 무의식해석하기 ]
- 2024 세종과학예술영재학교 특별강연 [ 무의식해석하기 ]' WHERE name_ko = '박수지' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력
2024. 03 -   Ph.D. Candidate 국민대학교 테크노디자인전문대학원 AI디자인 랩 박사과정
2015. 03 - 2025. 08. 22 Ph. D. in Fine Arts 홍익대학교 일반대학원 회화과 박사
2013. 03 - 2015. 02  M.F.A 홍익대학교 일반대학원 회화과 석사
2007. 09 - 2010. 06  B.F.A. / DNAP L’ECOLE SUPERIEURE D’ART ET DESIGN LE HAVRE-ROUEN, FRANCE , 순수미술전공(2010. 06 / Bachelor)

개인전
2024. 05. 28 - 06. 03  ‘시각적대화'' 홍익대학교 현대미술관 , 서울
2015. 06. 03 - 06. 05  아트앤 라이프쇼 / aT센터(양재) 제 1전시관
2014. 10.28 - 11. 02.  ''Passing'' 아트서울 / 예술의 전당 한가람 미술관, 서울
2014. 09  석사학위청구전 / 홍익대학교 현대미술관, 서울
2014. 05.29 - 06.02  ‘Passage’ 갤러리 세븐 / 페인팅, 예술의 전당 한가람미술관, 서울
2013. 12. 13 - 12. 22  ‘Passing’ 갤러리 세븐 / 페인팅, 예술의 전당 한가람미술관, 서울
2013. 06  ‘아트서울’/ 페인팅, 예술의 전당 한가람미술관, 서울
2010. 02. 06 / 2009. 02. 06 / 2008. 02. 06  (페인팅, 설치, 영상) ESAH Gallery, 프랑스
그룹전
2025.11.21 - 11.29 Reloaded, 답십리아트랩, 한국미디어아트협회, 서울
2024. 10.23 - 10. 28 아시아청년작가전(80인), 세종문화회관, 광화문국제아트 페스티벌, 서울
2024. 09. 01 - 09.12  헤럴드 아케이드 15(12인),  헤럴드옥션, 서울
2023. 11.1 - 11.8 하남 프린지 아트 페어(60인), 하남문화재단
2014. 10. 패스포트 / 대전MBC M-Gallery, 대전 MBC
2013. 09  14th GPS ‘도’전 / 페인팅, 홍익대학교 현대미술관, 서울
2012. 11  알파청년작가전 / 페인팅
2011. 11 ‘Fall in love’ / 디지털프린트, 산토리니 갤러리, 서울
2010. 04 - 06 ‘Art and Nature’ / 설치, Jardin suspendu au Havre, 프랑스
2009. 04 ‘Bouger’ / 디지털프린트, Theater France, 프랑스
2009. 11 - 2010. 04  워크숍 ‘Art, Architecture with nature’ - Jean Louis' WHERE name_ko = '박지혜' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '노리갤러리 3인전(2014), 한국수채화협회전(2010~2018), 백금아 개인전(), 제주신화전(2023~25), 예술인협동조합전(2024~25) 외 다수' WHERE name_ko = '백금아' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학 력
숙명여자대학교 회화과 졸업
숙명여자대학교 대학원 조형예술학과 졸업

개인전
2025 <기억의 밀도>, 갤러리초대전, 아트스페이스J, 분당
2025 <서금앵전>, 갤러리일호, 서울
2024 <공간의 기운>, 공모전, 중랑아트센터 한평갤러리, 서울
2023 <평범한 하루의 역설>, 알로초대전, 광화문쌀롱, 서울
2023 <공간의 기운>, 이랜드 기획전, 켄싱턴리조트 갤러리, 제주
2022 <공모작가선정전>, 이랜드 스페이스, 서울
2022 <머물다 시선>, 이랜드 기획전, 구로NC 백화점, 서울
2020 <일상을 바라보다>, 초대전, 샘표 스페이스, 이천
2018 <서금앵 초대전>, GS타워 더스트릿 갤러리, 서울
2016 <흔적, 머물다>, 에이컴퍼니 기획, 휴맥스 빌리지, 분당
2011 <공간에 마음을 놓다>, 갤러리 공모전, 갤러리 도올, 서울
2010 <신진작가 공모전>, 토포하우스, 서울
2008 <Rooms>, 이형아트센터, 서울
그룹전
2025 <ASYAAF 아시아 대학생·청년작가 미술제>, 문화역서울 284, 서울
2025 <꿈과 마주치다전>, 공모전, 갤러리 일호, 서울
2024 <기억의 파도>, 세월호참사10주기추모전, 근현대사미술관담다, 용인
2024 <제1회 창작 컴퍼런스 기념전>, 이랜드문화재단, 이랜드스페이스, 서울
2022 <K-Auction 프리미엄 온라인경매 프리뷰 전>, 케이옥션 아트타워, 서울
2021 <매끈한 것과 홈이 패인 것>, 공갤러리카페, 일산
2021 <K-Auction 프리미엄 온라인경매 프리뷰 전>, 케이옥션 아트타워, 서울
2021 <신진작가 공간 지원전>, 유나이티드 갤러리, 서울
2020 <다, 다른 그림전>, 아트스페이스H, 서울
2019 <미디어젠 작은 그림전>, 아트스페이스H, 서울
2019 <브리즈 아트페어>, 노들섬, 서울
2019 <LOCAL PRIDE>, 공셸 기획, 서촌 카페거리, 서울
2018 <브리즈 아트페어>, 세종문화회관 미술관, 서울
2018 <광화문 국제 아트 페스티벌>, 세종문화회관 미술관, 서울
2017 <ASYAAF 아시아 대학생·청년작가 미술제>, 동대문디자인플라자_DDP, 서울
2017 <대림창고X미나리 하우스>, 대림창고 갤러리 컬럼, 서울
2016 <브리즈아트페어>, 블루스퀘어 NEMO, 서울
2015 <숙명여자대학교 창학110주년 동문전>, 문신미술관, 서울
2015 <브리즈아트페어> 서울혁신파크, 서울
2014 <ASYAAF 아시아 대학생·청년작가 미술제>, 문화역서울 284, 서울
2011 <ASYAAF 아시아 대학생·청년작가 미술제>, 홍익대학교, 서울
2010 <ASYAAF 아시아 대학생·청년작가 미술제>, 성신여자대학교, 서울
2010 <夏夏夏, 숙명여대 서양화 동문전>, 인사아트센터, 서울
2010 <Breathing House Project''>, 갤러리기획전, 키미아트, 서울
2010 <ARCK U.S. Tour Exhibit-Ⅱ>, Tacoma, Washington, U.S.A.
2009 <Behind SPACE>, 갤러리기획전, 이엠아트 갤러리, 서울
2009 <옥션별&하나은행 Gold Club 공동기획전>, 도곡타워 하나은행PB센터, 서울
2009 <ASYAAF 아시아 대학생·청년작가 미술제> 옛 기무사, 서울
2009 <ARCK U.S. Tour Exhibit-I gallery HOMELAND>, portland, U.S.A.
2009 <마음이 움직이다, 숙명여대 서양화 동문전>, 인사아트센터, 서울
2009 <Seoul Auction 4호 경매 Preview>, 신세계 갤러리 서울, 부산
2008 <EVERYDAY LIFE>, 갤러리기획전, 갤러리 샘, 부산
2008 <ASYAAF 아시아 대학생·청년작가 미술제>, 옛 서울역사, 서울
2008 <현상과 환상전>, 갤러리기획전, AKA SEOUL gallery, 서울
2008 <아트로드 페스티벌 부스전>, 센트럴시티, 서울
2008 <Intro 회화전>, 세종문화회관 별관, 서울
2007 <KPAM pet 매니아전>, 한가람 미술관, 서울
2007 <studio_UNIT OPEN STUDIO>, gallery HUT, KT art hall, 서울
2007 <제18,19회 컨테이너&재원전>, 청파 갤러리, 서울
수 상
2009 ART CONNECTION KOREA 제1회 신진작가 최우수
2008 대한민국현대미술대전 입선 (홍대 디자인 센터)
2007 대한민국회화대전 서양화 특선 (서울시립미술관 분관)
2007 숙명여자대학교 최우수 졸업 작품상 (청파 갤러리)
2005 세계평화미술대전 서양화 입선 (안산 단원 미술관)
소 장
국립현대미술관 미술은행, ㈜이랜드 문화재단,
㈜에이컴퍼니, ㈜에이피씨웍스<월간한옥> 외 다수 개인소장' WHERE name_ko = '서금앵' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력
이화여자대학교 미술대학 서양화과 졸업
홍익대학교 산업미술대학원 사진디자인 전공 석사

전시 경력
2024 그 집에 산다, 갤러리 브레송, 서울
2024 기억의 집 초대전, 예술곳간, 청주 외 개인전 13회
2024 그라운드 서학, 전주 아트갤러리, 전주
2024 마음의 집, 송파구 예송미술관, 서울 외 단체전 31회

출판
2020 밤의 집 The Houses at Night, 눈빛
2021 밤의 집 The Houses at Night, 나미브

수상
2022 BELT 2022 판화사진 공모 작가 사진부문 선정
2021 제2회 FNK Photography Award 예술사진부문 당선
2018 서울시청 하늘광장 갤러리 작가 공모당선' WHERE name_ko = '손은영' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '영남대학교 서양화전공 석사

개인전24회 2025. K-POP ART 송광연전, PAC 갤러리 개관 기획 초대전, 진주
2025. 나비의 꿈-송광연, 갤러리 썬 초대전, 서울
2025. 나비의 꿈-송광연, (울산문화재단 울산예술지원 선정사업, 20/ 22/ 24/ 25년), 울산
2024. 나비의 꿈-송광연, BNK경남은행 본점 아트갤러리 초대전, 창원
2019. 송광연 초대전, 울주문화예술회관, 울산
2018. 나비의 꿈-송광연, DGB 갤러리(갤러리 G&G 기획,대구은행 제2본점)초대전, 대구
2016. 나비의 꿈-송광연전, 아트허브 온라인 갤러리 초대전
2015. 나비의 꿈-송광연, 칠곡경북대학교 병원 힐링갤러리 초대전, 대구
2014. 나비의 꿈-송광연, 갤러리 청담 초대전, 대구
2010. 나비의 꿈-송광연, 갤러리 H 초대전, 현대백화점울산점
2010. 나비의 꿈,송광연 초대전, 동원화랑, 대구
2008. 맥향화랑개관32주년 송광연 초대전, 맥향화랑, 대구
솔로 부스전 2017. START 2017 (솔로부스 작가로 선정), 사치 갤러리, 런던, 영국

개인전 2016. POP of KOLOR (Kyungjoo Park & Kwangyeon Song), 주미 한국대사관 한국문화원 초대전, 워싱턴DC, 미국
2인전 2021. 전통의 미학속으로, 2인 초대 기획전 임상진̛송광연, 갤러리 무아, 부산
3인전 2017. 온고지신, 한중3인전, 주상해 한국문화원,상해 향강화랑 주관 초대전, 주상하이 한국 문화원, 중국
기획전60여회 無窮 畵, 꽃이 피었습니다, 천안시립미술관, 천안
Wow~! Funny Pop, 경남도립미술관, 창원
어느 정도 예술공동체: 부기우기 미술관, 울산시립미술관
True Luxury with ART (StART Art Fair Seoul 2022 Preview),그랜드 인터컨티넨탈 서울 파르나스
STEP-UP: MOMENTUM, 리나갤러리, 서울
마릴린 먼로와 코리안 팝아트(신세계센텀시티 그랜드오픈 기념 특별전 및 신세 계 순회전시, 부산, 서울, 광주)
행복을 부르는 그림(세종문화회관기획), 북 서울 꿈의 숲 아트센터
Art & Joy (박영덕화랑/인사갤러리주관), 인사갤러리, 서울
울산예술의 힘, 울산중견작가 25인 초대전, 울산 문화예술회관
블루닷아시아 , 예술의 전당 한가람 미술관, 서울
한국의 팝아트, 인사미술제, 서울
시간여행전, 아트파크갤러리, 서울
미인화전, 인사갤러리, 서울
확, 눈, 떠, 블루닷엠갤러리 개관전, 창원
철학을 입은 미술가들, 금강 미술관, 창원
미학패러독스, 남가람박물관, 진주
Colores de Corea, 주 스페인 한국 문화원 기획 4인전, 마드리드, 스페인
아트페어: 스타트 아트페어(런던 사치갤러리), 아트 싱가포르, 아트 베이징, 아트 타이베이, 스타트아트페어 서울, 서울 오픈아트페어,
한국 국제 아트페어, 아트 부산, 화랑미술제, 대구아트페어, 아시아 컨템포러리 아트쇼(홍콩), 부산국제화랑아트페어,
서울 아트쇼, LA아트쇼

작품소장: 울산 시립미술관, 한국민속촌 미술관, 갤러리 위(평택), 리안 갤러리, 인사 갤러리, 갤러리 아트파크,
갤러리 청담(대구), 동원화랑 , 기타 기업및 병원, 개인 컬렉터 다수 소장' WHERE name_ko = '송광연' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '신건우 B. 1986
인덕대학교 미디어아트 & 디자인과 학사, 2016

개인전
2024년 <진부한 것이 새로운 것이다.>, 달천예술창작공간, 대구, 한국
2022년 <Cropped City>, 갤러리오누이, 서울, 한국
2022년 <신건우의 산책하는 마음>, 미르갤러리, 대구, 한국
2022년 <DUAL : 자기복제 시대의 예술작품>, BGM갤러리 롯데월드타워점, 서울, 한국
2021년 <PRESENT>, 갤러리조선, 서울문화재단 예술활동지원, 서울, 한국
2021년 <건축적 풍경>, YOONION ART SPACE, 서울, 한국
2019년 <RETRO>, Coutances Art Center, 꾸탕스, 프랑스
2018년 <Walking Narratives>, 스페이스55, 서울, 한국
2018년 <Destroy the Distopia>, 먼슬리, 서울, 한국
2016년 <셀프장례>, MAKSA(현 플레이스 막1), 서울, 한국
주요 단체전
2025년 <이온이유>, 대구예술발전소 15기 입주작가 성과전, 대구예술발전소, 대구, 한국
2025년 <현대, 예술이 된 시간>, 현대백화점 압구정 본점, 서울, 한국
2025년 <달성 대구현대미술제 2025 - 물결의 연대기>, 강정보 디아크, 대구, 한국
2025년 <NOWHERE>, 전국 레지던시 연합 교류전, 대구예술발전소, 대구, 한국
2024년 <달성 대구현대미술제 2024 - 그래도, 낭만>, 강정보 디아크, 대구, 한국
2024년 <레지던시 헙업전시 - 유연한 틈 : 시선의 그림자>, 대구예술발전소, 수창청춘맨숀, 대구, 한국
2023년 <ABOUT THERE>, MHK갤러리, 서울, 한국
2022년 <우리가 도시를 기억하는 법>, 울산예술지원신생단체예술지원, art ground hQ, 울산, 한국
2022년 <장생포엔 고래가 없다>, 한국문화예술위원회 지원사업, 131 작은미술관, 울산, 대한민국
2021년 <Project B Side Metropolitan>, 고양청년 희망뉴딜 프로젝트, 고양시립 아람미술관, 고양, 한국
2021년 <DMZ문화예술삼매경:Remaker>, 아트 호텔 리메이커, 강원문화재단, 강원도 고성, 한국
2020년 <Open Studio - 2기 입주작가>, 수창청춘맨숀, 대구, 한국
2020년 <Just Modern> <모임 Gathering>, 연계 팀플 교육 프로그램 참여 작가, 국립현대미술관 서울관, 한국
2020년 <Tautology>, 호리팩토리, 서울, 한국
2019년 <ART SOUS LES ARBRES1>, Coutances Art Center, 꾸탕스, 프랑스
2018년 <우주시계의 기운>, 돈의문박물관, 서울, 한국
2018년 <혼종성 그리고 혼란>, R3028, 서울, 한국
2017년 <취향은 존재의집>, 기획전 - 너와 나의 아비투스, 대안 공간 눈, 수원, 한국
2016년 <Mayfly8>, 산지직송작업직판장, 서울, 한국
2015년 <Mayfly7>, 서교실험예술센터, 서울, 한국
2015년 <공중전>, 공중작업실, 판교, 한국
2010년 <Art Group Exhibition>, The Show Gallery, 토론토, 캐나다
2010년 <Open Studio>, SERENDIPITY SPACE, 토론토, 캐나다

레지던시
2025년 대구예술발전소 15기 입주작가(2025. 2. 4 – 12. 4), 대구, 한국
2024년 달천예술창작공간 4기 입주작가(2024. 2. 19 – 12. 19), 대구, 한국
2021년 과학이 일상으로 들어오는 집 - 사이언스월든 입주작가(2021. 9. 7 – 9. 23), UNIST, 울산, 한국
2020년 수창청춘맨숀 2기 입주작가(2020. 7. 7 – 10. 6), 대구, 한국
2020년 Coutances Art Center, 1기 입주작가(2019. 5. 2 – 7. 29), 꾸탕스, 프랑스

수상 및 선정
2021년 DMZ문화예술삼매경:Remaker 참여 작가, 강원문화재단
2020년 예술활동지원 시각 선정, 서울문화재단

소장처
강원문화재단
호리아트스페이스
꾸탕스 아트 센터
꾸탕스 시립 미술관
갤러리 퐁데자르
갤러리 이앙' WHERE name_ko = '신건우' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력
홍익대학교 회화과 졸업 및 동대학원 회화과 졸업

개인전
2025 킵티크 기획 개인전, 노팅힐라운지,감일
2025 일상적인 것들의 꼴라주 ,강북삼성병원 나눔존
2020 젊은 작가 공간지원전 공모전 당선-부스개인전, 유나이티드 갤러리,서울
2002 1회 개인전, 관훈갤러리, 서울

단체전
2025 강동 청년미술인 지원 공모전 <모든 것이 빛나는 작품전>, 강동아트센터 아트랑,서울
2025 여름특별초대전: 작가16인의 상상 <내관에 넣어줘>, 스페이스 세컨뷰, 서울
2024 2024 강동 청년미술인 #우리의 순간 35개의 풍경展, 강동아트센터 아트랑,서울
2024 관악x서초 교류형 아트페어 BnB, 관천로문화플랫폼s1412&서리풀청년아트갤러리, 서울
2023 제18회 광화문 국제아트페스티벌-아시아현대미술 청년작가전,세종미술관
2023 예측 가능한미래-강동아트센터 기획전시, 강동아트센터,서울
2023 GALLERY IN THE CITY-공사장 울타리 프로젝트, 서울
2023 킵티크#0002, 아미디갤러리, 서울
2023 킵티크#0001, 다다프로젝트, 서울
2022 Form 2022, CICA 미술관, 김포
2022 아시아프(ASYAAF) ,홍익대학교 현대미술관,서울
2022 2,3회 호호아트페스티벌, 꼴라보하우스 독산, 서울
2022 응원합니다展- 강동미술인 지원 프로젝트 공모전, 강동아트센터 아트랑,서울
2002 cosmetic art 2002- Colorful! Powerful!, 인사아트센터, 서울
2001 4induction 展,홍익대학교 현대미술관,서울
외 다수' WHERE name_ko = '신연진' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '담몽(淡夢) 신예리
경원대학교(현 가천대) 섬유미술과 졸업 (2003)
경기무형문화재 화각장 한춘섭화각공예 수석디자이너로 10년 재직
현(現) 민화공예공방 ‘담몽’ 대표
대한민국 국가미술특별초대전 초대작가
SNAF성남아트페어 작가전
목원회 단체전 등 참여' WHERE name_ko = '신예리' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '서울대학교 미술대학 회화과 및 동 대학원 졸업

<개인전>
1990 금호 미술관
1991 송원화랑
1992 토 아트 스페이스
1994 서경 갤러리
1996 금호 미술관
1999 동산방 화랑

<단체전>
1988 * 한국화-의식의 전환전 (동덕 미술관)
인상전 (갤러리 상문당)
1989 * 43인전 (조선일보 미술관)
전환기의 한국화전 (서울 프레스센터)
1990 * 젊은 모색 90 (국립 현대 미술관)
오늘의 얼굴 (갤러리아 미술관 개관 기념전)
1991 * 한국화-오늘과 내일 (워커힐 미술관)
메시지와 미디어전 (관훈미술관)
1992 * 현대 한국 회화전 (호암 갤러리)
한국적 구상성을 위한 제안전 (갤러리 서목)
1993 * 한·중 미술 교류전 (예술의 전당)
한국 현대 미술 - 신세대 흐름전 (미술회관)
1994 * 한국 현대미술 27인의 아포리즘 (부산 월드화랑)
행복한 우리집 (갤러리 아트빔)
1995 * 자존의 길 2 (금호 미술관)
한국일보 청년 작가 초대전 (백상 기념관)
1996 * 인간의 해석 (갤러리 사비나)
휴머니즘 (인사 갤러리)
1997 * 우리시대의 초상 - 아버지 (성곡 미술관)
광주 비엔날레 - 지구의 여백 (광주)
1998 같이 가는길 (갤러리 삼성프라자)
1999 * 중앙미술대전 역대 수상작가 초대전 (호암 갤러리)
한국화의 위상과 전망 (대전 시립 미술관)

<수상>
1982 중앙미술대전 장려상' WHERE name_ko = '심현희' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '홍익대학교 미술대학 판화과 및 동 대학원 졸업
출간 아트만두의 ‘목표는 방구防口’다 <한길사 / 2022>
아트만두의 ‘비틀뉴스’ <붓과펜 / 2025>

수상 2021 SICAF 서울국제만화애니메이션페스티벌 코믹부문 공로상 <서울>
2019 The Brandlaureate World Bestbrands Awards 2019
- 퍼스널 아티스트 부문 수상 <10월 31일, 샹그릴라 호텔 타워 볼룸, 싱가포르>

개인전
2026 아트만두의 ‘비틀뉴스’ <Born Star Rocks Gallery, 뉴욕>
2022 캐리커처戰 ‘이색기이 耳塞奇異’
캐리커처戰 ‘눈 깔아’
아트만두의 ‘인간대백과사전’ <한국만화영상진흥원 제2기획전시실, 부천>
2022 캐리커쳐 초대전 ‘우리가 사랑한 사람들’ <시카고 알바니팍 공립도서관, 미국> 외 9회
그룹전
2025 국제풍자만화전 –동아시아의 눈
<도쿄 사이타마 미디어타워 뉴스아트 갤러리워크, 도쿄>
Byond the People전 <마루아트, 서울>
한국샐라티스트협회전, 한-벨 수교 120주년기념한국만화특별전
<벨기에한국문화원, 벨기에>
생쥐스트르마르텔 국제시사만화살롱展 <생쥐스트르마르텔, 프랑스>
등 다수' WHERE name_ko = '아트만두' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = 'Education
2016 상명대학교 예술학부 사진영상미디어학과 졸업

Solo Exhibitions
2024 나의이름은, 노을아티잔센터, 서울
2023 Authentic City (공기도시), 갤러리 브레송, 서울
2021 NEW REMINISCENCE, 갤러리 브레송, 서울
2020 NEW REMINISCENCE, 이대서울병원 아트큐브, 서울
2018 CITY OASIS, 갤러리 브레송, 서울
2017 LUCK 喜, 갤러리 브레송, 서울

Group Exhibitions
2025 보이지않는 도시들, 갤러리 브레송, 서울
2024 CRAFT + MAN = SHIP, 한강공원 서울함, 서울
2023 미디어는 마사지다, 꼴라보문래, 서울
2022 동시다발전, 갤러리가제, 서울
2021 날씨의 맛, 갤러리 브레송, 서울
2021 SEEA 2021, 예술의 전당, 서울
2021 사진가의 여행법, 갤러리 브레송, 서울
2021 포르쉐 Dreamers On Artists 선정 및 광주디자인비엔날레 전시

Awards & Selections
2021 포르쉐 Dreamers On Artists 20 선정
2020 이대서울병원 아트큐브 공모 작가 선정
2011 수원 화성 愛 사진 공모전 대상
2010 제주국제공항 사진전 은상
2009 W New Talent Contest Photographer 부문 finalist
2007 데일리프로젝트 TOP 5 선정
Film
Director
2021 LUNATIC – 무성 무용 영화 (연출 및 출연, 해외 10여개 영화제 수상 및 초청)
2021 반려봇 – 단편 영화
Acting Credits
2020-2025 (광고) : 고용노동부, 현대오일뱅크, 포르쉐, 구글애즈, LGU플러스 등 다수
2020~2025(영화) : 미라주, 비극의 탄생, 펑, REDLINE, 엄마같은 엄마 외 다수
Publications
2023 『사랑만이 정답일 뿐: 센스의 탄생』, 안쏘쥬 저
2023 SOYCOPASS 자체 IP NFT 개발 및 발표' WHERE name_ko = '안소현' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '홍익대학교 미술대학 동양화과 박사
교육경력_울산대학교 객원교수 역임.
경성대학교, 조선대학교, 울산대학교 강사

개인전_
2024년 반추_反芻_Rumination (가기갤러리_울산)
2022년 바운더리(Boundary)여행 (북구문화예술회관_울산)
2017년 The Journey to The Recovery (가나아트스페이스_서울)
2016년 The Journey to The Recovery 초대전 (Caffebene Time Square_뉴욕·미국)
2015년 The Journey to The Recovery 초대전 (THE WHEEL HOUSE_뉴욕·미국)
2012년 Only Dream-ing Traveler 기획전 (THE K Gallery_서울, 화봉갤러리초대전_서울)
2010년 Only Dream-ing Traveler 기획전(Gallery SU_서울)
2009년 Joy of Voyage 초대전 (Gallery HOSI_동경·일본)
Joy of Voyage 기획전 (영아트 갤러리_서울)
2008년 일탈 속 즐거움 기획전(Gallery Young_서울)
2007년 일탈 속 즐거움 (Gallery Spacs pause_동경·일본)

단체전 _
2025년 세상에 맞닿는 시도: 공유 (레온갤러리_서울)
2024년 Our Summer (VVS MUSEUM_서울)
“DREAM” (미개척지 스튜디오_서울)
2023년 색채로 기록한 시간의 역사 展 (인사아트센터_서울
울산문화박람회&울산에이팜 초대전 (유에코_울산)
2022년 공존하는 세 개의 시선 기획전 (한국에너지공단_울산)
우리에게도 여름방학이 필요해 초대전 (F1963_부산)
8가지 여정 초대전 (교문갤러리_부산)
2021년 일상을 노래하다(백송화랑_서울)
辛丑年 한국화전 초대전 (Gallery hoM_서울)
여행 그 너머 초대전 (현대미술관_울산)
2020년 마음으로 보는 빛과 색 (동덕아트갤러리_서울)
2018년 아시아프&히든아티스트 페스티벌 (동대문디자인플라자(DDP)_서울) 그 외다수

레지던시_ ARPNY_ Artist Residency Program_뉴욕·미국

작품소장_ 울산문화예술회관, 울산대학교, 울주세계산악영화제, CK 치과병원, CNP압구정 차앤박피부과 기업체 및 개인 소장 등' WHERE name_ko = '안은경' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력
서강대학교 전문대학원 철학과 석사졸업
인천가톨릭대학교 전통종교미술학과 학사졸업

개인전
2024 c ; stand up for yourself, ㅁ, (갤러리오우도, 서울)
2020 c ; summer, (양출서울, 서울)
2013 empty interval, (갤러리더케이, 서울)
2008 clean, Cloud, (갤러리호시, 일본 동경)

단체전
2023 Eternal Moments, (갤러리그라프, 서울)
2022 갤러리 개관전, (Edition, 캐나다 몬트리올)
2022 Selasart International Visual Art Exhibition, (Ohana Cafe, 인도네시아 메트로)
2020 TRiCERA PRESENTS SPECIAL PROMOTION (Shinwa Auction, 일본 동경)
2017 알록달록 아메바 놀이터, (문화비축기지, 서울)
2014 그들이 보는 세상-세 개의 예민한 시선, (조선대학교미술관, 광주)
2011 The Blank, (키미아트, 서울)
2009 광주&서울시립미술관 창작스튜디오 교류 N0..., (광주시립미술관, 광주)
2009 THE FORGOTTEN TIME, (Love2arts gallery, 벨기에 엔트워프)
2008 99Tents, 99 Dreams, One World, (좌우미술관, 중국 북경)

레지던시
2009 광주시립미술관 창작스튜디오 레지던시, (광주)
2008 하대리 여름숲속미술제 레지던시, (강원도)' WHERE name_ko = '양운철' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '이력사항
KAIST(건설환경공학과/산업공학과) 졸업

개인전 15회 기획 단체전 70여회
2024 서울 청년비엔날레 미술 평론가상 수상
2023 제주 빛의벙커미디어아트 전시 ''피어나다''
2022년 광화문 국제 아트 페스티벌 국제 초대전 초대작가
2019년 인천문화재단 서해평화예술 프로젝트 공동기획 등' WHERE name_ko = '예미킴' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '개인전
2022‘달에서 달에게’ (아트스페이스 영,서울)
2022‘짙은 방‘(아트로직스페이스,서울)

단체전
2025‘2025띠그림전’ (이천시립미술관,이천)
2024‘In my loneliest hours’(인사갤러리,서을)
2024‘AFindingPersona’(갤러리 언플러그드,서울)
2024‘몽상 드로잉‘(갤러리 1707,서울)
2023‘2023H-EAA전국청년작가 미술공모전 선정작가 10인전’ (아트스페이스 호화,서울)
2023‘스며들다’ (갤러리일호,서울)
2023‘유희의 모양’한겨레신문 (아띵갤러리,서울)
2023‘사색은 각자의 소리가 존재하고’ (A-lounge갤러리,서울)
2023‘BAMABUSAN’국제화랑아트페어 (BEXCO,부산)
2023‘몽상드 한양‘ (갤러리1707,서울)
2022‘형상의 바깥’ (금보성미술관,서울)
2022‘FOCUSARTFAIR’(파리 까루젤 뒤 루브르,파리)
2022‘아시아프’ (홍익대학교 현대미술관,서울)
2022‘꿈과 마주치다’ 신진작가 (갤러리일호,서울)

수상
2023‘2023H-EAA전국청년작가 미술공모전,우수상 (호반문화재단)

작품소장
호반 문화재단' WHERE name_ko = '오아' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '부산외국어대 명예교수, 사진비평가, 국제문화예술교류원 전속 작가
2025 중한예술가국제사생전 (단체전), 중국 무석시 태호미술관 소장
2025 중한예술가국제교류전 (단체전), 중국 소주시 동산국빈관 미술관 소장' WHERE name_ko = '이광수' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '오사카예술대학(OSAKA UNIVERSITY OF ART) 사진학과 졸업
상명대학교 예술 · 디자인대학원(사진학과-순수/이미지사이언스전공)졸업

Solo Exhibition
25년 공간썬더 초대전(혜원사진첩) _ 공간썬더
혜원사진첩 _ 이즈갤러리
제주국제사진전 이수철초대전(제주 비동시성) _ 갤러리 시몽
기억의 여정 _ 솔라리스갤러리 오사카
23년 기억의 여정 _ 더빔갤러리 대전
22년 기억의 여정 _ 여미갤러리 서산
21년 흔적과 빛 _ 토마갤러리 대구
20년 Daydream _ 갤러리 혜윰광주
18년 비동시성제주_예술상회 토마(대구), 스페이스22(서울), 브레송갤러리(서울), 여미갤러리(서산)
16년 브레송갤러리 오마이뉴스 공동기획 사진인을 찾아서 이수철 개인전
“Day dream” _ 브레송갤러리
11년 화몽중경 _ 그림손갤러리
부활2012 _ 나비갤러리
이수철 사진전 _ 갤러리 우이
08년 幻想의 Epiphany _ 갤러리 ON,Architectural Photograhy_브레송갤러리
06년 빛으로 그리는 기억의 풍경展  _ 나우갤러리
99년 memories _ 이후갤러리

Group Exhibition
25년 2025New Wave전 _브레송갤러리
인사동 아트위크(IAW) _ 갤러리5
우리가 기억하는 방식 _ 인덱스 갤러리
24년 D*Composition _ space22
23년 Life Memory Plac _ 돌담갤러리 제주
22년 충남대학교 개교 70주년 예술대학교수 작품전 _ 백마아트홀
놀자전 _ 희수갤러리(서울) 해운대문화회관(부산)
제주국제사진축제 _ 돌담갤러리
김영섭화랑개관전CONTEMPORARY KOREA PHOTOGRAPHY _ 김영섭화랑
골목전 _ 팔레드서울
사진의 만찬 _ 돌담갤러리(제주)
21년 제주국제사진축제-이아갤러리
20년 화랑미술제-coex(나우갤러리)
19년 on photography-브레송갤러리
2019선물전-롯데백화점갤러리 대전점
17년 사진의 섬 송도-포항 송도 코모도호텔
16년 내방에 빛을 걸다 _ 스페이스 옵트
15년 DMC아트페스티벌 _ 디지털미디어시티 갤러리
별의 별 잔치_ SpaecSun+
책 공간 그림 사람의 어울림전 _ 노은아트리브로
14년 Contemporary art ruhrMedia Art Fair _ World Heritage Site, Zollverein, Essen, Germany
13년 ARTIST’S PRESENT _ GALLERY SEIN
white summer _ 롯데백화점갤러리 대전점
11년 화려한 심장 _ 을지미디어갤러리
09년 Contemporary Korea Photographs Exhibition _ 오오사카예술대학예술정보센터 전시홀(일본)
2009 서울미술관 포토 페스티벌 사진의 순환전 _ 서울미술관
Pilmuk& Photo _ MulpaSpace
상상외 풍경 이수철-조미영 2인전 _스페이스 모빈
08년 2008 WAKE UP 한국사진의 새로운 탐색 _ 룩스갤러리
뿌리 깊은 사진전 _ 갤러리이룸
Invisible Space전 _ 상명대학교 예술디자인센터 갤러리
하늘 이름 땅전 _ 갤러리이룸
05년 광복 60주년기념한국사진의 과거와 현재전 _ 광화문갤러리
04년 한-일 사진교류전 방주의 사진14인 展 _ 일본문화원 실크갤러리
01년 SAKA-NO MACHI ART in yatsuo2001 _ toyamayatsuo(일본) 외 다수 그룹전참가

Team Project activities
18년 비동시성-제주 _ 비오톱갤러리제주 [제주문화재단기금]
17년 인천여자 Just as you are _ 인천아트플랫폼[인천문화재단기금]
16년 2016인천여자 _ 선광미술관[인천문화재단기금]

경력
07-12년 대구예술대학교 사진학과 강사
08-09년 국민대학교 조형대학 강사
13-현재 상명대 사진영상학과 강사
10-현재 충남대학교 디자인창의학과 강사' WHERE name_ko = '이수철' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '--- 경     력 ---
2022. 6 ~ 현재 ‘예술의숲 사회적협동조합’ 이사장2018. 1 ~ 2020. 3 ‘아트필드(ARTFIELD) 갤러리’ 아트 디렉터
2014. 5 ~ 2017. 3 ‘에이트리(A-Tree) 갤러리’ 대표 역임
2004 ~ 2013 포토그룹 대표
--- 학     력 ---
중앙대학교 예술대학 사진학과 졸업
이태리 밀라노의 ‘유럽 디자인대학‘Istituto Europeo di Design’ 사진학과 졸업
--- 강     의 ---
2004. 3    ~ 2014. 6 건국대학교 디자인학부 강사 역임
2000. 3    ~ 2009 남서울대학교 멀티미디어과 겸임교수 역임
--- 저     서 ---
2025 ‘아름다운 여름(La Bella Estate)’ 녹색광선 (번역)
2025 ’느린 인간‘ 글항아리 (글. 사진)
2016 ‘메르스의 영웅들’ 둘다북스 (사진)
2015 ‘세속도시의 시인들’ 로고폴리스 (사진)
--- 수     상 ---
2025 제14회 녹색문학상 선정(포토 에세이 ‘느린 인간’, 글항아리)
--- 개 인 전 ---2025. 6. 20 ~2025. 7. 20 “느린 인간”
서울 (라플란드)
2024. 3. 6 ~ 2024. 3. 25 "남해신목_시간의 기억"
남해 (남해유배문학관)
2023. 12. 5~ 2023. 12. 17 "녹색낙원_피지" 서울 (비움 갤러리), “물 위의 나무, 맹그로브” 하남시 (갤러리_다)
2023. 10. 10 ~ 2023. 10. 31 "통영신목" 통영시 (갤러리 미작)
​
2022. 8. 2 ~ 2022. 8. 16 "신안신목_우실"
시흥시 (소전미술관), 광주광역시(예술이빽그라운드)
2021. 5. 4 ~ 2021. 5. 15 "제주신목_폭낭"
서울 (LeeSeoul gallery)
2020. 2. 2 ~ 2002. 2. 29 “신들이 사랑한 나무, 바오밥”
서울 (ARTFIELD GALLERY)
2018. 11. 20 ~ 2018. 11. 27 “Trees Generations”
Bari, Italia (Fortino Santa Antonio), 서울(ARTFIELD GALLERY)
2018. 3. 26 ~ 2018. 4. 29 “인간 나무”
서울 (ARTFIELD GALLERY)
2017. 11. 29 ~ 2017. 12. 9 “꿈꾸는 나무”
서울 (ARTSPACE HOSEO)
2017. 6. 9 ~ 2017. 6. 25 "히말라야"
서울 (Gallery Munrae)
2016. 10. 20 ~ 2016 11. 2 “숲(Forest)”
서울 (ARTSPACE HOSEO)
2016. 7. 4 ~ 2016 7. 17 “시인의 얼굴”
서울 (A-Tree Gallery)
2015. 7. 8 ~ 2015. 7. 13 "나무“
서울 (갤러리 인덱스, A-Tree Gallery), 봉평 (Art in Island)
2015. 2. 4 ~ 2015. 2. 28 "푸른 나무 3“
서울 (A-Tree Gallery)
2014. 1. 11 ~ 2014. 1. 22 "푸른 나무 2"
서울 (Gallery Arte22)
2013. 5. 30 ~ 2013. 7. 15 “ 푸른 나무(Blue tree)”
서울 (갤러리 중 서울, 부천, 용인점, iT 갤러리, 캔손 갤러리)
2009. 7. 22 ~ 2009. 8. 10 “바람이 분다“
서울 (W Gallery)
2009. 5. 4 ~ 2009. 5. 16 “Number”
서울 (이룸 갤러리)
2008. 12. 3 ~ 2009. 1. 11 “흐르는 꽃”
서울 (김영섭사진화랑)
1998. 10. 8 ~1998. 10. 20 “C''era una volta il nudo, e poi...”
Milano, Italia (Famiglia Artistica Milanese), 서울 (갤러리 May)' WHERE name_ko = '이열' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '개인전
2025 <바램이 머물다 다시 일어서는 곳>이유지초대개인전,아트보다갤러리,서울
2025 <카르마다이스>강화 전등사 무설전 서운갤러리 공모 선정,서운갤러리,인천
2024 <염원의 파티>이유지 초대 개인전,더 스퀘어즈 갤러리,서울
2024 <몽상가의 파라다이스>은평문화재단 사이 공모 선정,은평문화재단,서울
2017 <심연의 풍경>사이아트 도큐먼트 공모 선정,사이아트도큐먼트,서울

단체전
2026 <Anew beyond 다시시작처럼> 삼원갤러리,서울
2025 <수문장아트페어 2>,수원문화재단,111CM,수원
2025 로하갤러리 단체 소품전,서울
2025 inspired 페어세텍,서울
2025 <Exploring Life>윤겸 이유지 2인전,GG2갤러리,서울
2025 BANK 아트페어,세텍,서울
2025 영원아트페어,영도씨갤러리/AR갤러리,서울
2025 <화랑미술제 수원 :수문장아트페어>,수원문화재단,수원
2025 <0원 아트페어>,0도씨갤러리/AR갤러리,서울
2025 <BANK 아트페어>,페어몬트 엠버서더,서울
2025 <놓는 법>씨뮤즈 프로젝트,스페이스 아텔,서울
2024 <작은 미술관>이미연 이유지 2인전,수원문화재단,스타필드 작은미술관,수원
2024 <춘천 아트섬 한국과 인도>,춘천문화재단,남이섬 평화랑 갤러리,춘천
2024 <수문장 아트페어 PART2>,수원문화재단,111CM,수원
2024 <아트레코드 청주>,그어떤,충북문화재단,문화제조창,청주
2024 <YOUTH>단체전,화이트스톤갤러리,서울
2024 <수문장 O!화랑미술제 IN수원>,수원문화재단,수원컨벤션센터,수원
2024 <제주 국제 아트페어>,제주컨벤션센터,제주
2024 <Weekly K-Auction>,케이 옥션,서울
2024 <빛과 어둠>넌지.이유지 2인전,아트보다갤러리,서울
2023 <갤러리 시선>이유지 이정민 2인전,서울대 명예교수 김정희기획,gs시선,서울
2022 <백일몽 :한낮에 꾼 꿈>김기태.이유지.장소연 3인전 ,앵포르멜 성수,서울
2022 <청기일전>제주 청년의 날,제주특별자치도청 1청사본관,제주
2021 <관인문화마을>,관인(구)농협비료창고,문화체육관광부,관인문화재생연구회,포천
2021 <모두에게 멋진날들>,서울시민대학,서울
2021 <을지 아트페어 프라이즈>,중구문화재단,을지트윈타워,서울
2020 <을지 아트페어 프라이즈>,중구문화재단,을지트윈타워,서울
2020 <A1신진 청년작가>,금보성 아트센터,서울
2019 <한성백제 송파미술제>,예송미술관,서울
2019 <너트 선정작가 특별전>,너트갤러리,서울
2018 <모두로부터 여기까지>,3인전,이주희 기획,아트스페이스엣,서울
2018 <아시아프 1부>,동대문DDP,서울
2018 <서대문 여관 아트페어>,서대문여관,7picture주관 ,서울
2018 <제3회 A1신진작가>,금보성아트센터,서울
2017 <생애 첫 소장 경험>,에코락갤러리,서울
2017 <아시아프 2부>,동대문DDP,서울
2017 <1st Track –치유>윤겸.이유지 2인전,서정아트센터,서울
2016 <미래의 시선>서정아트센터 신진작가 선정전,서정아트센터,서울
2016 <제5회 스필플라츠한 공모>이유지.주상언 2인전,스필플라츠한갤러리,서울
2016 <아시아프 2부>,동대문DDP,서울
2015 <GIAF광화문아트페스티벌 청년작가>공모 선정,세종미술관,서울
2015 <불안 마주하기>석사학위 청구 릴레이 개인전,국민아트갤러리,서울
2015 <Exchange Stroke Painting>, 쾌연재 미술관,강원도 영월
2014 <새벽현상>,평창동 연우갤러리,서울
2014 <아시아프 2부>,구 서울역,서울
2013 <움展>수원대학교 서양화과 졸업전시,이즈갤러리,서울

수상
2024 <내일의 작가>겸재 정선 공모 선정,우수상,겸재 정선 미술관,서울
2024 <JDC 제주미술대전>,장려상,제주화랑협회,제주국제도시자유계발센터,제주
2022 <제4회 서울로 미디어 캔버스>,평면수상,서울로미디어캔버스,만리동광장,서울
2020 <아트프라이즈 강남>,우수상,아트프라이즈강남,강남문화재단,서울
2016 <여름생색展>가송예술상 공모 선정,콜라보레이션 부문,공아트스페이스,서울
2016 <제1회 서리풀 ARTforART>,특선,유중아트센터,서울
2015 <제14회 한성백제미술대상전>,특선,예송미술관,서울
2015 <제12회 한성백제미술대상전>,특선,예송미술관,서울
2013 <제15회 단원미술제>,특선,단원미술관,서울 아트 지원 프로그램 활동
2025 삼원 아트 스폰서십 8기 활동,삼원페이퍼,삼원갤러리,서울

소장
2024 겸재 정선 미술관 「습지에 피어난 자아, 심연의 꽃」 소장
2020 서울 문화 본부 박물관과 「심연의 숲 2」 소장
2016 하나은행 아트뱅크 「붉은 방」 소장
그 외 페어 및 개인 컬렉터 소장 등
예술교육활동2025 한국문화예술교육진흥원 ‘마움치유봄처럼‘ 치매어르신 참여강의예술가 , 프로젝트c, 은평구립내를건너서도서관, 서울
워크샵
2025 <마음약국 - 수원페스티벌> 10.25 ‘ 염원의 성물 제작소 ’ 워크샵, 수원
2025 <명동밥집 – 예술한끼> 10.22 ‘ 비비디바비디 ’ 예술장돌뱅이 워크샵, 서울

레지던시
2026 춘천예술촌 4기 , 춘천문화재단, 강원도 춘천' WHERE name_ko = '이유지' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력
2009 영국 맨체스터 대학원 미술사학과 박사 수료
2002 런던 소더비 인스티튜트 오브 아트 현대미술학 석사 졸
2001 런던 예술대학교 순수미술(회화 전공) 석사 졸
2000 영국 캐빈디시 칼리지 그래픽디자인 디플로마 졸
주요 개인전
2025 환대의 방: 웰컴 VIP, 제12회 경남국제아트페어 특별 초대전, 창원컨벤션센터(CECO)
2024 Tell Me The Story, 아트스페이스 J_Cube1, 성남(2024 성남문화재단 예술창작지원 사업 공모 당선전)
2023 욕방의 방, 젊은달 와이파크(하슬라 미술관 분관) (기획 초대전), 영월
2022 Moneyscape, 복합문화공간 커피에스페란토(초대전), 서울
2017 Monoticon-감정의 에스페란토, 복합문화공간 커피에스페란토(초대전), 서울
2016 Digilog-감정의 에스페란토, 갤러리 시작(기획전), 서울
2004 Emotional Esperanto, 아트스페이스 미음(전시 공모 당선전), 서울
주요 그룹전
2025 Blue Summer, 성남아트센터 큐브사랑방 전시실, 성남
제 57회 일본신원전, 도쿄도미술관, 도쿄
2024 ‘도시를 다시 상상하다’ 성남큐브미술관, 성남
2022 ‘젊은 예술가의 초상’ 영아트 갤러리, 대전
2016~17 ‘욕망의 메트로폴리스’ 부산시립미술관, 부산
2013 ‘세계의 스타’ 예술의 전당 한가람미술관, 서울
2008~10 ‘거울아, 거울아!’ 국립현대미술관 어린이미술관, 과천
2006 광주비엔날레 제3섹터 ‘아티스트 응접실’ 광주시립민속박물관, 광주
2005 ‘포트폴리오 2005’ 서울시립미술관, 서울
‘파티’ 전, 성곡미술관, 서울

저서: <사연 있는 그림> <그림의 방> <북유럽 미술관 여행> <요즘 어른을 위한 최소한의 미술100> 외 다수' WHERE name_ko = '이은화' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '1955년 부산 생~
1983년 부산수산대학 식품공학과 졸업

개인전
1989년 우리들의 일상-I : 그림미당민-서울,
온다라미술관 초대전-전주
1992년 우리들의 일상-II :그림마당 민-서울,
온다라 미술관 초대전-전주,
갤럴리 누보 초대전-부산
2005년 Good days! 안녕한 일상들 (덕원갤러리-서울)
2006년 Good days!! (부산민주공원 초대전-부산)
2010년  Old story (박진화 미술관 초대전-인천)
2018년 In the paradise (나무아트 갤러리 초대전-서울)
2021년 지구 표류기 (부산 민주공원 초대전-부산)
2023년 거리에서 (나무아트 갤러리 초대전-서울)
2025년  홀로이즘(From the Invisible to the Visible)전   Artverse in Paris

단체전 약 150회
2026
2025     판을 뒤집다(경기미술관)
호수에 뜬 달그림자와 같은 헛소리展 (아르떼 숲)
5.18 민중항쟁 45주년 미디어 아트 특별전(REGENERATION)   대안예술공간 이포
평화 문화제 (동두천 평화의 깃발전)  소요산 동두천 옛 성병관리소 농성장 앞 주차장
2025 세계예술인 한반도 평화대회‘Art Revolution’전  헤이리 예술마을 갤러리 한길
정선 국제책사랑 장서표전
빛의 연대기전 / 민주화운동 기념관' WHERE name_ko = '이인철' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '제주신화전(2016), 박근혜 하야전(2017), 대구사진비엔날레(프린지), 수원국제사진축제, 제주신화 한일전(2017),화산섬국제사진제, 대한민국국제포토페스티벌, 이중초상화연작전(2019), 사라진 정원전, 마을극장 DMZ레지던시전(2020), 슬기로운살림살이전(2021), 새들은 펜데믹을 두려워 하지 않는다전(2022), 화산도전(2023), 칠실파려안전(2024), 천 개의 카메라(2025) 등 개인전•단체전•아트페어 참여 다수' WHERE name_ko = '이재정' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '1984 한국 출생
2017 뒤셀도르프 쿤스트아카데미 디플롬 학위 졸업, 마이스터슐러 수료, 프란카 훼렌쉐메이어 교수반 (Klasse. Franka Hörnschemeyer)
2015 브레멘 국립예술대학교 순수미술전공 9학기 수료
2009 국민대학교 입체미술전공 석사 졸업
2007 국민대학교 입체미술전공 학사 졸업

개인전
(05.2026 전시타이틀 미정, CICA Museum, 김포, 한국)
11.2025 <Hollowed Colors> 아트스페이스 엣, 서울, 한국
06.2023 art-hoc solo exhibition> 뒤셀도르프 아트(duesseldorf-art), 뒤셀도르프 독일
02.2023 <structure> 크비텐바움 갤러리, 뮌헨 독일
09.2019 <reversed> 비젠박흐 갤러리 (Biesenbach Galerie), 쾰른 독일
11.2015 <Studies for between spaces> 대안공간 눈, 수원 한국
07.05.2014 ‹One night stand> Alternative Space Immigration Office, 브레멘 독일
06.2009 <Boundary of skin> 아트스페이스 현, 서울 한국
그룹전 (selected)
11.2025 <대한민국모던아트대상전> 갤러리 B, 서울, 한국
10.2025 <신사임당 미술대전> 강릉문화센터, 강릉, 한국
08.2025 <이랜드문화재단 16기 공모전시> 답십리아트랩, 서울, 한국
07.2025 <13인 신진작가전> 밀스튜디오, 서울, 한국
04.2024 <From Abstact To Nature>크비텐바움 갤러리(Quittenbaum Galerie), 뮌헨 독일
02.2024 <Es kommt nicht auf die Größe an> 갤러리 락헨만 아트 (Galerie Lachenmann-Art), 프랑크푸르트 독일 01.2024 <Achromatic> 비젠박흐 갤러리, 쾰른 독일
07.2023 <Studio 84> 갤러리락헨만 아트, 콘스탄츠 독일
06.2023 <Trialogue-Aspects of Abstraction> 비젠박흐 갤러리, 쾰른 독일
04.2023 Female Perspectives> 갤러리 락헨만 아트, 프랑크푸르트 독일
11.2021 <Luxembourg Art Week> 비젠박흐 갤러리, 쾰른 독일
01.2021 <Sculptural. Painting> 비젠박흐 갤러리, 쾰른 독일
05.2020 <Carte Blanche> 비젠바흐 갤러리, 쾰른 독일
01.2020 <MNMSLM 2> 비젠바흐 갤러리, 쾰른 독일
09.2018 <Sinngefuge> 비젠박흐 갤러리, 쾰른 독일
06.2018 <augenfallig/fresh positions> BBK 미술협회, 뒤셀도르프 독일
01.2018 <Juxtaposition> 비젠바흐 갤러리, 쾰른 독일
11.2017 <unbunt-achromatic> 비젠박흐 갤러리, 쾰른 독일
10.2017 <Arbeitstitel-Akademie> 쿤스트할레 뒤셀도르프 독일
04.2017 <EAF-50 Contemporary Artists> Enter Art Foundation, Multipolster store, 베를린 독일
02.2017 <Die Grosse> Cooperation Class Hoernschemeyer, 쿤스트 팔라스트, 뒤셀도르프 독일
12.2015 <LOT-Lack of Transmission> 디드로이트, 토론토 (US, CA)
10.2014 <Landgaenge> Gesellschaft fuer Aktuelle Kunst Bremen, 브레멘 독일
07.2013 <High On Visualart> Hutchins Gallery, 브룩클린 (US)
07.2013 <12 plus 9 Fruehe Netzwerke> 브레멘 시립갤러리, 브레멘 독일
그외 다수
장학금
브레멘 독일 2015 DAAD Matching Fund Scholarship
상
2025 입선, 대한민국모던아트대상전, 서울, 한국
2025 입선, 신사임당 미술대전, 강릉, 한국
2017 후보 입상, Blooomaward 2017 by 바슈타이너, 독일
2016 후보 입상, Zucker art collection, 부다페스트 헝가리
2014 대상, 포스터컨셉 패스파인더 어워드 국민대학교, 서울 한국 2011 대상, Hochschulprize, 브레멘 국립예술대학교, 브레멘 독일' WHERE name_ko = '이지은' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '《응달에 피는 꽃》 분도출판사(1981)
《한 -신학과 미술의 만남》 서남동. 이철수 공저 분도출판사(1982)
《고호 전기》 웅진출판(1987)
《김홍도 전기》 웅진출판(1987)
《새벽이 온다, 북을 쳐라!》 이론과 실천(1989)
《새도 무게가 있습니다]》 해인사 출판부(1990)
《산 벚나무 꽃 피었는데…》 학고재(1993)
《마른 풀의 노래》 학고재(1995)
《이렇게 좋은 날》 학고재(2000)
《배꽃 하얗게 피던 밤에》 문학동네(1996)
《소리 하나》 문학동네(2001)
《새도 무게가 있습니다》 문학동네(2002)
《자고깨어나면늘아침: 이철수의나뭇잎편지》 삼인(2006)
《당신이 있어 고맙습니다》 삼인(2009)
《오늘도 그립습니다 (이철수의 나뭇잎 편지)》삼인(2010)
《작은 선물》 호미(2004)
《노래》 호미(2005)
《밥 한 그릇의 행복. 물 한 그릇의 기쁨》삼인(2004)
《가만가만 사랑해야지. 이 작은 것들》 삼인(2005)' WHERE name_ko = '이철수' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '개인전 (Solo Exhibitions)
2024 GALLERIE LUTÈCE PRESENTS_김치 (12/24-12/28, 코엑스, 서울)
2023 이씨! 표류기 (2/15-3/1, 정문규미술관)
2022 개인전 김치_숨 Kimchi_Breath (3/30-4/3, CICA 미술관)
2022 팽이의 달 (1/10-1/26, 갤러리호호)
2021 숨_의미심장 (1/28-2/17, 아트잠실)
2019 김치 (11/20-11/30, 대안예술공간이포)
2016 WHO AM I? (11/25-12/8, 정수화랑)
2015 色卽是空 空卽是色 (3/11-4/3, AP갤러리)
주요 단체전(Selected Group Exhibitions)
2025 〈광복 80주년 DMZ 국제예술교류 프로젝트_탈경계〉, 고성 DMZ박물관·통일전망대(강원)
2025 〈Counter Memory, Counter Voices: 대항기억, 발화하는 목소리〉 피날레 퍼포먼스, 대구역(대구)
2025 〈신 심도기행 - 두 세계의 경계, 예술로 잇다〉, 강화 전쟁박물관 잔디마당(강화)
2024 〈Fukuoka Art Award 2024〉 수상작전, 후쿠오카시미술관(일본)
2023 〈UTOPIA?! PEACE〉, Kunstraum Potsdam / Berlin Wall Memorial(Bernauer Straße) / Babelsberg Palace(독일)
2023 〈FREEDOM 2023〉, 후쿠오카 아시아미술관(일본)
2022 〈창원조각비엔날레 - 탈경계 프로젝트〉, 성산아트홀(창원)
2022 〈SIEAF 섬진강국제실험예술제〉, 제월섬(곡성)
2021 〈DMZ 이후, 대지의 숨결〉, 양평군립미술관(경기)
2021 〈여수국제미술제〉, 여수엑스포컨벤션센터(여수)
2020 〈Kathmandu Contemporary Art Exhibition〉, Nepal Art Council(카트만두, 네팔)
2018 〈DMZ 아트페스타 2018 〈평화: 바람〉〉(2018 평창동계올림픽), 고성통일전망대·DMZ박물관(강원)
2018 〈〈DMZ 아트페스타 2018 〈평화: 바람〉〉(2018 평창동계패럴림픽),
광화문광장·페스티벌파크 평창·DMZ박물관(강원)
외 다수

수상 / 선정 (Awards & Selections)
2026 〈홍티아트센터 레지던시〉 장기 입주작가 선정, 부산문화재단
2024 제2회 〈후쿠오카 아트 어워드〉 우수상, 후쿠오카시미술관
2023 〈UTOPIA?! PEACE〉 초청·선정, Kunstraum Potsdam / Berlin Wall Memorial(Bernauer Straße) / Babelsberg Palace (Germany) - Berlin Wall Foundation · Kunstraum Potsdam
2018 〈DMZ 아트페스타 2018 〈평화: 바람〉〉(2018 평창 문화올림픽) 작가 선정, 문화체육관광부·강원도
2018 〈평화: 바람(Peace: BARAM) - 평창동계패럴림픽 DMZ 아트페스타〉 작가 선정,  문화체육관광부·강원도
2016-2017 해외전시 기업 후원 작가 선정, ㈜신진스틸
2013 제20회 〈한국미술 국제공모대전〉 우수상, 한국미술국제교류협회
외 다수

소장 (Collections)
후쿠오카시 미술관 (2024)
고성 DMZ박물관 (2018)' WHERE name_ko = '이현정' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '1974 - 1980 동국대학교 예술대학
1980 - 1983 동국대학교 예술대학원
1984 -개인전 삶+인간(관훈미술관. 서울)
한국 평론가 추천 문제 작가 선정
1985 - 초대전-문제 작가 (서울미술관)
1986 - 삶의 노래Ⅰ(아랍미술관. 서울)
1993 - 초대전 비 ·바람 ·구름(봉성갤러리 대구)
1997 - 초대전 도자기 그림전(학천갤러리. 청주)
2002 - 숲속의 노래(청주예술의전당. 청주)
2011 - 초대전 숲속의 노래(419 VERONES 갤러리 LA).
초대전 꽃을 사랑한 호랭이(갤러리 ATTY. 서울)
2012 - 숲속의 노래(인사아트센터. 서울)
2013 - 숲속의노래 나무이야기 (인사아트센타 서울)
2014 - 초대전 봄 마실전(전주 한지박물관), 이홍원 드로잉전 (숲 갤러리 청주) 2015 - 이홍원 작가 초대전 (모리스 갤러리, 대전)
2019 - 이홍원 개인전 (길가온갤러리, 청주)
2020 - 아티스트 나온자와 스승 4인의 초대개인전(인사아트프라자 갤러리,서울) 2023 - 달항아리전 (인사아트프라자, 서울)
그 외 개인전 29회 그룹전 300여 회
해외전 LA NewYork Sarayebo Peru China Japen
작품 소장 및 특이사항
국립현대미술관 미술은행
청주시립미술관
충북도청
충북교육청
SK 영빈관
단재 신채호 영정제작
청남대 대통령기록화(노태우)제작2013-동부증권 카렌다 제작2014-SK 카렌다 제작' WHERE name_ko = '이홍원' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력
홍익대학교 대학원 디자인공예학과 사진학전공 박사

개인전
2025 화락이토花落以土 (부산갤러리, 부산)
2023 동해선-역사驛舍, 역사歷史 (갤러리 루시다. 진주)
2022 동해선-역사驛舍, 역사歷史 (부산 프랑스문화원 ART SPACE, 부산)
2018 화락이토花落以土 (부산 프랑스문화원 ART SPACE, 부산)
2017 오늘의 날씨 (갤러리 수정, 부산)
2012 BEYOND (토요타포토스페이스, 부산)
2011 BEYOND (공근혜 갤러리, 서울)

단체전
2025 기억은 오래된 이야기 (금샘미술관, 부산)
2025 우리들의 헤테로토피아 (갤러리 탄. 대전)
2025 부산.울산.경남 사진교류전:기억의 잔상 (부산시청갤러리, 부산) 외 60여 회

출판
2024 화락이토花落以土, 류가헌
2011 BEYOND, 류가헌' WHERE name_ko = '정금희' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = 'Chelsea college of Arts – MA Fine Art / 첼시 예술대학교 회화과 석사. LONDON. UK
세종대학교 회화과(서양화) 학사. 서울. 대한민국

개인전
2025. 팔림프세스트- 사라지며 남는 것들. 공간썬더. 서울. 한국
2024. 연결: Connection 개인전. 갤러리 실. 플레이스낙양. 낙양모사
2023-2024. 시간, 공간 그리고 기억- 시간과 공간을 기억으로 저장한다. 개인전. E. Land. 이랜드 갤러리-아트로 /이랜드문화재단. 서울 (신구로 NC 백화점).
2022. 저 너머에: YONDER. 개인전. Fill Gallery. 필 갤러리. 서울. 한국
2022. The time in between. 서울신문-서울갤러리 전시작가 공모 선정작가전. 서울. 한국
2021. I run Into You. 사이. 은평문화재단-신진 청년작가지원사업. 아트숨비. 서울. 한국
2021. Line and Light: 선 그리고 빛. 아트스페이스 W. 우신보석. 서울. 한국
2020. Rendezvous: 랑데부. 이랜드 월드사옥. 이랜드 문화재단. 서울. 한국
2020. TIME : 시간. 필 갤러리. Fill gallery. 서울. 한국
2018. 교차된 시간: Intersected Time. 세움아트 스페이스. 서울. 한국
2017. MY STORY. 필 갤러리. Fill gallery. 서울. 한국
2017. Remembrance. 사이아트 도큐먼트. 서울. 한국
2016. Self-Transformation. 초대전. 정 갤러리. 서울. 한국

단체전
2인전
2025. Summer Salon. 강서 아트리움 갤러리 서(강서문화원). 서울
2025. 틈새의 시선. P&C Total Gallery. 서울
3인전
2025. 3인 초대전. MH 갤러리. 경기도.
2024. Stay. 3인전. Gallery hoM. 갤러리 에이치오엠.서울
2023. 아득하다- 3인전. Gallery hoM. 갤러리 에이치오엠.서울.
2021. 다다르다. 동탄 아트스페이스 신진작가공모전-3인전. 화성시문화재단. 경기도.
2016. YAP (Young Artist Project). 릴레이 3인전- 정 갤러리 Jung Gallery. Seoul.

단체전
2025. ooo아트윅스- 시간을 훔치는 도둑. 라온제갤러리. 서울
2025. Summer Through Art. P&C Total Gallery. 서울.
2025. 신진작가 13인전. 갤러리 밀스튜디오. 서울
2024. <#우리의 순간-35개의 풍경전> 강동아트센터. 아트랑/ 강동문화재단
2024. Time lapse. 13인 기획전. 갤러리 PAL. 서울
2024. United Project Art. 유나이티드 갤러리/ United Gallery. 서울.
2023. 한·중 예술교류제 디지털아트전. 사단법인 한국문화예술문화단체 총연합회.
대한민국예술인센터 1층. 서울
2023. ''In Bloom''. De art82 x JNM Gallery. JNM Gallery. 서울
아트경기(경기도 문화재단)- - 경기미술품활성화사업
2022. 아트경기 x 올댓큐레이팅-미술장터. 아트팩토리. 헤이리예술마을. 파주
2022. 아트경기 x 올댓큐레이팅-미술장터. 아트조선스페이스. 서울
2022. 아트경기 x 롯데백화점 <무형의 형태: 2022 아트경기 선정 작가전>. 롯데백화점 동탄점 2F 갤러리, 아트월.
2022. 아트경기x KAN : 정부서울청사 통일부 서울.
2022. 여유- 세상의 아름다움. KAN x 아트경기(경기문화재단). 의정부지방법원 남양주지원. 의정부
2022. 신한금융지주회사 / 신한 PB센터-미디어 테이블 전시.  KAN x 아트경기(경기문화재단)
2022. UAL 동문전시회/ 싱크(SYNC)주관/ 뿐또블루. Seoul
2022. 아티커버리 Aticovery. 온라인 작가 발굴. www.articovery.com 주최: 온라인 아트플랫폼 ㈜아트1닷컴(www.art1.com)
2021. Who is next? 인사아트프라자갤러리 작가공모전. Insa art Plaza Gallery. Seoul.
2021. New Age Art. 올미아트스페이스. Allme art space. Seoul.
2021. 도시, 예술과 문화가 일상이 되는 공간. 경기평화광장 기획전시 <코로나19 치유 경기미술 컬렉션 특별전>. 경기문화재단. 경기천년길 갤러리(경기도청 북부청사 본관 지하1층).
2021. 2021 Group Exhibition. BT Gallery. BT Art Group. Seoul.
2020. 모두에게 멋진 날들. 온라인, 오프라인 전시. 서울시특별시청.
http://wonderfuldays.seoul.kr/wdfa/bbs/board.php?bo_table=gallery01&sca=&sop=and&sfl=wr_1&stx=%EC%A0%95%EB%AF%B8%EC%A0%95
2019. First come! First choice! 이노 아트스페이스. Inno Art Space. Seoul.
2018. IBK 기업은행 신진작가 공모대전. 기업은행 본사로비. IBK(Industrial Bank of Korea). Seoul.
2018. K-painting 신진작가 공모전. 윤승 갤러리. / 가치창의 재단. Seoul.
2018. 키미아트 개관 15주년 기념전. The Next Big Movement. Kimi Art. Seoul
2017. 키미아트. MONAD 전. Kimi Art. Seoul
2017. 양주시립장욱진미술관. 제2회 뉴드로잉 프로젝트. Chang Uuchin Museum of art Yangju city.
2016. International Invited Exhibition: 2016 GAMMA Young Artist Competition. 연세대학교. Seoul.
2016. 김리아갤러리+룩인아트 온라인 전시. . http://www.lukinart.com/
2016. Korea Young Artist 전. 갤러리 엠. Gallery M. Seoul
2016. 움트다, 봄. 소피스 갤러리. Shophis gallery. Seoul
2015. Inkas 인카스 국제교류전 Reminisce- 추억하다. 아라아트센터.Ara art center . Seoul
2015 마중물. 김리아 갤러리 Kimleeaa Gallery. Seoul
2015.Jeune Artiste Project Douze展''. 이정아 갤러리 L Jung A Gallery. Seoul
2015. 청춘, 일상을 탐하다. 갤러리 자인제노. Gallery Zeinxeno. Seoul
2015. 틈: Mind the gap. 갤러리 세바. Gallery SEBA.  A- Project. Seoul.
2015. The Lewis PR Orbital Gallery. London. Milbank. UK
2014. Chelsea salon, Cons project London.  London. SE15 3SN. UK
2014. Passport Pimlico. London, SW1V 3AL, UK

수상경력
2021. BIAF. New Wave. 부산국제아트페어. 신진우수작가상
2021. 인사아트프라자 갤러리 작가공모전. 장려상
2018.  IBK 기업은행 신진작가 공모대전. 최우수상
2018.  K-Painting 신진작가 공모전. 우수상. 윤승 갤러리. / 가치창의 재단
2017 양주시립장욱진 미술관. 제2회 뉴 드로잉 프로젝트. 입상
2016. International Invited Exhibition: 2016 GAMMA Young Artist Competition. Seoul. 입상

소장처
이외 개인 소장
국립현대미술관 미술은행. 서울시청 박물관. 경기도미술관. 양주시립장욱진 미술관.
(사)한국미술협회. 윤승갤러리/가치창의재단. 대한불교조계종 안국선원
필 갤러리. 갤러리 정. 세움아트 스페이스. 소피스 갤러리.
Art Fair
2025. 화랑미술제 in수원. Booth 3층-수문장. 수원컨벤션센터.광교. 수원
2024. MOAF. Munllae One and Only ArtFair. 문래 원 앤 온리 아트페어. 서울
2024.Bank Art Fair / 뱅크 아트 페어. Lotte hotel seoul (소공동). 서울
2023 제3회 하남 프린지 아트페어. 하남문화재단. 하남스타필드. 경기
2023. 관악아트마켓 예술상점. 관악문화재단. 관천로 문화플랫폼 S1472 .서울.
2023. 서리풀청년아트마켓. 서리풀 청년아트갤러리. 서울.
2023 광합성아트페어용인문화도시플랫폼 공생광장 (용인어린이상상의숲 B1F)
2023 The GIAF-The Grand International Art Fair 서울 신라호텔-장충동. No.1115
2023 경기미술협회. .GGAF. 경기 아트 페스타. 경기미술협회. 킨텍스. Kintex. 1,2. 일산
2023 Bank Art Fair / 뱅크 아트 페어. Room no. 2731. Lotte hotel. 소공동. 서울
2022. BIAF. 부산국제아트페어. K-Art국제교류협회. 벡스코(BEXCO). 부산.
2022. IAAS. 인천아시아트쇼. 송도 컨벤시아2-4Hall. 인천.
2022. KIAF Plus. 키아프 플러스. Setec. Seoul
2022. 제1회 헤이리 ACA Art Fair. E-Land Gallery. 이랜드 갤러리. 파주
2022. Bank Art Fair Seoul- 뱅크아트페어 서울. Intercontinental Hotel. COEX. Seoul.
2022. Asia Hotel Art Fair Busan 2022-아시아호텔아트페어 부산. Park Hyatt Busan. 06.09-06.12
2022. PLAS ART SHOW 2022. 조형아트서울. 코엑스. COEX B Hall. 서울.
2022. KASS 코리아 아트쇼 수원.코리아 아트쇼조직위원회. 수원컨벤션센터(광교).
2022. SHAF 서울호텔아트페어. 인터콘티넨탈서울. 코엑스. /(주)더아트나인/ 주관-서울호텔아트페어
2021. BIAF. New wave. 부산국제아트페어. K-Art 국제교류협회. 벡스코. 부산
2021. VISION 2021청년작가공모. (안산국제아트쇼) 사)한국미술협회 안사지부.
기타경력
2025. 경기예술활동 지원사업 선정 시각분야 심사위원' WHERE name_ko = '정미정' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '2009, 대구대학교 대학원 미술 디자인 회화과. 졸업(M.A.), 경북

[개인전]
2024 이동하는 세계 (문화예술팩토리, 포항)
2023 슈필렌 Spielen : 형태놀이 (Apsan gallery, 대구)
2022 Mein Blau und Weiß (Omoke Gallery, 경북)
2021 Die unvollendete Welt (웃는얼굴 아트센터,  대구)
2019 Die Nacht 밤 (동성살롱, 대구)
2017 Augen zu und sehen (Damso Galerie & Teehaus, 독일 베를린)
2010 몽상-House (영천창작스튜디오, 영천)
2009 일상적 사유의 상징적 표현 (미르갤러리, 포항)

[레지던시]
2022-2024 아트랩범어 입주예술인. 대구
2009 영천창작스튜디오 2기 입주작가. 경북
[선정]
2025 수성르네상스프로젝트 미술작품 대여사업, 수성문화재단
2024 포항문화예술지원사업 선정 전시
2024 신진작가 공모당선, 부산 커넥티드
2021 지역작가 미술작품 대여사업, 대구문화재단
[그룹전]
2025 불꽃에서 피어난 정원 (대구예술발전소, 대구)
2025 HERMON Focus (갤러리 허문, 부산)
2025 신진세력 (갤러리 지앤, 울산
2024 아트파노라마 ART (대구아트웨이 스페이스 2~4)
2024 부산, 커넥티드 (부산근현대역사관 본관 B1 금고미술관, 부산)
2024 개관전 포항 4.4.3  (갤러리 443, 포항)
2024 아트레코드청주 (문화제조창, 청주)
2024 낮과 밤 : 김세한 정서온 2인전 (앞산갤러리, 대구)
2024 영남젋은작가초청전 Playground:다시찾은 놀이터 (포스코 갤러리, 포항)
2024 무게중심 (갤러리 오늘, 대구)
2023 군위에서 대구까지 (삼국유사테마파크, 대구)
2023 ART SQUARE 형태놀이 (현대아울렛, 대구)
2023 ARKO 온라인미디어예술활동-투명한 사회 (오버랩, www.weavinglab.net)
2023 아트인홍주 (홍성명동상가 일원, 충남)
2023 아름다운 동행전 (당진 문예의 전당, 충남)
2022 Local : 나의 확장 (동성로 스파크랜드 전광판, 대구)
2022 수성인사이드 49-31 ( 상동 49-31, 대구)
2022 청년미술프로젝트 YAP’22 경계점 : Boundary Point (Exco, 대구)
2022 2nd 청년발굴프로젝트 How are you? (갤러리m, 경북)
2022 Rencontre (Elbirou Art Gallery, 튀니지, 수스)
2022 Mosaic for Afgan Women Japan with Asian Friends (공간 680, 일본 교토)
2022 리믹싱 RE: MIXING (아트랩범어 스페이스 1-5,  대구)
2022 너와 나의 공간 (아트랩범어 스페이스 1-5, 대구)
2021 It''s Time 2 (환갤러리, 대구)
2021 한여름 밤의 꿈 (보나갤러리, 대구)
2021 홈메이드 아트메이트 (안동예술의 전당, 경북)
2020 예술스펙트럼 WE (범어아트스트리트 Space 3-4, 대구)
2020 아트로드 - 수성트레일 전 (수성못 길 오솔길,  대구) 2019 대구여성의 시선 (Exco, 대구)
2018 Year go by (봉산문화회관, 대구)
2017 낯선 풍경속으로 (Gallery SUN, 대구)
2017 달빛 프로젝트- 보내지 못한 편지 (Damso Galerie & Teehaus, 독일 베를린)
2017 Sewol Passion (PG Berlin Gallery, 독일 베를린)
2015 48 Stunden Neukoelln- SOS - Kunst rettet Welt (BLEACH CLUB, 독일 베를린)
2007-2014 다수 단체전과 초대전시 참여' WHERE name_ko = '정서온' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '2018   인천가톨릭대학교 회화학과 졸업

개인전  2025   책가도(冊架圖)_삶의 풍경, 갤러리활, 서울
2024   Shining moments, 커피에스페란토, 서울
2022   책가도_삶을 품다, CICA미술관, 김포
책가도_삶을 품다, 갤러리너트, 서울
2021   MANIF 2021-Art Figuratif, 예술의전당, 서울
2019   Color of Light, 필름포럼갤러리, 서울
2017   Another Me, 필름포럼갤러리, 서울
2015   조신욱전, 사이아트스페이스, 서울

단체전  2026   씨앗페, 인사아트센터 G&J갤러리, 서울(예정)
2025   물 위를 걷다_Walking on Waves, 필름포럼 갤러리, 서울
아트프리즘 「아트페어」, 코엑스, 서울
대한민국 힐링미술대전, 월산미술관, 동해
서울중구예술문화축제, L7 명동 바이 롯데, 서울
스타벅스 그림 공모전 수상작 전시, 서울대학교 치과대학교 병원 갤러리 치유, 서울
서울국제미술대상전, 한전아트센터, 서울
작가(발)굴전, 강남장애인복지관 액티브갤러리, 서울
장항1931, 움직이는 경계_Moving Boundary, 서천 장항의 역사, 서천
세월호 11주기 추모전시, 4.16생명안전교육원, 안산
2024   micro.tele.scope, 필름포럼갤러리, 서울
Connect CICA미술관 국제전, CICA미술관, 김포
세월호 10주기 추모전시, 아트포럼리, 부천
유연한 시간, 필름포럼 갤러리, 서울
월드국제아트엑스포 선정작가전, 코엑스, 서울
2023   2023광화문국제아트페스티벌, 세종문화회관 미술관, 서울
CICA 아트 페스티벌, CICA미술관, 김포
Connection, 필름포럼 갤러리, 서울
한국창조미술대전, 갤러리 라메르, 서울
아트코리아미술대전, 인사아트프라자, 서울
Episodes, 필름포럼 갤러리, 서울
서울국제아트엑스포, 코엑스, 서울
2022   발상의 전환전, 영아트갤러리, 대전
가을동화 기획전, 영아트갤러리, 대전
STANDING, 필름포럼 갤러리, 서울
현대회화의 새바람전, 영아트갤러리, 대전
현대미술 선정작품전, 갤러리인덱스, 서울
아트코리아미술대전, 인사아트프라자, 서울
NFT 비긴즈_메타버스 아트페어, 사이아트스페이스, 서울
한국창조미술대전, 갤러리라메르, 서울
FLY 날다, 필름포럼 갤러리, 서울
2021   JUMMPING, 필름포럼갤러리, 서울
대한민국 청년미술대전, 대한민국예술인센터 로운아뜨리움, 서울
아트프라이즈 강남전, 논현동가구거리, 서울
신진청년작가 날개달다, 인천평생학습관 갤러리나무, 인천
NFT 비긴즈 아트페어, 사이아트스페이스, 서울
ON THE ROCK, 필름포럼 갤러리, 서울
한국창조미술대전, 갤러리라메르, 서울
틈 틈 틈, 필름포럼 갤러리, 서울
2020   마니프-뉴시스 온라인 아트페어, 서울
안티프래질, 필름포럼 갤러리, 서울
오늘의 작가 정신展, 인사아트플라자, 서울
2019   크로아트展, 성도교회 사회교육관 성도갤러리, 서울
브리즈아트페어, 노들섬, 서울
유니온아트페어, 에스팩토리, 서울
백석예술대학교 회화과 동문展, 백석비전센터 비전갤러리, 서울
2018   크로아트展, 성도교회 사회교육관 성도갤러리, 서울
틈 틈 틈, 필름포럼 갤러리, 서울
봉천동 화실사람 전시, 갤러리카페그랑주, 서울
점화_Lighting, 필름포럼 갤러리, 서울
브리즈아트페어, 세종문화회관 미술관, 서울
2017   점화_Lighting, 필름포럼 갤러리, 서울
제3회 2017 신진작가발언전, 아트스페이스퀄리아, 서울
2016   크로아트展, 호민아트갤러리, 서울
서울 컨템포러리 아트페어, 팔레스 호텔, 서울
크로아트展, 서초교회갤러리, 서울
2015   인사동 사람들 展, 갤러리라메르, 서울
광주현대미술대전특별전, 광주유니버시아드, 광주
국토해양환경미술대전 특선, 서울시립미술관 경희궁미술관, 서울
Between Stairs 점화_Lighting, 마노핀갤러리 방배점, 서울
3월 맨발로 서다, 악어惡語, 서울
2014   크로아트展, 갤러리 두, 서울
동작현충미술대전, 동작아트갤러리, 서울
오늘의 작가 정신展, 갤러리라메르, 서울
2013   인사동 사람들展, 갤러리라메르, 서울
수 상   2025   대한민국 힐링미술대전 특선
2025   서울국제미술대상전 서울특별시의회장상
2025   스타벅스 그림 공모전 동상
2024   월드아트엑스포 선정작가공모 특선
2023   2023광화문국제아트페스티벌 공모전 선정, 세종문화회관 미술관
2023   제10회 한국창조미술대전 특선
2023   제2회 아트코리아미술대전 그린상
2022   제10회 아트챌린저공모 특선
2022   제1회 아트코리아미술대전 그린상
2022   제9회 한국창조미술대전 장려상
2022   제10회 대한민국문화예술대전 은상
2021   제2회 대한민국 청년미술대전 입선
2021   제8회 한국창조미술대전 우수상
2018   브리즈아트페어 공모전 선정, 세종문화회관 미술관
2017   신진작가 발얼전 공모전 선정, 아트스페이스퀄리아
2015   국토해양환경미술대전 특선
2014   제4회 동작현충미술대전 특선
2014   제2회 대한민국 명인미술대전 입선' WHERE name_ko = '조신욱' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '1940     서울 출생
1960     홍익대학교미술대학 서양화과 수학

개인전
2016     주재환:어둠속의 변신,학고재, 서울
2015     이매망량(魑魅魍魎), 트렁크갤러리, 서울
2013     더 오드 쇼-장고 주재환, 대안예술공간이포, 서울
2012     관훈갤러리, 서울
2011     현기증(眩氣症), 트렁크갤러리, 서울
2009     갤러리소소, 파주
2007     CCTV작동 중, 프로젝트 스페이스 사루비아다방, 서울
2002     이 유쾌한 씨를 보라, 세종갤러리, 제주
2001     예술마당 솔, 대구
2000-01  주재환: 이 유쾌한 씨를 보라, 아트선재센터, 서울

단체전
2018     4·3 70주년 동아시아 평화·인권展 침묵에서 외침으로, 4·3평화기념관, 제주
2017     문화본일률 : 文畵本一律, 경주솔거미술관, 경주
2017 풀이 선다, 아트 스페이스 풀, 서울
망각에 부치는 노래, 서울시립남서울미술관, 서울
2016     타이틀매치 주재환 vs 김동규, 서울시립미술관, 서울
2015     쓰리스타쑈, 인디프레스, 서울
4. 16세월호 참사 1주기 추모전, 망각에 저항하기, 안산문화예술의 전당, 안산
제22회 4∙3미술제, 얼음의 투명한 눈물, 제주도립미술관, 제주
아시아 그리고 쌀, 전라북도예술회관, 전주
시민과 함께하는 광복 70년 위대한 흐름, 소란스러운, 뜨거운, 넘치는, 국립현대미술관, 서울
용한 점집, 자하미술관, 서울
정글 슈즈, 킴킴갤러리, 라 스위스,낭트, 프랑스
정글 슈즈, 킴킴갤러리, 벨 아미 컨셉 스토어,낭트,프랑스
풀이 선다, 아트 스페이스 풀, 서울
2014-15  내용증명-당신의 삶을 증명하라, 대안예술공간이포, 서울
2014     SeMA 비엔날레, 미디어시티서울 2014, 귀신 간첩 할머니, 서울시립미술관; 한국영상자료원, 서울
오래된 명령과 새로운 수행, 철학아카데미, 서울
원스 이스 낫 이너프, 시청각, 서울
인도네시아-한국작가 기획전: 로우 스트림,  제주현대미술관, 제주
2013     두 섬의 확정, 인도네시아 국립미술관, 자카르타; 토니라카 아트 갤러리, 발리, 인도네시아
밤그늘, 샤머니즘박물관, 서울

레지던시나우, 송원아트센터, 서울
헤이리 슬로우 아트, 달리는 세상, 걷는 예술, 쉬는 마을, 논밭예술학교, 파주
2012     20+ 미술을 만나다, 고양시 승격 20주년 기념 고양작가 20인 초대전, 아람미술관, 고양아람누리, 고양
겸손한 미술씨, 복합문화공간 에무, 서울
경기창작센터 레지던시, 경기창작센터, 안산
2011     시화일률, 가나아트센터, 서울
제23회 조국의 산하, 세종문화회관 광화랑, 서울
데페이즈망 벌어지는 도시, 아르코미술관, 서울
2010     현실과 발언 30년: 사회적 현실과 미술적 현실, 인사아트센터, 서울
사-이에서, 원앤제이 갤러리, 서울
경기도의 힘, 경기도미술관, 안산
노란선을 넘어서, 경향갤러리, 서울
언어놀이, 성곡미술관, 서울
트릭스터가 세상을 만든다, 백남준아트센터, 용인
2009     서울역사박물관 특별기획전시–광화문 연가(年歌): 시계를 되돌리다, 서울역사박물관, 서울
블루닷 아시아 2009, 한가람미술관, 예술의전당, 서울
대학로 100번지, 아르코미술관, 서울
2008     고(故) 김수영 시인 40주기 추모전시-전향기(轉向記), 아트스페이스 풀, 서울
고우영 만화: 네버 엔딩 스토리, 아르코미술관, 서울
팝아툰-타임 캡슐을 열다, 한국만화박물관, 부천
세상이 앉았던 자리, 국민아트갤러리, 서울
워킹 매거진 웍스, 가 갤러리, 서울
2007-08  민중의 고동-한국미술의 리얼리즘 1945-2005, 니가타현립 반다이지마 미술관, 니가타;
후쿠오카 아시안미술관, 후쿠오카; 후츄시 미술관, 도쿄; 오오타니 기념미술관, 니쉬노미야;
미야코노죠 시립미술관, 미야자키, 일본
2007     한국현대시 100년기념-한국현대시인 500인과 미술인 500인의 시와 그림, 세종문화회관, 서울
손장섭∙주재환, 갤러리 눈 창덕궁점, 서울
확-갤러리 눈 창덕궁점 개관, 갤러리 눈 창덕궁점, 서울
상상충전-현대미술을 이야기하는 여섯 개의 상상, 경기도미술관, 안산
2006     잘긋기, 드로운 투 드로잉-소마드로잉센터 개관, 소마미술관, 서울
제9회 황해미술제, 궁민고육현장전, 인천종합문화예술회관, 인천
썸웨어 인 타임, 아트선재센터, 서울
책의 기억, 헤이리 북하우스 갤러리, 파주
2005     광복60년 기념-시련과 전진, 대한민국 국회 중앙광장, 서울
더 배틀 오브 비젼, 쿤스트할레 담슈타트, 담슈타트, 독일
불일치: 한국현대미술, 세인트로렌스 대학교 리처드 에프 브러시 아트 갤러리,캔톤, 미국
2004     평화선언 2004-세계 100인 미술가, 국립현대미술관과천관, 과천
일상의 연금술, 국립현대미술관 과천관, 과천
당신은 나의 태양: 한국현대미술 1960-2004, 토탈미술관, 서울
2003     제50회 베니스 비엔날레–아르세날레, Z.O.U.-Zone of Urgency, 베니스, 이탈리아
미술 속의 만화, 만화 속의 미술, 이화여자대학교 박물관, 서울
조국의 산하-반전·평화, 관훈 갤러리; 아트 스페이스 풀, 서울
웰컴 투 쎄울-서울민족미술인협회 기획 2003, 조국의 산하 2부, 광화문 갤러리, 세종문화회관, 서울
넌, 어디서, 사니?-제1회 신도시, MBC 장항동 방송부지, 고양
2002     제4회 광주비엔날레-멈_춤, P_A_U_S_E, _上_, 광주비엔날레 전시관, 광주
2001     바람바람바람-제13회 조국의 산하, 세종 미술관별관, 세종문화회관, 서울
다음 세대, 아시아 현대미술, 빠싸주 드 레, 파리
2000     부산국제아트페스티벌-고도를 떠나며, 부산시립미술관, 부산
주재환·고승욱의 퍼블릭 비디오, 아트 스페이스 풀, 서울
1999     Korea+JAALA-동북아와 제3세계미술, 서울시립미술관 600년기념관, 서울
1998     98 도시와 영상-의식주(衣食住), 서울시립미술관 600년기념관, 서울
1996     그림으로 읽는 한국 명시, 한국의 대표 시인 주제 미술, 학고재, 서울
1995     해방 50년 역사미술, 한가람미술관, 예술의 전당, 서울
1994     동학농민혁명1백주년기념–새야 새야 파랑새야, 한가람미술관, 예술의 전당,서울
1988     밀라노 트리엔날레, 목각단청 ‘수선전도’ 출품, 세계의 대도시 서울관, 밀라노
1987     반고문, 그림마당 민, 서울
1980-88  현실과 발언동인, 동산방화랑, 서울 외 다수 프로젝트

수상
2002     유네스코 프라이즈 특별상, 2002 광주비엔날레, 광주
2001     제10회 민족예술인상, 한국민족예술인 총연합회

출판물
2001          이 유쾌한 씨를 보라
1980-2000 미술문화

소장
국립현대미술관, 과천
미술은행, 과천
서울시립미술관, 서울
백남준 아트센터, 용인' WHERE name_ko = '주재환' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '개인전
2020년 ‘미동’ / 자하미술관, 서울
2019년 ‘生·물(水)’ / 나무화랑, 서울
2017년 ‘귀가’ / 창룡마을창작센터, 경기
2017년 ‘비오톱의 저녁’ / 나무화랑, 서울
2015년 ‘흐르는 빛’ / 오산시립미술관, 경기
2012년 ‘실존의 포에지(poesie)’ / 관훈갤러리, 서울
2010년 ‘유년의 잔치’ / 갤러리아트사이드, 베이징 중국
2009년 ‘허욕의 자리’ / T Art Center, 베이징 중국
2001년 ‘RETURN’ / 덕원 갤러리, 서울 한국' WHERE name_ko = '최경선' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '개인전
2023 POP KIDS (갤러리H, 서울)
Believing Is Seeing (아터테인 갤러리, 서울)
Face (호서대학교 중앙도서관 전시관, 천안)
2019 최윤정 초대전 (갤러리H, 청주)
2018 There Being (갤러리 반디트라소, 서울)
2016 Follow ME (반디트라소 갤러리, 서울)
Pop Kids (YTN Art Square, 서울)
2014 Into The Pinhole (A.Style, 홍콩)
Show Me the Money (갤러리 그리다, 서울)
2013 Desire (가일미술관, 가평)
Into The Pinhole (갤러리 192, 서울)
2010 Fantasyland (사이아트 갤러리, 서울)
최윤정 개인전 (위드스페이스 갤러리, 베이징)
2009 Moderno (부산아트센터, 부산)
2008 Nostalgia (한전프라자 갤러리, 서울)

단체전
2023 키아프 (코엑스, 서울)
화랑미술제 (코엑스, 서울)
홍범도-장군의 초상 (나무아트, 서울)
우리 안부 실태 조사 (조선대학교 미술관, 광주)
드로잉박스 (아트레온 갤러리, 서울)
연희아트페어 (아터테인 갤러리, 서울)
세상의 모든 드로잉 (아터테인 갤러리, 서울)
소공의 겨울 (소공 스페이스, 서울)
공감23 (아트레온 갤러리, 서울)
2023 광주 에이블아트페어(김대중컨벤션센터, 광주)
2022 19th Asian Art Biennale Bangladesh 2022 (National Art Gallery, Dhaka)
I Am What I Paint (칼리파 갤러리, 서울)
욕망 (아트레온 갤러리, 서울)
토탈 서포트 (토탈미술관, 서울)
Art Project,22 (아트스페이스 케이씨, 판교)
천년길 위에 새겨진, 너와 나의 시선 (경기새천년길갤러리, 수원)
2021 거대한 뿌리 (인사아트센터, 서울)
세상의 모든 드로잉 (아터테인, 서울)
연희아트페어 (아터테인, 서울)
현대미술로 바라본 여성 인권 이야기_행진 (아트노이드178, 서울)
현대미술로 바라본 여성 인권 이야기_행진 (금정예술공연지원센터갤러리, 부산)
현대미술로 바라본 여성 인권 이야기_행진 (서구문화회관, 인천)
공감 2021 (아트레온 갤러리, 서울)
조형아트페어 (코엑스, 서울)
어반 브레이크 (코엑스, 서울)
2020 시각적 상상력 (서해미술관, 서산)
자화만사성 (아트 터미널-작은미술관, 정선)
카트 뮤지엄 (아트 터미널-작은미술관, 정선)
슈퍼 콜렉션 (슈페리어 갤러리, 서울)
일상으로부터 (갤러리 더플로우, 서울)
모두의 드로잉 (아터테인, 서울)
2019 WIT : What''s the Issue These days? (조선대학교미술관, 광주)
이웃작가들 (나무아트, 서울)
Art Busaan (Bexco, 부산)
가족의 정원 (양평군립미술관, 양평)
Do The Right Thing (제주조각공원 전시관, 제주/국회의원회관, 서울)
2018 SCOPE MIAMI (마이애미비치, 마이애미)
대구아트페어 (대구컨벤션센터, 대구)
상하이 아트 페어 (상하이 월드 엑스포 엑스비션&컨벤션 센터, 상하이)
아트 마이닝 (DDP, 서울)
코리안 팝아트 (하남문화재단, 하남)
Do The Right Thing (성북구청갤러리, 서울)
오산시립미술관 신소장품전 (오산시립미술관, 오산)
2017 미디어 엑스터시 (경북대학교미술관, 대구)
Fantastic Show Show Show (갤러리 자인제노, 서울)
Do The Right Thing (글렌데일도서관, LA)
아라리 플랫폼‐POP (아트 터미널_작은 미술관, 정선)
이미지와 타자의 눈 (서산문화센터, 서산)
2016 우리시대의 유산 (양평군립미술관, 양평)
오, 독불장군 (우종미술관, 보성)
2015 서울 어포더블 아트페어 (DDP, 서울)
아트차이나 (national Agricultural Exhibition Center, 베이징)
Run to Fancyland (The Popsy Room, 홍콩)
헬로우! 팝 (제주도립미술관, 제주)
Inter‐Reflection (서산시문화회관, 서산)
Uncertain Paradise (갤러리 이마주, 서울)
아트 부산 (벡스코, 부산)
홍콩 어포더블 아트페어 (HKCEC, 홍콩)
비욘드 팝 (롯데호텔 갤러리, 서울)
컨버전스의 담론전 (사이아트 스페이스, 서울)
2014 Live and Let Live (갤러리 클레이, 시드니)
싱가폴 어포더블 아트 페어 (F1 Pit Building, 싱가폴)
키아프 2014 (코엑스, 서울)
아트광주 14 (김대중컨벤션센터, 광주)
부산아트쇼 2014 (벡스코, 서울)
Asia Contemporary Art Show (콘라드호텔, 홍콩)
화랑미술제 (코엑스, 서울)
2013 소녀의 꿈 (롯데갤러리, 서울)
테헤란로에서 좀비를 만나다 (갤러리 이마주, 서울)
Asia Contemporary Art Show (JW Marriott, 홍콩)
만화에 빠지다 (롯데갤러리, 대전)
보이는대로 (갤러리 그리다, 서울)
흑교전 (TV12 갤러리, 서울)
2012 Asia Contemporary Art Show (Grand Hyatt Hotel, 홍콩)
Real/Unreal (위드스페이스 갤러리, 베이징)
ART Plage (롯데갤러리, 부산/서울)
이것이 대중미술이다 (세종문화회관 미술관, 서울)
Real/Unreal ‐ two realities and an interpretation in between (사이아트 갤러리, 서울)
Can you find me? (일현미술관, 양양)
2011 양평군립미술관 개관기획전 <마법의 나라, 양평> (양평군립미술관, 양평)
Fun + Pop 유쾌한 현대미술 (과천시민회관, 과천)
이머징 아티스트 파트3 (MK2 아트 스페이스, 베이징)
욕망의 심리학‐우리를 말한다 (가일 미술관, 가평)
2010 Art Share (동덕아트갤러리, 서울)
한국 현대미술의 흐름Ⅲ‐Pop Art (김해 문화의 전당, 김해)
Departopia (롯데 갤러리, 안양)
9th Funny Painting Funny Sculpture (세줄 갤러리, 서울)
하하하호호호 (신세계 갤러리, 광주/부산)
Work Collection
국립현대미술관 미술은행(과천), 양평군립미술관(양평), 오산미술관(오산), 하이트진로(서울),
META Korea(서울), 호서대학교(아산), AnaPass(서울), YK BNC(서울) 외 다수 개인소장

Residence Program & Other Project
2013 콜라보레이션 with LOTTE (서울)
2011 콜라보레이션 with HITE (서울)
2011 리인위미 창작스튜디오 (C.O.L. Art Management, 베이징)' WHERE name_ko = '최윤정' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력
중앙대학교 미술학사 사진전공
아주대학교 공공정책대학원 행정학 석사

개인전
2023 카이로스(Kairos)벽화, 예술공간 아름(수원)
2022 화성,묵시의 풍경, 수원sk아트리움 아트갤러리(수원)
2020 화성,묵시의 풍경, 행궁재갤러리(수원)
2019 Tears, ddp알림2관(서울)
2019 화성,언저리풍경, 이데알레(수원)
2017 꿈꾸는 연가, 노송갤러리(수원)

단체전
2025 부산국제사진제 오픈콜 특별전(부산)
2025 Question 프로젝트, KP갤러리(서울)
2024 현대사진가 특별전, 맨해튼(미국)
2024 수원문화예술인 생성형AI미디어아트, 수원시미디어센터(수원)
2024 문화1호선 순회전시(5개도시)도시풍경,도시의산책자(부평,부천,영등포,수원,의정 부 문화재단)
2024 fly high 작가공모기획전, 충무로갤러리(서울)
2023 대한민국국제포토페스티벌 예술의 전당, 한가람미술관(서울)
2022 경기도여성작가회, 강호갤러리(서울)
2022 대한민국포토페스티벌 예술의 전당, 한가람미술관(서울)
2021 아트경기 할로윈아트마켓, 협업공간 한치각(평택)
2021 아트경기 아트로드77 움 갤러리(파주)
2021 현대사진공모선정작가전, 갤러리인덱스,(서울)
2021 인사동사진상회, 토포하우스(서울)
2019 경기도포토페스티벌, 안성맞춤아트홀,(안성)
2019 대한민국포토페스티벌 예술의 전당, 한가람디자인미술관(서울)
2018 경기도포토페스티벌, 이천아트갤러리(이천)
2018 파사페스티벌, 수원미술전시관(수원)
2016 경기도 향토작가 초대전, 평택호예술관(평택)
2016 수원 빛그림 축제전, 수원전통예술관(수원)
2015~19 동북아사진교류전, 수원미술전시관(수원)

수상 및 전시지원 선정
2025 교보교육재단 VR 아트 갤러리 작품 공모작가 선정,(교보교육재단)
2024 문화1호선 순회전시 작가 선정,(부평,부천,영등포,수원,의정부문화재단)
2024 수원문화예술인 생성형AI미디어아트작가 선정, 수원문화재단 수원시미디어센터
2024 fly high 작가공모 선정, 충무로갤러리
2023 대한민국국제포토페스티벌 형형색색 수상, 대한민국포토페스티벌
2023 형형색색 문화예술지원사업 선정, 수원문화재단
2021 제8회 현대사진공모작가 선정, 갤러리인덱스
2021 경기미술품활성화사업 2021 아트경기작가 선정, 경기문화재단
2020 형형색색 문화예술지원사업 선정, 수원문화재단' WHERE name_ko = '최재란' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력
2019 벨기에 브뤼셀 왕립 미술 대학교 조각과 석사 졸업
2016 벨기에 브뤼셀 왕립 미술 대학교 조각과 학사 졸업
2015 프랑스 뚤롱 보자르 예술학부 학사 (DNAP) 졸업

수상 및 선정
2024 안젤리미술관상 수상
2023 노원문화재단 <경춘선숲길 갤러리 & 문화공간 정담 2023 시각예술 전시지원사업>
2021 포르쉐 코리아 ''드리머스 온 아트 어워드'' 선정
2021 제7회 가송예술상 ''우수상'' (동화약품 가송재단)
2020 마포구 <우리동네아트테리어 사업>
2017 ''Young Belgian Talents'' 선정 (Affordable Art Fair Brussels)

개인전
2023 <자취의 기록 n''1> CICA미술관, 김포

단체전
2024 <Drawing now 2024> CICA미술관, 김포
2024 <제19회 광화문국제아트페스티벌" 2023 아시아 현대미술청년작가전"> 세종문화회관미술관,서울
2024 <닌자 (제목 확인 요망)> 공간투, 서울
2024 <AAC 아름다운 동행> 안젤리미술관, 용인
2023 <경춘선숲길 갤러리 & 문화공간 정담 2023 시각예술 전시지원사업 by 노원문화재단>,
경춘선 숲길 갤러리, 서울
2023 <4월의 정원>, 갤러리 The J, 인천
2022 <시간과 공간 사이 <청년,바이브하라>, 익산청년시청, 익산
2022 <2022 그린 르네상스 프로젝트 "자연아트큐브전" by 그룹 야투>, 전주팔복예술공장, 전주
2022 <Drawinging 드로잉 페스티벌> 인사1010, 서울
2022 <THE HOUSE OF MACAN BY 포르쉐 코리아> Cafe Poze, 서울
2021 <Dreamers.On in Porsche Now 부산>피아크, 부산
2021 <선택과 변화> (EX) 이리금융협회. 익산
2021 <2021광주디자인비엔날레_ Dreamers.On by 포르쉐 코리아> 광주비엔날레, 광주
2021 <제7회 여름생색> 인사아트센터, 서울
2020 <충청북도 교육문화회관 특별전 ''자연아트큐브전'' 12x12x12+Nature> 예봄갤러리, 청주
2020 <금강자연미술비엔날레 2020 ''자연미술큐브전 ''12x12x12+Nature''>, 금강자연미술센터, 공주
2020 <Abstract mind> CICA미술관, 김포
2018 <Festival ''Triennale de l''art et du Vegetal''> La Maison Culturelle d''Ath Center, Ath, 벨기에
2018 <Love - Ath> Espace alternatif, Ath,벨기에
2018 <Carte de Visite> ARTopenKUNST Espace vanderborght bruxelles, 브뤼셀, 벨기에
2017 <L''Apropos> KULTURANIVL, 니벨, 벨기에
2017 <Autonomy> Espace alternatif, 브뤼셀, 벨기에
2017 <Young Belgian Talents 6 Artistes, Affordable Art Fair 브뤼셀> Tour et Taxis, 브뤼셀, 벨기에
2017 <Carte de Visite> ARTopenKUNST Espace vanderborght bruxelles, 브뤼셀, 벨기에
2016 <Ministère d'' Affairs Intérieures> Espace alternatif, 브뤼셀, 벨기에
2016 <Extraordinaires objets de l''ordinaire> 갤러리 데 AAB, 파리, 프랑스
2016 <Cachan Biennale d''Art contemporain> Hôtel de ville-Orangerie-Chateau Raspail, 까샹, 프랑스
2014 <INSTALLATION PRESSING-EBB AND FLOW> 갤러리 르 프레싱, 라센쉬르메르, 프랑스

소장
동화약품' WHERE name_ko = '최혜수' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '2025년 황무지 유령의 벌판전 (57Th 갤러리)/ 2024년 황무지, 우상의 벌판전 (나무아트)/ 2023년 나무 파르티잔의 게릴라전 홍범도 장군의 초상전(나무아트)/ 2023년 후쿠시마 조삼모사전 (아르떼 숲)/ 2023년 정전70주년 기획전시 그리운 얼굴전(임진각)/ 2023년 씨앗페 예술인지원 기금마련전 (인디프레스)/ 2023년 10.29 이태원 참사 넋기림전(아르떼 숲)/ 2022년 ‘바라보다’ 개인전(나무아트)/ 2021년 김수영 탄생 100주년 기념전(르프랑)/ 2020년 ‘슬프다’ 개인전(화인아트)/ 2019 대한민국 검찰전 (스페이스 유니온)/ 2018년 평화.통일.염원 DMZ국제초대전(오두산 통일전망대)/ 2018년 핵의 사회전 (무국적 아트스페이스)/ 2018년 ‘아프다’ 개인전 (나무아트)/ 2017년 쓴맛이 사는 맛 단체전 (인사아트플라자)/ 2016년 칡뫼김구 초대전(갤러리 화인아츠)/ 2013년 ‘밤골목 이야기’ 개인전(경인미술관)/ 1986년 젊은 세대에 의한 신선한 발언전(그림마당 민)/ 1985년 80년대 대표작품전(그림마당 민)/ 1985년 광복 40주년 기념 거리개인전(강화장터)/ 1984년 향토작가전(칡뫼화랑)/ 1983년 앙데팡당전(국립현대미술관)/ 1982년 동아미술제 출품(국립현대미술관)' WHERE name_ko = '칡뫼 김구' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '홍익대학교 미술대학 졸업

개인전
2025  더불어 숲, 갤러리오르, 용인
2024  숲, 순환과 치유, 벗이미술관 갤러리, 용인
2023  여름 숲에서, 동백문고갤러리 초대전, 용인
2022  봄이 옵니다, 아산병원갤러리 초대전, 서울
2021  그대의 숲, 갤러리가비 초대전, 서울
2021  작은 숲, 돈의문박물관 작가갤러리 선정작가전, 서울
2020  당신이 그리워질 때, 갤러리가비 초대전, 서울
2019  봄, 날아올라 피다, 대림창고갤러리 초대전, 서울
2017  기억의 숲, 갤러리가비 선정작가전, 서울
2016  분홍 숲, 갤러리라이프 초대전, 서울
2015  실로 그린 숲, 성북예술창작센터 갤러리맺음 선정작가전, 서울
2014  숲. 숨. 쉼, THE K갤러리 초대전, 서울
2012  실로 그린 숲, JH갤러리 선정작가전, 서울
2011  실로 그린 숲, KB국민은행 서초PB센터 초대전, 서울
2009  초록이 그리울 때, 갤러리토포하우스, 서울

단체전
2025  50인의 미리 봄봄, 이글락아트스페이스, 서울
2024  아트경기 런 페스티벌, 갤러리끼, 파주
2024  100인 100작품전, 아트리갤러리, 서울
2024  갤러리71 아트마켓, 갤러리71, 서울
2023  마중물 아트마켓, 김리아갤러리, 서울
2023  아트페스타 제주, 제주국제컨벤션센터, 제주
2022  평화를 준수하라, 전태일기념관, 서울
2021  업클로즈03, 플랫폼엘뮤지엄, 서울
2021  아트 DMZ 페스티벌, 스튜디오끼, 파주
2021  신장동 할로윈아트마켓, 협업공간한치각, 평택
2021  아트경기x 아트로드77. 갤러리움, 파주헤이리
2021  자연과 인간을 잇는 생태예술, 경기도청 북부청사 경기천년길 갤러리, 의정부
2020  제38회 화랑미술제, COEX, 서울
2019  아트 리빙하우스 아트페어, 경기상상캠퍼스 공간1986, 수원
2019  아트경기x 유니온 아트페어, 에스팩토리, 서울
2019  제5회 DOUZ전, 이정아갤러리 공모작가전, 서울
2018  제3회 아트경기 우리집 그림 한점, 이천세계도자센터& 경기도순회전시장
2018  제36회 화랑미술제, COEX, 서울
2017  제51회 한국미술협회전, 예술의전당 한가람미술관, 서울
2016  싱가폴 어포더블 아트페어, F1Pit 빌딩, 싱가폴
2015  즐거운 시작, 희수갤러리 공모작가전, 서울
2015  꿈과 마주치다, 갤러리일호 공모작가전, 서울
2013  제2회 로컬컬러뉴욕공모전, 뉴욕 맨하탄
2013  제47회 한국미술협회전, 예술의전당 한가람미술관, 서울
2013  행복한 화요일, KB국민은행 스타시티PB센터, 서울
2012  일곱개의 시선, JH갤러리 공모작가전, 서울
2011  예술의 전당 작가스튜디오전Ⅱ, 예술의전당 갤러리7, 서울
2011  제45회 한국미술협회전, SETEC, 서울
2011  제6회 경향미술대전, 경향갤러리, 서울
2010  AW컨벤션센터 갤러리AW 작가공모전, AW컨벤션센터, 서울
2010  제14회 나혜석 미술대전, 수원미술관, 수원
2010  The Realism, 갤러리가가 공모작가전, 서울
2009  제38회 구상전, 성남아트센터, 분당
2009  현대미술&빈티지, 갤러리영, 서울
2008  한미교류전, 갤러리훈 뉴욕, 갤러리호 서울
2008  제1회 예술의 전당 작가스튜디오전, 예술의전당 한가람미술관, 서울

수상
2025  용인특례시 문화예술공모사업 선정작가
2024  용인문화재단 전시문화공모사업 선정작가
2021  송정미술문화재단 창작지원 선정작가
2021  경기문화재단 선정작가
2020  서울시 공모 돈의문박물관마을 작가갤러리 선정작가
2019  경기문화재단 선정작가
2018  경기문화재단 선정작가
2015  서울문화재단 주최, 후원 성북예술창작센터 선정작가
2013  제2회 로컬컬러 뉴욕공모전 우수상
2011  제6회 경향미술대전 장려상
2010  제14회 나혜석 미술대전 입선
2009  제38회 구상전 입선
기사
2025.11.05  [용인시민신문] 숲과 더불어 사는 삶 화폭에...홍진희 개인전
2025.10.31  [코리아아트뉴스] 실로 짜낸 숲의 감성 홍진희 개인전, 용인서 개막
2024.11.01  [용인시민신문] ‘눈으로 만나는 자연의 아름다움’ 벗이미술관 홍진희 개인전
2023.07.16  [용인시민신문] 실로 그린 여름 숲은 어떤 모습일까?... 홍진희, 용인 동백문고 개인전
2020.02.19  [투데이갤러리] 홍진희의 ‘그날 오후’
2020.02.23  [e갤러리] 실타래 몸부림처럼 봄이 온다...홍진희 ‘봄날 아침‘
2016.05     개인전 분홍 숲 https://www.youtube.com/watch?v=Iaa8uGL9Z9Q
2016.06     Journal of Creative Arts & Minds 인터뷰기사 (Jumbo Arts International Red Springs, North Carolina, USA)
2015.05.19  서울문화재단 네이버 블로그 인터뷰기사 (http://me2.do/FeH7rkHr) 실로 자연과 열정을 그려내는 작가 홍진희<실로 그린 숲>
2011.06.01  시사저널1128호 ‘여인의 손에서 새로 태어난 실들 화폭 속 숲으로 우거지다’
2011.09.30.  여성가족부 위민넷 공식블로그 ‘무모한 도전? 아니 무한 도전! 실작가 홍진희
출간
2012.07  Healing Forest created by threads Spring Summer, Fall and Winter (주)오렌지디지트코리아
https://youtu.be/2y-6nsIQK_M?si=bsSCmjLs3F71InC8
2012.11  A Love story of Altair and Vega (주)오렌지디지트코리아
https://youtu.be/2y-6nsIQK_M?si=bsSCmjLs3F71InC8
협찬
2010  SBS TV 드라마 <커피하우스> <여자를 몰라> 그림협조

작품소장
국립현대미술관(미술은행), 경기도미술관, 산학협동재단, 해성한의원(강남분원), (주)이와이드플러스, (주)연홍개발, 까페코인(명동1호점), 갤러리가비, JH갤러리, THE k갤러리, 대림창고갤러리, 그 외 개인소장 다수

현재  한국미술협회회원' WHERE name_ko = '홍진희' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = 'ducation
2009 MFA Pratt Institute NY, USA
2007 MA Nottingham Trent University, UK
2003 서울여자대학교 서양화과 학사
Selected Solo Exhibitions
2025 Anonymous Moments / 충주문화재단 목계나래 충주
Anonymous Moments / 갤러리 LP 서울
2024 This Moment / 갤러리 일호 서울
Fragrance of This Moment / 09 Salon 서울
2023 Before Any Words / 갤러리코랄 서울
Before Any Words / 갤러리스틸 안산
Before Any Words / 갤러리도스 서울
2022 Before Thinking / 갤러리한옥 서울
Before Thinking / 사이아트스페이스 서울
2021 Before Mind / 갤러리 너트 서울
Before Mind / CICA 김포
2017 Vantage Point / Lobby Gallery at 1133 Avenue of Americas Presented by ChaShaMa & Durst Organization New York, NY
Before Mind / ChaShaMa space at 55 Broadway New York, NY
2015 In Between / 갤러리 피랑 헤이리
In Between / 스페이스 선 플러스 서울
2014 In Between / 갤러리 이마주 서울
2012 Dialogue of Silence / Yashar Gallery Brooklyn, NY
2011 Dialogue of Silence / Amos Eno Gallery Brooklyn, NY
2010 Dialogue of Silence / 팝아트팩토리 서울
Dialogue of Silence / Chelsea West Gallery New York, NY
외 총 24회
Selected Group Exhibitions
2025 미술인선정작가전 / 갤러리영도씨 서울
70th 창작협회 그룹전시 / 마루아트센터 서울
Inspiration / 아트스퀘어갤러리 서울
MOAF / 아트필드갤러리 서울
화양연화 / 스페이스 B TWO 이대서울병원 서울
MOAF Rising Star 24 / 아트필드갤러리 서울
2024 Unknown Vibes Art Fair / 부띠크모나코뮤지엄 서울
Diaf Plus / Exco Hall 대구
RWA / 09 Salon 서울
69th 창작협회 그룹전시 / 예술의 전당 서울
MOAF 문래아트페어 / 아트필드갤러리 서울
일상이몽 / 스페이스 B TWO 이대서울병원 서울
꿈과마주치다 / 갤러리일호 서울
2023 청년작가 작품전시회 / KT 광화문사옥 서울
서리풀 Art for Art 대상전 / 한전아트센터 서울
68th 창작협회 그룹전시 / 예술의 전당 서울
아트강릉23 / 강릉아트센터 강릉
고택아트페스타 / 소양고택 완주
A Long Way Around / 로이갤러리 서울
Abstract Mind 2023 / CICA 김포
2022 고택아트페어 / 소양고택 완주
Window of The Time / 이랜드갤러리 헤이리 파주
67th 창작협회 그룹전시 / 예술의 전당 서울
아트 페어 BAMA / 벡스코 부산
SHIM Invitational Winter 2022 Showcase / Shim on Artsy.net
2021 호텔 아트 페어 BAMA in Grand Josun / 그랜드조선호텔 부산
SHIM Invitational Fall 2021 Showcase / Shim on Artsy.net
Crossing over the virtual space / ArtHub Virtual Gallery - arthub.co.kr/vrgallery
66th 창작협회 그룹전시 / 예술의 전당 서울
2020 SHIM Invitational Summer 2020 Showcase / Shim on Artsy.net
What Matters most / The Artist Essentials on theartistessentials.com
Drawings in A Time of Social Distancing / LIC Arts on licartists.org/non-traditional
65th 창작협회 그룹전시 / 예술의 전당 서울
2019 Aqua Art Miami / Aqua Hotel, Presented by Shim Miami, FL
Superfine Art Fair / Union Market Washinton D.C.
Creative Mosaic / Plaxall Gallery Long Island City, NY
64th 창작협회 그룹전시 / 인사아트센터 서울
Shim Invitational 7 / Odetta Gallery Brooklyn, NY
LIC Open Studios - Group Exhibition / Gallery Studio 34 LIC, NY
2018 Holiday Small Works / Limner Gallery Hudson, NY
63rd 창작협회 그룹전시 / 예술의 전당 서울
Bushwick Open Studio 2018 / Space 776 Gallery Brooklyn, NY
I DREAM in Blue and Green / LIC Arts Open Gallery at The Factory Long Island City, NY
Summer Exhibition 2018 / LIC Arts Open Gallery at The Factory LIC, NY
2017 Bushwick Invitational / Art Helix, organized by Shim Brooklyn, NY
62nd 창작협회 그룹전시 / 예술의 전당 서울
Making Connections / The Plaxall Gallery Long Island City, NY
The Other Art Fair / Brooklyn EXPO Center Brooklyn, NY
Design Art Fair / 예술의 전당 서울
2016 Wish You Were Here15 / A.I.R Gallery Brooklyn, NY
61st 창작협회 그룹전시 / 예술의 전당 서울
2015 Art Canvas Project / 갤러리 41 서울
Art Canvas Project / Gallerie Kunst Direkt Regensburg, Germany
세월호참사1주기추모전시회/ 예술의 전당 안산
길위에 선 물건들 / 스페이스 선 플러스 서울
2011 You Can Have Your Void And Eat It Too / Space Two Moon Brooklyn, NY
AHL Foundation’s 2nd Silent Auction / The Space on White NY, NY
Lucid Dreaming / Tompkins Square Gallery New York, NY
Pop Up Art Show / Intermix Gallery The Chelsea Room in Hotel Chelsea New York, NY
Better by The Dozen / Beacon Artist Union Beacon, NY
In Vivid color / Euro Asian Art Center Vienna, Austria
2010 Crossroads - Seven Acts / Amos Eno Gallery Brooklyn, NY
Unwind / Lana Santorelli Gallery New York, NY
National Juried Show Media Mix / Bancroft Gallery South Shore Art Center MA
National Juried Show Image Attitude Impression / Union Street Gallery Chicago, IL
Show some Emotion / Sixth Street Gallery Vancouver, WA
2009 National Juried Show Unbound / The Art Center Highland Park, IL
National Juried Show Not Big / Logsdon 1909 Gallery Chicago, IL
Paint / Climate Gallery - Long Island City, NY
National Juried Show 20/20 / Artspace MAGQ Miami, FL
25th Annual National Juried Exhibition New Directions / Barrett Art Center Poughkeepsie, NY
6th Annual International Juried Exhibition / The Shore Institute of Contemporary Arts Long Branch NJ
2006 100+ / Bonington Building - Nottingham, UK
Itemised / Surface Gallery - Nottingham, UK
외 국내외 90여회
Selected Publications
2025 Featured Artist in Studio Visit Magazine (May)
2023 Featured Artist on ArtView 21 Ephotoview.com (July)
2022 Artists to Watch in 2023 in Art Continue Magazine (November)
Lacey Kim: Studio Visit in Friend of The Artist magazine (October)
Featured in CICA Art Now in CICA magazine (September)
Featured Artist in Friend of The Artist magazine (February)
2021 Featured Artist in Boomer magazine (March)
2020 IN STUDIO: Featured Artist on TurningArt.com (October)
Featured Artist on Altiba9.com Isue06 (October)
Artist of The Month on ArtJobs.com (June)
Featured Artist on Hyperallergic.com (April)
2018 Featured Artist on VoyageChicago.com (June)
2016 Featured Artist in Studio Visit Magazine (July)
2014 Artist of The Day on Saatchi Art (May)
Featured Artist on Saatchi Art’s Abstract Collection (February)
2012 Artist of The Week on Visual Overture online Magazine (April)
Selected Activities

전시 중 작가와의 대화 및 특강 등 Artist Talks & Public engagements

Awards and Recognitions
2025 미술인선정작가공모전 선정작가
2025 갤러리LP 신진작가공모전 선정작가
2025 충주문화재단 목계나래 무료대관공모 선정작가
2025 MOAF Rising Star 24 선정작가
2024 갤러리일호 신진작가공모전 선정작가
2023 아트강릉23 최종22인 선정작가
갤러리코랄 작가공모 선정작가
서리풀갤러리 대상전 입선
갤러리도스 작가공모 선정작가
2022 갤러리한옥 신진작가공모전 최우수상
2021 사이아트스페이스 신진작가공모전 선정작가
2021 갤러리 너트 신진작가공모전 선정작가
2020 Artist of The Month in Artjobs.com
2017 Selected Artist in ChaShaMa organization in NYC
2015 스페이스선플러스 신진작가공모전 선정작가
2014 이마주갤러리 선정작가
외 다수
Public Collections
One Medical Group (Cobble Hill, Brooklyn Location), 서울동부지방법원
Selected Press and Interview
May. 2025 ‘Anonymous Moments’ – 김레이시23회개인전 / 시사의창
https://sisaissue.com/View.aspx?No=3650671
Feb. 2025 MOAF Rising Star 24 / ArtField Gallery 아트필드갤러리
https://youtu.be/MD5bCU1cpM4?si=8zssMKIqcqncUGNi
Oct. 2024 ‘This Moment’ / Misulin 미술인
https://www.misulin.co.kr/news/articleView.html?idxno=3196
June. 2023 ‘Before Any Words’ / News Culture 그 어떤 말보다 / NC 전시관
https://www.newsculture.press/news/articleView.html?idxno=525673
Aug. 2022 ‘Zen Painting as Oil on Canvas’ – Lacey Kim Solo Exhibition Before Thinking / HyunBul NEWS 캔버스 오일 페인팅의 禪畵 ‘생각 이 전’ / 현대불교
http://www.hyunbulnews.com/news/articleView.html?idxno=406005
Aug. 2017 ''Meet The Others'' - Lacey Kim / The Other Art Fair
https://www.youtube.com/watch?v=rf01ijTVQxA
Apr. 2015 ‘Emerging Artist Lacey Kim Solo Exhibition IN BETWEEN At Space
Sun+’ / Voice of People 스페이스선 플러스 신진작가전’김레이시 개인전’ / 민중의소리
http://www.vop.co.kr/A00000866430.html
Sep. 2014 ‘Recommended Show by ART IN – Lacey Kim Solo Exhibition IN BETWEEN’ / Culture and Business Journal [아트인선정전시]갤러리이마주 김레이시 개인전 / CNB저널
http://weekly.cnbnews.com/news/article.html?no=114046' WHERE name_ko = '김레이시' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '■ 개인전
2019 ‘각색된 영토‘, 김종영미술관 창작지원전, 김종영미술관, 서울
2013 ‘영원한 휴가’, 서울시립미술관 신진작가 선정전, 스페이스 캔, 서울
2011 ‘풍경의 그늘’, 독일 에힝엔 시립미술관 기획 초대전, 에힝엔, 독일
■ 단체전
2025 ’어제는 과거의 미래다‘전, 송원아트센터, 서울
2023 “평화를 준수하라”전, 전태일 기념관 갤러리, 서울
2022 ‘완충의 시간’, 경기천년길갤러리, 경기도북부청, 의정부
2019 ‘상상의 공식’ 부산현대미술관 신소장 작품전, 부산현대미술관, 부산
2017 ‘경계 155’전, 서울시립미술관 본관, 서울
2016 경기유망작가 생생화화, “14개의 시선”전, 고양 아람미술관, 경기도 고양
2015 “살롱 드 세마” 서울 시립미술관 신소장 작품전, 서울 시립미술관, 서울
2014 “BETWEEN WAVES” 아모레 퍼시픽 미술관 기획 APMAP, 오설록 뮤지움, 제주
2013 "사건들", 국립현대미술관 고양창작스튜디오 전시실, 경기도 고양
2012 “바덴-뷔템베르크를 위한 60인의 작업”전, 징엔 시립미술관, 독일
2011 “No Limits”전, 슈투트가르트 비르트샤프트 하우스, 슈투트가르트, 독일
2010 "디 나투어 페어빈뎃", 빌링엔 슈베닝엔 시립공원, 독일
2009 "챠트(Zart)“전, 얀 후트 기획, 갤러리 ABT ART, 슈투트가르트, 독일
2008 "테스트 빌트“, 폴시티 건물, 슈투트가르트, 독일
2007 "포토 섬머"전, 쿤스트 아카데미 전시실, 슈투트가르트, 독일
2006 쿤스트 프로젝트 "포어 파트", 비어켄 발트 거리, 슈투트가르트,' WHERE name_ko = '김태균' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력
원광대학교 미술대학 서예과 졸업(1기)
동국대학교 인문대학원 미술사학과 석사 졸업
현 재
(사)한국캘리그라피디자인협회 명예회장
(사)한국미술협회 캘리그라피분과 운영위원 및 이사
KBS아트비전 영상그래픽팀 팀장
나사렛대학교 평생교육원 캘리그라피전문가과정 외래교수
2022년 대한민국미술대전 캘리그라피 부문 심사위원장

수상
2015 제9회 다산(정약용)대상시상식 대상 수상(문화예술 부문), 남양주시

저서
김성태,『장천과 함께하는 붓으로 배우는 캘리그라피』, 덕주출판사, 2022

개인전 / 초대전

개인전 및 초대전 18회  / 단체전 250여 회
2025 무우수갤러리 기획 장천 김성태 초대전 ‘나랏말글씨’, 무우수갤러리, 서울
2024 신춘기획 장천 김성태 초대전, ‘광주의 봄’, 관선재 갤러리, 광주
2024 “서울의 봄 in 문래” 기획초대전, 아트필드 갤러리, 서울
2021 장천글숲 갤러리 오픈전, 부산 해운대
2020 충무공탄신475주년.해군창설 75주년 기념 초대전, 해군진해기지사령부
2018 광양본가 그랜드 오픈 기획초대전, 광양본가, 서울
2018 독립운동가 어록 초대전, 독립기념관, 천안
2016 명사시리즈Ⅳ 장천김성태 초청전 “아! 충무공”, 아산문화재단 갤러리
<연장전시 : 2016 독립기념관, 비선재>
2014 명사시리즈Ⅲ 이해인수녀의 시문전 “아이가 희망이다”, 인사동 선화랑
<연장전시 : 2014 부산해운대문화회관>
2013 명사시리즈Ⅱ 다산정약용선생 탄신 250주년 기념전 “아! 여유당”, 아라아트, 서울
2011 명사시리즈Ⅰ 법정스님 1주기 추모 기획초대전,토포하우스, 서울
대표 그룹전
2025 BANK ARTFAIR IN SINGAPORE, Pan Pacific Singapore Hotel
2025 DIAF대구국제아트페어, 대구엑스코, 대구
2025 추사기념사업회, ‘추사는 살아있다’展, 한국미술관, 서울
2024 한국서예의 오늘과 내일 靑龍·白鶴전, 예술의전당 서예박물관, 서울
2024 PINK SEOUL ART FAIR, 서울신라호텔12층
2023 제10회 부산서예비엔날레, ‘세계서화명가홍예전’, 부산
2023 세계서예전북비엔날레 ‘작은 우주 속의 울림’ 초대전, 한국소리문화의전당, 전주
2023 제577도 한글날 기념 ‘한글멋글씨전’, 국립한글박물관
2023 제40회 産經國際書展, 東京都美術館, 日本
2022 예술의전당 ‘쓰지 않는 글씨’ 기획초대전, 서울
2021 무우수갤러리 한글기획초대전 ‘멋짓한글’, 서울
2021 광복76주년 기념 깃발전, 서대문형무소, 서울
2019 동경국제교류전, 우에노미술관, 일본
2017 세계서예전북비엔날레 ‘서론 서예’ 초대전, 한국소리문화의전당, 전주
2017 한국서예큰울림 초대전, 미술세계, 서울
2016 세계서화아트페스티벌 초대전, 여수엑스포 전시관, 여수
2012 외솔 최현배선생 탄생 118주년 기념 ‘도시, 한글로 물들이다’ 초대전, 외솔기념관
2012 한중수교 20주년 기념 中國宋莊文化藝術祭 翰停畵廊 中韓書法邀請展, 北京
2011 문자문명전, 성산아트홀, 초대전, 창원
2011 고 정주영 명예회장 10주기 기념초대전, 현대예술관, 울산
2010 국제현대서법가20인 초대전, 象都美術館, 中國 鄭州
휘호(제호)
2025 화성특례시 승격 현판 휘호
2025 화성특례시의회 승격 현판 휘호
2024 신한금융 신년슬로건
2023 영화 ‘서울의 봄’
2022 국립고궁박물관 ‘궁중 현판전’
2022 아산 충무연수원 ‘나라사랑’ 현판 외 3건
2019 YTN슬로건
2015 영화 <귀향(鬼鄕)> 타이틀
2014 대한민국 청와대 및 대통령실 경호처 홍보영상 타이틀
2014 (주)신세계 경영이념 및 핵심가치
2012 상성리움미술관 ‘화원’ 특별전
2010 상해 엑스포 한국기업관 홍보영상
2010 대한병원협회 사보
2010 한국수자원공사 슬로건
2010 의왕시 슬로건
2009 하남시 슬로건
2009 국순당 이화주 외 다수
2009 여름 교보생명 글판
2007 불교중앙박물관
2006 경상남도 도정 슬로건
2006 금강산 신계사 상량문 및 편액
방송타이틀
드라마 대하드라마 태종 이방원 / 대하드라마 장영실 / 불멸의 이순신 / 전설의 고향 /
일일연속극 무궁화꽃이 피었습니다 / 수목드라마 신데렐라 언니 / TV소설 내 마음의 꽃비 / 임진왜란 1592
교양/다큐 TV쇼 진품명품 / 한국인의 밥상 / 국악한마당 / 우리말겨루기 / 명견만리 /    세상의 아침 / 영상앨범 산 / 동행 / 외 다수
선정
2013 중학교 미술교과서 교학사편 작품 <눈길> 수록
2013 고등학교 미술교과서 천재출판사, 작가 소개
2007 2008 한국문화예술위원회 예술창작지원작가 선정
2005 국립현대미술관 미술은행 작품 매입작가 선정
심사
안견미술대전 / 안향선생 전국 서예·문인화 휘호대회 / 제주한글사랑서예대전
대한민국태을서예문인화대전 / 행안부 주최 지진안전 캘리그라피 공모전
경기도여성기·예경진대회 / 세종기념사업회 한글글꼴공모전
방위사업청 슬로건·손글씨 공모전 / 대한민국미술대전 / 경기도미술대전
추사휘호대회 / 단원미술대전 / 월간서예대전 / 대한민국서예대상전
대한민국여성미술대전 / 대한민국동양미술대전 / 대한민국서예술대전
대한민국열린서예문인화대전 / 경인미술대전' WHERE name_ko = '장천 김성태' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '개인전
2021 어화둥둥 아가야! 한옥갤러리 초대, 서울
2021 꽃으로 핀 바라밀, 마하보디선원 초대, 경주
2020 숨은꽃 님에게 가는 길, 서울
2015 고려불화 재현전,프록시플레이스 갤러리 초대,미국 La
2005 불교회화전, 용인대학교 박물관 등 10여회
주요 초대 기획전
2019 김경호+조이락 2인전 티벳하우스 초대, 미국 뉴욕
2017 고려불화 재현전, 프러싱 타운홀, 미국 뉴욕 등 30여회

현재
조이락 고려불화연구소
문화재수리기능자 모사공 7148호 보존처리공 7547
보존처리공 7547
무우수아카데미 강사' WHERE name_ko = '조이락' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '<학력>
2013년 홍익대학교 미술대학 섬유미술 패션디자인과 졸업

<개인전>
2025 <Digging Out> 라운디드 플랫, 6.27-6.30 서울시
2024 <악취미> 갤러리 모스, 5.24-5.31 서울시
2022 <고리벌레 이야기> 평화문화진지, 서울시 10.22-11.4
2022 <덧칠된 구역> 고양 아람누리, 고양시 7.27~7.31
2022 <입구> 갤러리 카페 가제, 서울시 4.20~5.8
2021 <화면의 조각> 호랑가시나무창작소, 광주시 11.16~11.22
2021 <발생정원-초점 너머의 응시> 우민아트센터, 청주시 9.20~11.6
2020 <발생정원-뒤집힌 시계> 고양 아람누리 미술관, 고양시
2020 <발생정원> 영천 예술 창작 스튜디오, 영천시
2018 <기분 나쁘지 않다> 갤러리 빈칸, 서울시
2014 <역추격> 갤러리 가이아, 서울시
<그룹전>
2025 <풍경-정물> N2 아트스페이스, 서울시 6.27-7.19
2025 <망각의 혀, 타는 눈> 아트스페이스 라프, 서울시 3.14-4.5
2024 <송도유랑> 아트스페이스인, 송도시 10.27~11.1
2024 <Demon’s Tail> 갤러리 호튼 8.6-8.31
2024 <PROSPECT24> 갤러리 디휘테, 서울시 2.16-3.15
2023 <UNDER THE SURFACE> 호랑가시나무창작소, 광주시 12.15~1.15
2023 <Room 360> 온라인 플랫폼 ‘스페이셜’ 10.25-12.31
2023 <확장하는 풍경> 고양 아람누리 미술관, 고양시 10.5-10.13
2023 <미디어는 마사지다> 꼴라보하우스 문래, 서울시 2.22~2.27
2022 <프레즐> 갤러리 가제, 서울시 12.14-12.31
2022 <연석山 호랑가시木> 연석산 우송 미술관 10.1-10.28
2022 <호피투게더> 예술지구 p, 부산 9.20-10.1
2022 <동시다발전> 갤러리 가제, 갤러리 모스, 갤러리 초연, 6.2~6.12
2022 <현실적 몽상가들> 갤러리 모스, 서울시 4.19~4.25
2022 <미술관, 자연을 사유하다> 고양아람누리미술관, 4.13-5.25
2022 <관계의 합성> 호랑가시나무창작소, 광주시 3.15~3.31
2021 <With> 호랑가시나무창작소, 광주시
2021 <나도 아트 콜렉터> 고양아람누리미술관, 고양시
2021 <광부이야기> 호랑가시나무창작소, 광주시
2021 <Trouble in paradise> Round Them Oranges, Jaipur
2020 <인식의 그늘> 시안미술관, 영천시
2019 <드로잉 온 페이퍼> 예술공간 서로, 서울시
2018 <남> 공간 일리, 서울시
2018 <풍경> 갤러리 자작나무, 서울시
2017 <화가의 자화상> 두인갤러리, 서울시
2017 <흐리고 느린> 법련사 불일미술관, 서울시
2016 <예술이란 무엇인가> 반디트라소, 서울시
2016 <그룹 23.5도> 두루아트스페이스, 서울시
2015 <그룹 23.5도> 갤러리 청, 서울시
2015 <그룹 23.5도> 가나아트스페이스, 서울시
2015 <그룹 23.5도> 갤러리 이마주, 서울시
2013 <2013 Tetsuson> 갤러리 뱅크아트, 요코하마
2012 <오늘의 홍익섬유미술 기획초대전>, 한전아트센터 갤러리, 서울시
2012 <선(善)> 서울시립미술관 경희궁분관, 서울시
2011 <아이:I> 골든타워 갤러리, 서울시

<레지던시>
2022 평화문화진지 5기 입주작가
2021 호랑가시나무 창작소 7기 입주작가
2020 영천 예술 창작 스튜디오 12기 단기 입주작가' WHERE name_ko = 'Salnus' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력
2021- 2024 Maryland Institute College of Art
BFA in Painting
summa cum laude

개인전
2024 Lazarus Hall Gallery, 131 W North Ave, 볼티모어, 매릴랜드 - To Be Continued
주요 단체전
2024 워싱턴 DC 한국 영사관, 워싱턴, DC - Summer Comes to My Hometown, Seoul
Fox Gallery, 볼티모어, 매릴랜드 - Spotlight, Graduating Seniors in Focus
2023 Deckers Gallery, 볼티모어, 매릴랜드 - Juried Undergraduate Exhibition

수상경력
교내 수상(Maryland Institute College of Art)
2024 Distinguished International Student Award
2023 General Fine Arts Department Recognition Award
Juried Undergraduate Exhibition Fall 2023 Merit Award
Presidential Scholarship
MICA Visionary Scholarship
2022 Foundation Department Recognition Award
Distinguished International Student Award
Presidential Scholarship
MICA Visionary Scholarship
2021 Presidential Scholarship
MICA Visionary Scholarship' WHERE name_ko = '이채원' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '<개인전>
아시안게임(1986), 동아미술제 초대전(1987), 민주항쟁(1987), 전농동 588번지(1990), 불교상징(1994), 전통문양 초대전(1995), 동강 백성들(2001), 태풍 루사가 남긴 상처(2002), 두메산골 사람들(2004), 인사동 그 기억의 풍경(2007), 신명 설치전(2008), 산을 지우다(2008), 인사동, 봄날은 간다(2010), 장날, 그 쓸쓸한 변두리 풍경(2015), 청량리 588(2015), 사람이다(2016), 산골사람들(2018) 등

<출판 및 공저>
『청량리 588 사진집』, 『가서, 아름다웠다고 말하리라, 천상병 사진집』, 『인사동 이야기 사진집』, 『두메산골 사람들 사진집』, 『동강 백성들, 포토 에세이』, 『불교 상징 사진집』, (공저) 『우포늪』, 『동강』, 『낙동강』, 『서울환경』, 『한국불교미술대전』(전7권) 등

<수상 및 선정>
동아미술제 연작 「홍등가」 대상(1985)
아시안게임기록사진 공모전 대상(1986)
강원다큐멘터리 작가 선정(2002)
『서울문화투데이』 문화대상(2018)' WHERE name_ko = '조문호' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '개인전
* ''장터를 지나 문화유산으로'' 정영신 개인전. 2025 갤러리 브레송
* ‘내한티는 요 장터허고 사람이 보약이랑께’ 정영신 장터사진전. 2025 갤러리인덱스
* ''진안(鎭安), 그 다정한 풍경''전 /공동체박물관 계남정미소
*''어머니의 땅'' (2024 전주서학동사진미술관)
* 혼자가본 장항선 장터길 출판기념전 (2023 갤러리 인데스,인사동)
* 정영신의 ''장날'' 전 2021~2022 돈의문박물관마을 작가갤러리
* <어머니의 땅> 2021 인사동 나무아트
* <장에 가자> 2020 갤러리브레송
* <장터에서 백만 가지 표정을 담다>(2018.정선고드름축제장)
* <정영신의 한국의장터전>(2017, 전국5일장박람회)
* <장날>(2016, 아라아트)
* <장에가자프로젝트2>(2015 정선시외버스터미널 문화공간)
* <장에가자>(2015, 아라아트)
* <정영신의 장터>(2012, 덕원갤러리)
* <정영신의 장날설치전> 2008 정선, 만지산 서낭당터
* <정영신의 시골 장터>(2008, 정선아리랑제 설치전)

단체전
* 2022 기억의시간 - 담양뎐
* <순실뎐>(2017 나무화랑)
* <병신무란 하야제>(2017 아리수갤러리)
* <촛불역사전>(2017 광화문광장)등의
다수의 단체전을 열었으며,
​저서로는
* 정든땅 그리운장터-전라남도편 ‘내한티는 요 장터허고 사람이 보약이랑께’ 2025.눈빛
* ''시골장터에서 만난 똥강아지들'' 2023.이숲
* ''혼자 가본 장항선 장터길'' 2023.눈빛
* ''어머니의 땅'' 2021.눈빛
* ''장에 가자'' (시골장터에서 문화유산으로) 2020.이숲
* ''정영신의 장터이야기3'' 2019 라모레터e북
* ''정영신의 장터이야기2'' 2019 라모레터 e북
* ''정영신의 장터이야기1'' 2019 라모레터 e북
* ''장날'' 눈빛사진가선 29 정영신사진집 2016.눈빛
* ''정영신의 전국 5일장 순례기'' 2015.눈빛
* ''한국의 장터'' 2012.눈빛아카이브
* ''시골장터이야기'' 2002.진선출판사
2013~2014년 농민신문 “정영신의 장터순례” 연재
2014년 교통방송 TBN "정영신의 장터 속 이야기“

현재
* 문인협회회원, 남북문학교류위원회 위원
* 서울문화투데이 편집위원.객원기자
* ''정영신의 장터이야기'' 서울문화투데이 연재중 ~' WHERE name_ko = '정영신' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '2024
구로구 지원 청년이룸 개인전 Love All
2026
씨앗페 전시 예술의 씨앗, 숲을 이루다 한국스마트협동조합
2025
MEDEL GALLERY / SHU X GALLERY / VINCI
문래 아트페어
순환 틈 : 모든 게 사라지고 ○○만 남았다
2024
프로젝트 스페이스 가제
2023
제7회 아트 오일장 이화
2023 아시아프
2023.04
Academic VIVIDROOM
2023 단국대학교 서양화과 학사 졸업
2022 〈ON AIR〉
단국대학교 졸업전시
7월의 작가전 환, 2인전
Drawinging
서고정 초대전
다색[ ]화
제50회 구상전 공모대전 - 서울 공모대전 입상' WHERE name_ko = '한미영' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '025 잘린문장 열린광장 (민주화 운동 기념관)
2024 개인전 시간이 조금 걸리더라도  (동두천 생태평화 미술관 더꿈)
2020 판화,판화,판화,(국립현대미술관)
2019광장 미술과사회(국립현대미술관)
2017 층과층사이 -과천현대미술관
2015 광주비엔날레 20주년 특별전 (광주시립미술관)
16섯번의 개인전과 그룹전 다수
2012 구본주 예술상수상
국립현대 미술관 경기도 미술관 일본 사키마 미술관,후쿠오카 아시아미술관 등 작품소장

저서/나는 농부란다, 시간이 조금걸리도라도 등' WHERE name_ko = '이윤엽' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '개인전
2025 이문형개인전 2025 (한뼘미술관,천안)

단체전
민화의 비상전_제6장.반복과 패턴 (한국미술관,서울) 외 20회
아트페어
2025 제7회 대한민국 민화아트페어 개인부스전 (setec,서울) 외 1회

수상
제13회 현대민화공모전 우수상' WHERE name_ko = '이문형' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '개인전
1회 2001.5 ‘Giggle''기획초대전 (Moro갤러리,서울)
2회 2001.11 ‘Time & Space'' (Artist Guild Space gallery-프랑스 파리)
3회 2005.5 ‘한 여름밤의 꿈’기획초대전 (주 이태리 한국대사관-이태리 로마)
4회 2010.5 ‘아이들 놀이’기획초대전  (아트스페이스 H,서울)
5회 2021.6 ''책읽는 아틀리에 출간기념 기획초대전''(파주 지혜의 숲)
6회 2024.9 ‘나를 열고 들어가는 열쇠’ 기획초대전 (춘천 갤러리더웨이)
7회 2025.4 ‘ 책 읽는 아틀리에＇기획초대전( 수원 갤러리 영통)
8회 2025.5 ‘생명의 모양＇기획초대전 (파주 갤러리지지향)
9회 2025.12 ‘도서관 환타지＇기획초대전(오산 더스페이스갤러리)
2인전
2018.6 ‘삶을 위한 에너지를 만드는 방법(구가 미술관 기획초대전 -일본 후쿠오카)

수상
1997 대학미전 -특선(호남 대학교)
2003 제 4회 ‘지오반니 뻬리꼬네’ 전국미술대전-대상 (Primo Premio)
(La pittura 4 edizione ''Giovanni Pericone)
벽화복원
2008 암석벽화복원 ( 아프리카 탄자니아 유테스코 지정 세랭게티 국립공원  )

작품소장
주 이탈리아 한국대사관
주 이탈리아 로마 한인성당
이탈리아 로터리 클럽 Fiuggi
아시아출판문화정보센터
한문화콘텐츠연구소

단체전
1997-1999.2006 ‘色’전 (관훈갤러리,서울)
1998 프린트 아카데미전 (과천 현대미술관)
1999 동끼전 (관훈 갤러리,서울)
版Channels전(갤러리 보다,서울)
2003 ‘Glocallizzazione (Inter Culturale Permenente Roma gallery-이태리 로마)
2010. 동덕창학 100주년.동덕여자대학교60주년 기념전(동덕아트 갤러리)
2018. 동덕여자대학교 회화과 50주년 기념전 목화전 (동덕아트 갤러리,동덕여자대학교 박물관)
2020. 30회 목화전 (온라인 전시)
2021. 6회 히즈아트페어 (인사아트프라자)
2021.Something전(래미안 갤러리)
2022. 31회 목화전(온라인 전시)
2022. 북아티스트 텐트 (파주 지혜의 숲)
2024 오늘의 수원전(수원시립만석전시관)
2025 .32회 목화전(동덕 갤러리)
2025LA아트쇼(LA컨벤션센터)/BAMA부산국제화랑아트페어(부산벡스코)/경남아트페어(창원컨벤션)
출간
2021.6 ''책읽는 아틀리에'' 출간 (천년의 상상)
컬럼연재
2016.8~2020.12 스포츠 경향 그림서평(Painting book review) ‘천지수의 책 읽는 아틀리에’ 컬럼 연재
2023.2-2024.5 스포츠경향 ‘천지수가 읽은 그림책’서평
2023.8-현재 책키라웃,문화뉴스, MHN스포츠 ‘천지수가 읽은 그림책’서평
‘천지수화가의 아프리카북에이징’그림서평/인터뷰365 천지수화가의 ‘페인팅북리뷰' WHERE name_ko = '천지수' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '도예가' WHERE name_ko = '김지영' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '서울과학기술대학교 도예과 졸업' WHERE name_ko = '김태희' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '홍익대학교 회화과 졸업' WHERE name_ko = '정재철' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '홍익대학교 미술대학 회화과 및 동대학원 회화과 졸업
홍익대학교 일반대학원 미술학과 회화전공 박사 졸업' WHERE name_ko = '장희진' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '오픈갤러리 등록 작가' WHERE name_ko = '김유진' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '학력
서울대학교 미술대학 박사

개인전
2010 갤러리 아트링크
2008 닥터 박 갤러리
2007 SEO갤러리 2007 1st 영아티스트 선정
2004 갤러리 아트링크
2004 세종갤러리

단체전
2009 The Flower 카이스트 테크노경영대학원
2009 송은미술대상전 인사아트센터
2009 꽃밭에서 63스카이아트
2009 스트리밍 라이프 갤러리H
2009 컴 투 라이프 모인화랑
2008 양평환경미술제-Inevitable Cloud 마나스갤러리
2008 국제 아트 북 메이킹 페스티벌 바움아트갤러리
2008 신 소장품전 서울시립미술관
2008 한국현대판화 1958-2008 과천국립현대미술관
2007 인천국제여성미술비엔날레 인천
2007 잘 기억나지 않는 나무들 IM ART 갤러리
2007 뽁뽁이 예화랑, 문예진흥기금 국제교류부분 선정
2007 서울미술대전-판화 서울시립미술관
2007 에디션의 미학 마산아트센터
2007 스펙트럼 오브 더 코리안 컨템포러리 프린트 러시아
2007 헬로우 첼시! 2007 미국 PS 35 갤러리
2007 금강미술대전 대전시립미술관
2007 시간의 빡센 두께 토포하우스
2007 개성&열정 닥터박 갤러리
2007 쇼파 위의 미술관 진흥아트홀
2006 프린트 스펙트럼 선화랑
2006 우리 사회를 찍다 전 국민대 미술관
2006 서울판화 2006 모란갤러리
2005 흔들림전 토포하우스
2005 서울판화2005 토포하우스
2005 거주전 서울대학교 우석홀
2004 아시아 청년미술제 창원성산아트홀
2004 서울대학교 미술대학 온라인 동문전 오픈아트
2003 디지털+카메라전 조흥갤러리
2003 상상도서관전 스톤앤워터갤러리
2003 한국현대판화전·국제판화교류전 세종문화회관 미술관
2003 헤이리 페스티벌- 아트 인 아키텍쳐 커뮤니티 하우스
2002 한국현대판화가협회 전 관훈미술관
2001 서울대학교 대학원-북경중앙미술학원 교류전 중국북경중앙미술학원
2001 겹겹이 쌓인 전 보다갤러리
2001 한국현대판화가협회 공모전 서울시립미술관
2000 판!클럽 작은 회동전 조흥갤러리
2000 한국현대판회가협회 공모전 종로갤러리
2000 The other side 전 한전 플라자 갤러리

작품소장
과천국립현대미술관 미술은행, 서울시립미술관, 삼성병원 암센터, 기업은행, 서울 중앙 지방법원, 남서울대학교, 세오갤러리

수상경력
2000 한국현대판화가협회공모전 특선
2001 한국현대판화가협회공모전 우수상
2006 공간 국제 판화 비엔날레 Selected Works
2007 한국문화예술위원회 문예진흥기금
2007 신진 예술가 지원 부분 선정
2007 금강미술대전 특선
2008 30회 중앙미술대전 선정작가
2009 서울문화재단 예술표현활동지원 부분 선정
2009 송은 미술 대상 선정 작가

행정경력
2003~2005 상명대학교 출강
2007 백석대학교 출강
2002~2010 서울예술고등학교 출강

논문
2001 식물을 소재로 한 다층적 시각체험의 표현연구' WHERE name_ko = '고자영' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '서울산업대학교(현 서울과학기술대학교) 도예과 졸업
이동구 도예공방 운영' WHERE name_ko = '이동구' AND (history IS NULL OR trim(history) = '');

------------------------------------------------------------
-- 4. history_en from artists-data.ts
------------------------------------------------------------
UPDATE artists SET history_en = 'Resident artist at Dalcheon Art Studio' WHERE name_ko = '기조' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
M.A., Department of Formative Arts, Graduate School of Arts, Chung-Ang University

Solo Exhibitions
2024 21st Century City, KMJ Art Gallery, Incheon
and 12 more

Group Exhibitions
2025 ASYAAF, Culture Station Seoul 284, Seoul
2024 "Art·T Incheon" Art Bank Curated Exhibition, Namdong Culture Center, Incheon
Peace and Ecosystem, Pyeonghwa Nuri-gil Eoulrim Center, Yeoncheon
Acquisition Collection Exhibition Pixel: Reinterpretation of Landscape, Yeoju Museum of Art
Art Museum Ryeo, Yeoju
and total 250+ exhibitions

Awards
2019 Angyeon Sarang National Art Competition Grand Prize
2019 Indépendant KOREA Best Excellence Award
2018 Incheon Art Competition Grand Prize

Selected Programs
2024 Incheon Foundation for Arts & Culture, Arts Creation Support
2023 Seoul Foundation for Arts and Culture, Senior Artist Support
2023 Incheon Foundation for Arts & Culture, Arts Creation Support
2020 Goyang Art Activity Support Project "Goyang Art Bank"
2020 Gyeonggi-do Culture New Deal COVID-19 Art Vaccine Project
2020 Seoul Public Art Project Artwork Planning Proposal Competition
2019 Incheon Foundation for Arts & Culture, Artistic Expression Activities

Collections
Anguk Cultural Foundation, Yeoju Museum of Art (Art Museum Ryeo), Incheon Foundation for Arts & Culture Art Bank, Yangpyeong Museum of Art, Gyeonggi Cultural Foundation,
MMCA Art Bank, Yangpyeong Museum of Art, Gwangju Museum of Art, Samtan Art Mine' WHERE name_ko = '김규학' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = '* B.F.A., Department of Western Painting, Chugye University for the Arts
* M.Ed., Department of Art Education, Graduate School of Education, Dongguk University
* Master''s thesis: Study on the Works of Goam Lee Ungno
* Publications: A Collection of Kim Dong Seok Paintings (Sol & Science Publishing, 2019)
The Path...It Was Everywhere (Chai DEU Publishing, 2017)
THE PATH (Chai DEU Publishing, 2017)
* 31 Solo Exhibitions (Seoul, Suncheon, Busan, Wonju, Gumi, Beijing, LA)
* 41 Art Fairs (Seoul, Busan, Daegu, Cheongju, Gwangju, Shanghai, Beijing, Hong Kong, LA, New York, Denmark, Singapore)
* 610+ Curated and Group Exhibitions
* Teaching & Professional Experience
Adjunct Professor at Samyuk College of Health, Sahmyook University, Chugye University for the Arts, Baekseok Arts University, Chonnam National University, Dongguk University; Art Gifted Education at Northern Seoul Office of Education and Gangdong Office of Education; Secretary General of Korean Fine Arts Association; Chairman of Korean Fine Arts Association Songpa Branch; President of Songpa Artists Association
* Jury & Committee Memberships
Standing Chairman of Hanseong Baekje Art Awards, jury member for Republic of Korea Peace Art Competition, Haengju Art Competition, Shin Saimdang Art Competition, Republic of Korea Culture Art Competition, Gwangyang Art Competition, Chungnam Art Competition, Suncheon Art Competition, Yeosu Sea Plein Air Art Festival, Patriotic Art Competition, Civil Servants Art Competition, and numerous other national art competitions
* Major Collections:
MMCA (Art Bank), Korean Buddhist Art Museum, Muksan Art Museum, Yangpyeong Museum of Art, Whanki Museum, Jeonnam Museum of Art, Seoul Asan Medical Center, SK Telecom Headquarters, Presidential Palace of France, Yantai Wengyeong University (China), Chonnam National University, Chugye University for the Arts, Songpa-gu Office, Ansan Culture & Arts Center, Morning Letter Foundation, Kookmin Ilbo, National Defense Culture Research Center, Royal Square Hotel, Seoul Eastern District Prosecutors'' Office, Shinpoong Paper Co., OR Chem Co., Gimcheon Grape CC, Cover art in college textbook "Introduction to Modern Psychology" (Sol & Science Publishing), KBS, NETFLIX, OBS appearances and artwork sponsorship, Kyohak Doseoh (high school art textbook artwork) and numerous private collections
* Current: Full-time artist, Member of ADAGP (International Copyright Society), Korean Fine Arts Association, Songpa Artists Association, Nurimuri' WHERE name_ko = '김동석' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
1967 B.F.A., Western Painting, Hongik University
M.A., Graduate School of Art Education, Hongik University

Professional Affiliations
Member, Korean Printmakers Association
Jury Member, Grand Art Exhibition of Korea

Exhibitions
1978-2009, Solo Exhibitions (20 exhibitions)
1960-1962, 1st-3rd Free Art Exhibition, Central Public Information Center
1963, Kim-Lee-Kim 3-Person Exhibition, Central Public Information Center
1963-1966, 1st-4th Ttuami Exhibition, Central Public Information Center
1976 Oct 22-26, Print Exhibition, Glorichi Gallery
1977-1978, Creative Artists Association Exhibition, MMCA
1978, Art Organizations Invitational Exhibition, MMCA
1978-1992, Modern Printmakers Association Exhibition
1978-1981, Seoul International Print Exchange Exhibition, MMCA
2000 Apr 8-May 10, Print Exhibition, Geurim Gallery
2000 Jun 12-25, Kim Sang-gu Print Exhibition, Kim Nae-hyun Gallery
2000, Development and Transformation of Korean Prints, Daejeon Museum of Art
2001, Korea-China-Japan Woodcut Print Exhibition, Kim Nae-hyun Gallery
2001, Art Book, Paris
2001, The Beginning of Art III, Sungkok Art Museum
2002, Korean Contemporary Art, Argentina
2003, Seoul Book Art - Art Book Art, MMCA
2004, A Window to Korea, Shanghai, China
2004, Print 14
2005 Mar, Kim Sang-gu Woodcut Print Exhibition, Insa Art Center
2005 Jul 4-14, Kim Sang-gu Woodcut Exhibition, Bundo Gallery
2007 Publishing Art: Modern and Contemporary Woodcut Prints

Awards
1962-1963, 1st-2nd Sinsanghoe Competition Special Selection, Encouragement Prize
1962-1965, 11th-12th, 14th National Art Exhibition Selection
1962, 6th Contemporary Artist Invitational Competition Selection
1964, 3rd New Artist Award Exhibition Encouragement Prize' WHERE name_ko = '김상구' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'M.A., Department of Oriental Painting, Graduate School, Hongik University

Solo Exhibitions
2022 <The Beauty of Vanishing Things>, Sai Art Space, Seoul

Group Exhibitions
2025 <Manlyu Gwijong>, Idea Center, Seoul
Young Artist Curated Exhibition <Between Between Rest>, Culture Experiment Space Hosu, Seoul
4-Person Exhibition <NO MATTER>, N2 Art Space, Seoul
Hankyoreh Curating School 3rd Selected Artist <Between, or_Between>, Gallery Ilho, Seoul
2024 Dongjak Art Gallery Exhibition Planning Selected Exhibition <Depth of Traces>, Dongjak Art Gallery, Seoul
<Simultaneous Art Alliance>, N2 Art Space, Seoul
Emerging Artist Exhibition <Beautiful Record>, Culture Experiment Space Hosu, Seoul
2023 Emerging Artist Curated Exhibition <Artist H''s Shop>, Dongtan Art Square, Hwaseong City Cultural Foundation, Gyeonggi-do
<Dongjak: Expansion>, Dongjak Art Gallery, Dongjak Cultural Foundation, Seoul
3-Person Exhibition, GS E&C Gallery Siseon, Seoul
<In Contemplation, Each Has Their Own Sound>, A-Lounge, Seoul' WHERE name_ko = '김영서' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = '2013 M.F.A., Department of Painting, Graduate School, Hongik University
2024 Ph.D. coursework completed, Department of Painting, Graduate School, Hongik University

Solo Exhibitions
2016 Pictorial Impulse, PiaLuxART Gallery, Seoul, Korea
2023 Wildflower Season 1, Hongik University Museum of Modern Art, Seoul, Korea

Group Exhibitions
2024
Seoul Young Artist Discovery Project Bisang, Sewoon Hall, Seoul, Korea
Stepping Stone for a Leap, Tapgol Museum of Art, Seoul, Korea
Bank of Korea Emerging Artist Exhibition, Bank of Korea Gallery, Seoul, Korea
2021 Space Simulation, AI Museum x VR Museum, Seoul, Korea
2017 Union Art Fair, Seoul, Korea
2016 OLD & NEW, Kansong Art and Culture Foundation, Seoul, Korea
2016 Rooftop Life Exhibition, Alternative Space Oktop, Seoul, Korea
2014 Flea Market + Another Christmas, Posco Art Museum, Seoul, Korea
2013 Challenge, Hongik University Modern Art Museum, Seoul, Korea
2012 Close to You, Street Gallery, Seoul, Korea
2014 Log Out, Litmus Gallery, Ansan, Korea' WHERE name_ko = '김우주' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Current: Representative of printmaking studio ''Panhwabang'' / Member, Korean Contemporary Printmakers Association / Member, Hongik Printmakers Association
Former: Lecturer at Kaywon University of Art & Design, Kaywon Arts School

Solo Exhibitions
2018 3rd Solo Exhibition ''Right and Wrong'', Moon Fragment Gallery, Seoul
2006 ''Metamorphosis Episode'', Selected & Curated, Alternative Space Loop, Seoul
2004 1st Print Solo Exhibition ''Memories of the King'', Invitation Curated, Cheongdam Mac Gallery, Seoul
2003 Kim Jong-hwan Print Collection Published

Publication
2017 The Difference - Daily Print: It''s OK Even If It''s Your First Time

Group Exhibitions
2023 Hongik Printmakers Exhibition, Total Museum of Art, Seoul
2023 Five & Passion Gift Exhibition, Gallery Naemamdaero, Suwon
2022 Korean Contemporary Printmakers Association Exhibition ''MetaPrint 2022'', Hongik University Museum of Modern Art, Seoul
2021 Korean Contemporary Printmakers Association Exhibition ''PostPrint 2021'', Kim Hee-su Art Center Art Gallery, Seoul
2020 Wonju Cultural Foundation 10th Anniversary ''Stature and Expansion of Wonju Art'' Emerging Artists 5-Person Invitational, Wonju Chiak Arts Center, Wonju
Talking About Printmaking, Gaon Gallery, Incheon
2019 Korean Contemporary Printmakers Association Exhibition, Dongduk Art Gallery, Seoul
2018 Daelim Changgo 14th Curated Exhibition ''Ctrl V'' 5-Person Print Exhibition, Daelim Changgo Gallery, Seoul
Korean Contemporary Printmakers Association Exhibition, Dongduk Art Gallery, Seoul
60 Years of Korean Contemporary Prints - Making Prints, Gyeonggi Museum of Art, Ansan
2017 Korean Contemporary Printmakers Association Exhibition, Hongik University Museum of Modern Art, Seoul
DMZ Festival, Cheorwon and Inje area
2008 Seogyo Nanjang, KT&G Sangsangmadang, Seoul
2007 Seoul Art Competition - Print, Seoul Museum of Art, Seoul
2006 M.A. Thesis Exhibition ''Syndrome'', Hongik University Museum of Modern Art, Seoul
Contemporary Printmakers Association Curated ''Print Spectrum'', Gallery Sun, Seoul
AFI 2006 Program ''Exploring Alternative Art Markets'', Alternative Space Loop, Seoul
Korea-China Print Exchange Exhibition, Hongik University Museum of Modern Art, Seoul / Lu Xun University, China
Gwangju Biennale Open Art Market, Gwangju Folk Museum, Gwangju
Danwon Award Winner Invitational, Ansan Danwon Museum of Art
Contemporary Printmakers Association Curated ''Printing Contemporary Society'', Kookmin University Museum, Seoul
2005 Korea-China Print Exchange Exhibition, Lu Xun University, Shenyang, China
Museum on the Go, Hwacheon Tomato Festival, Gangwon-do
Korean Contemporary Prints Sweden Exhibition, Inflan Museum, Sweden
10th Anniversary Nauri Curated Exhibition ''[end]=[and]'', Gallery Ol Seoul, Wonju Culture Center Gangwon-do
Korea-Japan Cultural Exchange Exhibition ''Writing and Drawing'', Coex Pacific Hall 4, Seoul
Hongik Printmakers Association Exhibition, Gwanhun Gallery, Seoul
Samcheong Art Festival, Gallery Dool, Seoul
Outstanding Young Artist Exhibition, Gallery Gaia, Seoul
Insadong People ''Ideal and Reality'' Exhibition, Hanaro Gallery, Seoul
''Space of Repetition'', Gallery Sup, 3-Person Exhibition, Seoul
HOPE Korea-Japan Exchange Exhibition, Korean Cultural Center at the Japanese Embassy, Seoul
''A Chicken''s Dream'' Curated Selected Artist Exhibition, ThinkThink Children''s Art Museum, Seoul
2004 ''No Frame'' Exhibition, Art Space Hue, Seoul
2003 Korea Racing Authority + Ministry of Agriculture Sponsored ''Happy Table'' Exhibition, Insa Art Center, 2-Person Exhibition, Seoul

Workshops
2024 EBS Sponsored Event - Silkscreen Workshop (3 sessions)

Awards
2005 Danwon Art Competition Print Category ''Best Excellence Award'', Ansan Danwon Museum of Art
Haengju Art Competition Print Category ''Excellence Award'', Ilsan Lake Park, Goyang
2004 Korean Contemporary Print Competition ''Lee Sang-wook Award'', KEPCO Plaza, Seoul

Collections
Daelim Changgo Gallery
Art Space Hue
Ansan Foreign Workers Support Center' WHERE name_ko = '김종환' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
1986 M.F.A., Department of Sculpture, Graduate School, Seoul National University
1976 B.F.A., Department of Sculpture, College of Fine Arts, Seoul National University

Publication
Between People, Hexagon Publishing, Korean Contemporary Art Series 003

Solo Exhibitions
2013 Gahoedong 60, Seoul (Steel Drawing)
2012 Gwanhun Gallery, Namu Gallery (Between People)
2010 Gahoedong 60 (Living Landscape)
2012-1986, 12 Solo Exhibitions

Group Exhibitions
2013 Birth, Art Journey, Yangpyeong Museum of Art
Listening to Sculpture, Bupyeong Art Center
Trajectory of Korean Contemporary Art, Seoul National University Museum of Art
Our Stories, Doowon Gallery
Fashion Landscape, Jongno Urban Gallery
Human and Existence, Kim Chong Yung Museum
2012 2nd Incheon Peace Art Project, Incheon Art Platform
ADAMAS253 Prologue, Adamas253 Gallery, Heyri
Seochon: Meeting Underground, Artside Gallery
Incheon, Speaking of Sculpture, Gaon Gallery, Incheon
Seoul Sculpture Society 33rd Exhibition, Moran Museum of Art, Maseok
The Teacher''s Shadow, The Students'' Light, Kim Chong Yung Museum
Sea of Peace, Boundary on Water, Incheon Art Platform
Christmas in Korea, Lotte Gallery, Yeongdeungpo
Artistic Period, Gallery Interalia
2011 Gently Looking In, Incheon Art Platform
Happy Together, Lotte Gallery, Yeongdeungpo
Wood Sculpture Exhibition, Kyungpook National University Museum
Korean Art Today, Korean Cultural Center, Sydney, Australia
Sea of Conflict, Sea of Reconciliation, Incheon Art Platform
Discovery of Life, Bupyeong Art Center
Villa d''Art and Artists, Topohaus
2010 Stories of Our Lives, Lotte Gallery, Daejeon
Inter_View, Incheon Art Platform
Hyehwadong-in Exhibition, Cheonga Gallery
Seoul Sculpture Society 30th Anniversary Exhibition, Seoul Art Center
Oh, Happy Day, Lotte Gallery, Anyang
2009 Ubo Manri (Ox Steps Ten Thousand Li), Shinsegae Gallery
Haechi Parade, Seoul Urban Gallery Project 2009
Love is Rainbow, Lotte Gallery
Seoul Sculpture Society 30th Anniversary - Thirty Years Journey, Gongpyeong Art Center

Collections
MMCA, Gwacheon, Gyeonggi-do
Daejeon Museum of Art, Daejeon
SoMA (Seoul Olympic Museum of Art), Seoul
Moran Museum of Art, Namyangju, Gyeonggi-do
National Folk Museum of Korea, Seoul
Incheon Art Platform, Incheon
Gimpo International Sculpture Park, Gimpo, Gyeonggi-do
Jikji Culture Park, Gimcheon, Gyeongsangbuk-do
Incheon Foundation for Arts & Culture Art Bank, Incheon

Residency
2013 Incheon Art Platform Residency Program 4th Cohort Resident Artist, Incheon' WHERE name_ko = '김주호' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'B.F.A., Department of Western Painting, Sungshin Women''s University
M.F.A., Department of Painting, Graduate School of Art, Hongik University

Solo Exhibitions (12 gallery exhibitions, 36 total)
Art Space H, Gallery Doo, Space Eom, Gallery Tam, Alternative Space Noon, Geurimson Gallery, etc.

Group Exhibitions (185 total)
Seoul Auction, Galleries Art Fair, National Assembly Building, 63 Building Sky Art Museum, Sejong Center for the Performing Arts, etc.
Art Fairs: Galleries Art Fair, Seoul Art Show, Busan International Art Fair, Art Asia, Bank Art Fair, Urban Break, Daegu Art Fair, ASYAAF, International Craft Art Fair, Lotte Hotel Art Fair, etc.

Other Activities
MMCA Art Bank Collection, Seoul Museum of Art SeMA Selected Artist,
Kimi Art Selected Artist, Carnival Pizza Art Product Collaboration,
Village Art Project - Art Seen by Heart Selected Artist,
Naver Project Flower CreaterDay4 Selected Artist' WHERE name_ko = '김주희' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = '1955 Born in Yeongam, Jeollanam-do
1982 B.F.A., Western Painting, Hongik University
1994-1997 Woodcut Print Researcher / Visiting Professor, Lu Xun Academy of Fine Arts, China
1996- Honorary Associate Professor, Lu Xun Academy of Fine Arts, China
2017- Director, Korea Woodblock Culture Center; Community Woodblock University
2022 Visiting Professor, Graduate School of Public Policy, Woosuk University

Solo Exhibitions (Recent)
2024
Kim Joon Kwon Woodcut Print Exhibition: Walking Mother''s Land, Arte Sup, Seoul
Kim Joon Kwon Woodcut Print Exhibition: Standing on Baekdudaegan, Hajeongwoong Museum, Yeongam
Kim Joon Kwon Woodcut Print Exhibition: Seeping into Baekdudaegan, Presidential Archives Exhibition Hall, Chungnam National University, Cheongju
2022-2023
KIM JOON KWON WALKING THE MOTHERLAND, Saenggeo Print Art Museum, Jincheon
2022
1985-2022 Kim Joon Kwon Woodcut Prints — Song of the Knife, Song of the Block, Song of Life, Gimhae Culture Center Yunseul Museum
Kim Joon Kwon Woodcut Print Exhibition "Song of the Mountain", Seoul Arts Center
2021
Green Mountain Light Shining... Kim Joon Kwon Woodcut Exhibition, Namu Gallery, Seoul

Group Exhibitions (Recent)
2024
4th Woodblock University Exhibition, Namu Gallery, Seoul
21st Century Contemporary Art in Busan, Busanjin Yeosa Exhibition Hall
Donghak Revolution 130th Anniversary Memorial Exhibition "For the World", Donggok Museum of Art, Gwangju
Donghak Revolution 130th Anniversary "Teukcheon Yeomin" Exhibition, Gwangju Museum of Art
World Revolutionary Art, Wansan Library, Jeonju
10th Silk Road International Art Festival, Shaanxi Art Museum, Xi''an, China
2023
New Beginning - Neo Art Gallery Opening Invitational, Cheongju, Chungbuk

Collections
Domestic
MMCA, Government Art Bank, Seoul Museum of Art, Jeju Museum of Contemporary Art, Gwangju Museum of Art, Cheongju Museum of Art,
Yeongam Hajeongwoong Museum, National Assembly of Korea (donated), etc.
International
National Art Museum of China, China Printmaking Museum, Lu Xun Academy of Fine Arts Museum, etc.' WHERE name_ko = '김준권' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Solo Exhibition
2025 <Wild Grass Grows Anywhere>, Rigak Museum, Cheonan, Korea
2025 <This Is Not an Exhibition>, N2 ART SPACE, Seoul, Korea
2023 <Surface of Time>, CICA Museum, Gyeonggi-do, Korea

Group Exhibition
2024 <Fateful Data>, Buzzinga, Gangneung, Korea
2024 Donggang Photo Festival International Competition, Donggang Museum of Photography, Yeongwol, Korea
2024 <Silence>, Hanjigaheon, Seoul, Korea
2024 KTX 20th Anniversary Exhibition <Beyond the Journey>, Culture Station Seoul 284, Seoul, Korea
2023 <Observer on the Stairs>, Metaphor 32, Seoul, Korea
2022 Purple Marble, Royal X Gallery, Hwaseong, Korea
2018 <New York New York New York>, Art Space J, Gyeonggi-do, Korea
2017 <ASYAAF 2017>, DDP, Seoul, Korea
2016 <Hello Media Art>, KT&G Sangsangmadang, Seoul, Korea
2016 <Seen vs Shown>, Korean Cultural Center, Washington, USA
2016 <1st K-foto Festival BUFF>, BEXCO, Busan, Korea
2016 <.JPG>, Jigeum Yeogi, Seoul, Korea
2015 <Namsong Media Art Festival>, Seongnam Art Center Museum, Gyeonggi-do, Korea
2014 <U-Street Media Art Exhibition>, Gangnam Station Media Pole, Seoul, Korea
2013 <Animamix Biennale>, Daegu Art Museum, Daegu, Korea
2013 <Another Painting I Drew>, Seoul Museum, Seoul, Korea
2013 <Stars of the World>, Hangaram Art Museum, Seoul Arts Center, Seoul, Korea
2012 <9th Busan International Video Art Festival>, Busan Museum of Art, Busan, Korea
2012 <Politics of Memory>, Zaha Museum, Seoul, Korea
2012 <Daegu Photo Biennale Young Artist Exhibition>, Bongsanmunhwa Center, Daegu, Korea
2011 <New Generation Art Star Exhibition>, Hangaram Art Museum, Seoul Arts Center, Seoul, Korea' WHERE name_ko = '김호성' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Solo Exhibitions
2021 From the Curved World, Gallery Bresson, Seoul, and others
2019 From the Incident, Gallery Guppy, Seoul
2019 Photography Touches the World, Photographers'' Gallery Korea, Seoul
2019 TOUCH, Gallery Bresson, Seoul
2018 Return of Images, Third Story IMAGE2IMAGE, Space The In, Seoul
2015 CONTACT, Photographers'' Gallery Korea, Seoul
2013 IMAGE2IMAGE2, Gallery Yuki, Tokyo, Japan
2012 IMAGE2IMAGE, Gallery Yuki, Seoul
2009 Strange Day, Space Ru, Seoul

Group Exhibitions
2022 On the Essence, Hongcheon Museum of Art, Hongcheon
2022 GRAPHOS, Vium Gallery, Seoul
2022 Incheon Open Port International Photo & Video Festival: 15 Korean Artists, Chinese History Museum, Incheon
2022 TANGLED COSMOS, Metal House Gallery, Yangpyeong
2022 Neo-orbis: New World, Hongcheon Museum of Art, Hongcheon
2022 Contemporary Korea Photography, Kim Young-seob Photo Gallery, Seoul
2021 Taste of Weather, Gallery Bresson, Seoul
2021 Looking 3 - Looking Again, Gallery Azit, Seoul
2021 Environmental Exhibition: To The Negentropia, Chungmuro Gallery, Seoul
2020 Seoul in My Mind, Geumsan Gallery, Seoul
2020 Relating, Vium Gallery, Seoul
2020 Expanded Senses, Y Art Gallery, Seoul
2019 Post Photo, Topohaus, Seoul
2019 On Photography, Gallery Bresson, Seoul
2018 Cat, Ami Museum, Dangjin, Chungnam
2018 D Cut Image for Yourself, Art Space Et, Seoul
2018 Dissolving Boundaries: Between Photography and Painting, Ecorak Gallery, Seoul
2017 Dissolving Boundaries II: Between Photography and Painting, Ecorak Gallery, Seoul
2012 Let''s Play, Space Radio M, Seoul
2011 Photography... Art as Medium, Space Ino, Seoul
2011 Office Worker Exhibition, Small Space Iso, Daegu

Publications
2019 <TOUCH>, Namib Publishing
2019 <On Photography>, Nunbit Publishing, pp. 37-43' WHERE name_ko = '라인석' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
1984 B.F.A., Department of Painting, College of Fine Arts, Hongik University

Professional Affiliations
1985 Representative, Seoul Art Community
1987 Member, Mural Painting Group Hwalhwasan
1991 Secretary General, National Art Council
1992 Director of External Cooperation, Korean National Artists Association
1995-1998 Woodcut Print Instructor, Hankyoreh Culture Center
2004-2006 Co-Representative, Anseong Stream Restoration Citizens'' Group
2004- Co-Chair, Green Anseong 21

Exhibitions
1983 Ryu Yeon-bok, Park Jong-won, Shin Jin-sik, Third Art Museum
1984 Art of Life Exhibition, Third Art Museum, Gwanhun Gallery, Arab Gallery
1985 Eulchuk Year Art Grand Festival, Arab Gallery
1985 Representative Works of 1980s National Art Exhibition, Hanaro Gallery
1985 Korean Art: The Power of the 20s Exhibition, Arab Gallery
1986 Fresh Statements by Young Generations, Geurim Madang Min
1986 Korean Minjung Print Exhibition, Osaka
1986 JALLA Exhibition - Minjung of Asia, Tokyo
1986-1990 Unification Exhibition, Geurim Madang Min
1987 Satire and Humor Exhibition, Geurim Madang Min
1987 Anti-Torture Exhibition, Geurim Madang Min
1987 Korean Minjung Print Exhibition, Geurim Madang Min
1988 Korean Minjung Print Exhibition, Seoul, Jeonju, London
1988 JALLA Exhibition - Wind Blowing Through Asia, Tokyo
1988 Korean Minjung Art Exhibition, Hirakata
1988 Korean Minjung Print Collection Exhibition, Geurim Madang Min
1989 Ryu Yeon-bok Minjung Print Exhibition, SPARC Gallery, LACC University, Chicago Hankyoreh Branch
1989 Minjung Print Exhibition, USA
1990 Education Field Exhibition, Geurim Madang Min
1990 Farmers'' Art Exhibition, Yonsei University Baekyang-ro
1990 Gwangju, Oh May!, Geurim Madang Min
2000 Ryu Yeon-bok''s Life Exhibition, Gongpyeong Art Center, Art Center Mano
2003 Bongcheon-dong Naum House - Building a World Together Fundraiser Exhibition
2004 Ryu Yeon-bok: Standing on This Ground, Insa Art Center
2004 Ryu Yeon-bok Woodcut Print Exhibition, Anseong Civic Center
2004 Centennial of Korean Immigration to America Commemorative Print Invitational Homecoming Exhibition - The Breath of Korea, Boksagol Culture Center Boksagol Gallery
2004 People Who Draw on Wood, Gyeonggi Cultural Foundation Exhibition Hall
2004 Eommoe, Mt. Moak Exhibition, Jeonbuk Museum of Art
2005 Red Blossom: Northeast Asian 3-Nation Contemporary Woodcut Print Special Exhibition - Korean Ancient Prints, Ilmin Museum of Art
2005 Meeting Art, We Go to Anseong, Alternative Art Space Sonamu
2007 The Power of Spirit That Awakens Existence, Gapyeong Gail Museum of Art
2009 Solo Exhibition, Jain Zeno Gallery' WHERE name_ko = '류연복' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = '2022 Ph.D. candidate, Department of Oriental Painting, Graduate School, Hongik University
2022 M.F.A., Department of Oriental Painting, Graduate School, Hongik University
2020 B.F.A., Department of Oriental Painting, College of Fine Arts, Sungshin Women''s University

Group Exhibitions
2025 <Manlyu Gwijong>, Flow & Bit, Seoul
<NO MATTER>, N2 Art Space, Seoul
2024 <Relational Turning Point>, Gallery Hoho, Seoul
<Encountering Dreams>, Gallery Ilho, Seoul
<Landscape Liberation>, Gallery Jayu, Seoul
2023 <In Contemplation, Each Has Their Own Sound>, A-Lounge Gallery, Seoul
<Greekyland: Geeks of Wonderland 2023>, K Museum of Contemporary Art, Seoul
<Year-End Simultaneous Group Exhibition Art Alliance 2023>, Gallery Moss, Seoul
<Contemporary Art Meets Sejong – Sejong Story Media Exhibition>, Gwanghwamun Square, Seoul
2022 <Gallery Siseon 2-Person Exhibition>, GS E&C Gallery Siseon, Seoul

Art Fairs
2024 <2024 Insadong YOUNG & FUTURE Art Fair>, Insa Central Museum, Seoul
2023 <BAMA Busan International Art Fair>, BEXCO, Busan
2022 <FOCUS ART FAIR PARIS - Art Boom>, Carrousel du Louvre, France

Solo Exhibitions
2022 <Invisible Project>, Sai Art Document, Seoul' WHERE name_ko = '리호' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
2010 M.F.A., School of the Art Institute of Chicago, Printmedia, USA
2002 B.F.A., Department of Printmaking, Hongik University

Awards
2025 Galleries Art Fair Zoom-In Artist, Korea Galleries Association, Seoul
2018 SoMA Drawing Center Artist, Seoul
2017 New Discourse, Excellence Award, Sai Art Institute
2010 Nippon Steel Competition/U.S.A Presidential Award, Chicago, USA
2009 The Korean Honor Scholarship, Embassy of Korea in the USA
2009 Thomas Baron Scholarship, Ox-Bow School of Art, USA
2009 Cheongju International Craft Biennale Selection, Cheongju
2009 Steve S. Kang Young Artist and Scholarships, USA
2009 Nippon Steel Competition/U.S.A Presidential Award, Chicago, USA
2008 Nippon Steel Competition/U.S.A Presidential Award, Chicago, USA
2007 The Fine Art Finals Scholarship, Finalist, Mid-West, USA

Residencies
2021 Cheongju Art Studio, Cheongju
2019 Daegu Art Factory, Daegu
2016 Youngeun Museum of Contemporary Art, Gyeonggi-do
2016 Global Painting Retreat, Chang Jung University, Taiwan
2013 Goyang Studio, MMCA
2011 Frans Masereel Centrum, Belgium
2010 Andover Newton Theological School, Boston, USA

Collections
2019 "Rain" (2010), Purdue University, Indiana, USA
2018 Drawing Portfolio, SoMA, Seoul
2016 "Plastic Square" (2016), Youngeun Museum, Gyeonggi-do
2016 "Resistance" 2-work series (2014), Youngeun Museum, Gyeonggi-do
2016 "5x7_Crazy about" Children & Artist 1:1 Collaboration Project (2016), Artist Book, Hyundai Children''s Book Art Museum, Gyeonggi-do
2014 "Plastic Green" (2013), Space 291, Seoul
2011 "Rain" (2011), Frans Masereel Centrum, Belgium
2011 "if ''U'' don''t understand me..." 2 of 9-work series (2011), Frans Masereel Centrum, Belgium
2011 "Do NOT ENTER" (2011), Frans Masereel Centrum, Belgium
2010 "I said too much last night" (2010), John Flaxman Artist Book Collection, Chicago, USA
2010 "Dithering" (2010), John Flaxman Artist Book Collection, Chicago, USA

Solo Exhibitions
2026 Representation of Memory, Gallery Nut, Seoul
2025 Light Traces_Repetition, Gallery Daseon, Gyeonggi-do
2024 Representation After Light, Seocho Cultural Foundation Seoriful Gallery, Seoul
2023 Thin and Flat Image, Misajang Gallery, Seoul
2022 Plasticated Transparency, Art Soombi, Seoul
2021 Green Gables Happening, Cheongju Art Studio, Cheongju
2020 Green Gables, ART SPACE IN, Incheon National University, Incheon
2017 When I See You, Sai Art Gallery, Seoul
2016 Plastic Promise, Youngeun Museum, Gyeonggi-do, Yongin Cultural Foundation, Gwangju-si Support
2016 Crouching Throwing Stones, Cheongju Museum of Art Daecheongho Branch, Cheongju-si Support
2015 Plastic Society II, Alternative Space Noon, Suwon
2014 Plastic Society I, Gallery AG, Seoul Foundation for Arts and Culture, Korea Mecenat, Anguk Pharmaceutical, Nagwon Musical Instruments Arcade Support, Seoul
2014 Plastic Green, Space 291, Seoul
2010 My One False Image - Plasticated Falsity, Gallery X, Chicago, USA
2009 Plastic Beauty, Base Space, Chicago, USA

Selected Group Exhibitions
2025 Kiaf 2025, COEX Hall, Seoul
2025 The Drawing, SoMA, Seoul
2025 Saturation of Emotion, Gallery Daseon, Gyeonggi-do
2025 Galleries Art Fair_Zoom In Selected Special Exhibition, COEX Hall, Seoul
2025 Encountering Dreams, Gallery Ilho, Seoul
2024 Peer Film Festival, Peer Contemporary, Seoul
2022 Andemic Upcycle, Gwangmyeong Art Center, Gyeonggi-do
2022 Pexma2022_Adventurous Departure, Peer Contemporary, Seoul
2021 Tomorrow Exhibition_Drag and Draw, SoMA, Seoul
2021 Meeting of Art and Technology, Gallery Park Young, Gyeonggi-do
2021 Strangers Arriving in an Unfamiliar City, Cheongju Art Studio, Cheongju
2020 Youngeun Jigi, Youngeun Museum, Gyeonggi-do
2020 Goldcan Art Plan, Donuimun Museum Village Seogung Gallery Cafe, Seoul
2020 "Lee Gwang-gi''s On/Offline Art Show" 3 video works, YouTube, Naver TV, Art Gyeonggi & Studio Kki, Seoul
2020 Intersected Gazes, Daegu Art Factory, Daegu
2019 Editable, Suchang Youth Mansion, Daegu
2019 Young Korean Artists, Purdue University, Embassy of Korea Support, Indiana, USA
2019 Cityscape, CICA Museum, Gyeonggi-do
2018 Square, CICA Museum, Gyeonggi-do
2018 Do Art, Palais de Seoul, Ministry of Culture, Sports and Tourism Support, Seoul
2017 Early Spring Pointillism, Gyeongui Line Book Street, Hankook Paper Support, Seoul
2016 Empowerment, Chang Jung University, Taiwan
2015 Useless but Useful, Osan Museum of Art, Amorepacific Support, Gyeonggi-do
2015 Color of Things Exhibition, Gyeongnam Museum of Art, Changwon, Gyeongnam
2014 Sustainable City - Flowers II, Epic Gallery, Ecological Aesthetics Lab, Daejeon
2013 Once Upon A Time, Viridian Artists, New York, USA
2013 Sustainable City - Flowers, Space C, Ecological Aesthetics Lab, Daejeon Cultural Foundation Support
2013 5mm x 7, Artist Book Exhibition, Goyang Studio, MMCA, Gyeonggi-do
2013 Same Trade, Yeoinseuk Gallery, Gunsan, Jeonbuk
2013 Fluxus Weather Forecast, Goyang Studio, MMCA, Gyeonggi-do
2013 Silly Question Wise Answer, Kunstdoc, Seoul
2011 Community Show, Andover Newton Theological School, Boston' WHERE name_ko = '민정See' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
B.F.A., Department of Fine Arts, College of Arts, Chonnam National University
M.F.A., Department of Fine Arts (Western Painting), Graduate School, Chonnam National University

Solo Exhibitions
2024 People Met at Candlelight Square, Gallery Saenggaksangja, Gwangju
2023 Park Seong-wan Solo Exhibition, Gimnaetgwa Gallery, Gwangju
2023 Studio The Tamsa, Candlelight Gallery, Namyangju
2022 Landscape Beyond the Wind, Buk-gu Culture Center, Gwangju
2021 April Heading to May, Chonnam National University Yongji Hall, Gwangju
2021 Park Seong-wan Exhibition, Cheomdan Veterans Hospital, Gwangju
2020 Light and the Heart''s Hometown - Everyday Ideal, Haedong Culture & Art Village, Damyang
2019 Sea Frog, Sochon Art Factory, Gwangju
2018 Strange Memory of the City, 515 Gallery, Gwangju
2018 Park Seong-wan Invitational, Jangsu Museum of Art, Jangsu / Art G&G, Daegu
2018 Conscience Emission, Ppongppong Bridge, Gwangju
2018 Young Artist Invitational, Soam Museum of Art, Gwangju
2017 Unexpected Everyday, Lotte Gallery, Gwangju
2017 From Berlin to Georgetown, China House, Penang, Malaysia
2017 Tru Blue, Dalmoe Museum of Art, Damyang
2015 Construction Site Diary, Kumho Gallery, Gwangju
2015 Conscience Emission, Ppongppong Bridge, Gwangju
2015 Under Construction, Space K, Gwangju
2014 Park Seong-wan Invitational, Coffee Roasting House Maru, Gwangju
2013 Around the Neighborhood, Lotus Gallery, Gwangju
2012 Construction Site Picture Diary, Asia Culture Maru, Gwangju
2012 Landscapes Abound, Gallery Saenggaksangja, Gwangju

Group Exhibitions
2025 Acrylic Smashing, Gallery B, Seoul
2024 For a World Where All Are Equal, Donggok Museum of Art, Gwangju
2024 May Art Festival, Citizen Gallery, Gwangju
2024 Interwoven Stories, Sakima Art Museum
2024 Climate Is Strange, Yeonnam-jang, Seoul
2023 May Exhibition, Mudeung Gallery, Gwangju
2023 Armistice 30th Anniversary Exhibition, Eunam Museum of Art, Gwangju
2022 Dear My Gwangju - Art Market, Shinsegae Gallery, Gwangju
2022 Climate Justice, Catholic Lifelong Education Center, Gwangju
2022 City''s Boundary and Crack, Lee Kangha Museum of Art, Gwangju
2022 Damyang Art Week - Leisurely, Damidam Art District, Damyang
2021 Pulse of Namdo Figurative Painting, Muan Oh Seung-woo Museum of Art
2021 Ode to Green Bamboo, Dambit Art Warehouse, Damyang
2021 Korea-China Exchange Exhibition - Reinterpretation and Expansion of Space, Dambit Art Warehouse, Damyang
2021 Art That Became Roh Moo-hyun, May Museum of Art, Gwangju
2020 DEEP DIVE INTO YOU, Kumho Gallery, Gwangju
2020 5.18 40th Anniversary May Art Festival - We Were There, May Museum of Art, Gwangju
2020 Mudeung-gil Art Walk, Gukyun Museum of Art, Gwangju
2019 Stuffed Memory, Eunam Museum of Art, Gwangju
2019 Cinema Gwangju - Into the Memory, Lotte Gallery, Gwangju
2019 Contemporary Art in Namdo, Dambit Art Warehouse, Damyang
2019 Bitgoeul Yesterday and Today, Yesulgonggan Jip, Gwangju
2019 Living City, Art of Life, Haedong Culture & Art Village, Damyang
2018 100 Artists'' Art Exhibition, Gwangju Museum of Art Geumnam-ro Branch
2018 Korea-France International Art Exchange Exhibition - Connecting, Eunam Museum of Art, Gwangju
2018 Art Gwangju 18, Kim Dae-jung Convention Center, Gwangju
2018 Our Neighborhood Winter Story, Lotte Gallery, Gwangju
2017 Korea-Thailand Contemporary Art Exhibition, Silpakorn University Museum / Arteri Gallery, Thailand
2016 RIVERS: Transformative Way of Life - Asian Contemporary Art Network, Gwangju Museum of Art
2016 Ode to Youth 5-Person Exhibition, 515 Gallery, Gwangju
2016 Prologue, Penang, Malaysia
2015 Kim Whanki International Art Exhibition, Kim Whanki Birthplace, Sinan Anjwa-do
2014 New Spring Chat, Lotte Gallery, Gwangju
2014 Eyes of Asia, Baekmin Museum of Art, Boseong
2014 KATALISTA, La Salle University Gallery, Bacolod, Philippines
2013 Platform Warehouse Sale, Art Platform, Incheon
2013 Passion of Our Times, Baekmin Museum of Art, Boseong
2013 Aesthetic Sense, Lotte Gallery, Gwangju
2012 Heroes of the Times, Muan Oh Seung-woo Museum of Art
2012 Young Artist Support Exhibition, Daedong Gallery, Gwangju
2012 Spring Flounder, Dohwaheon Museum, Goheung
2012 Three Lights in Bloom, Woo Je-kil Museum of Art, Gwangju
2012 Critical Point, Space K, Gwangju
2012 Charity Bazaar, Space K, Seoul
2012 V-Party Vol 3, Schulz & Jung Gallery, Gwangju
2011 Gongpyeong Art Fair, Gongpyeong Art Center, Seoul
2011 Promising Buds, Hakmyeong Museum of Art, Gangjin
2011 Art Process, Mudeung Museum of Contemporary Art, Gwangju
2011 V-Party Vol 2, Gallery D, Gwangju
2010 Residency Artist Exhibition, Daedong Gallery, Gwangju
2010 Young Perspective, Lotte Gallery, Gwangju
2010 8th Gwangju Biennale Man In Bo, Biennale Exhibition Hall, Gwangju
2010 Hue, Cheonan Civic Culture Women''s School

Residency
2020 Honglim Creative Studio Resident Artist
2012 Mali Home Residency, Penang, Malaysia

Awards
2012 Eodeung Art Festival Grand Prize' WHERE name_ko = '박성완' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Solo Exhibitions (Invitational)
2025 Invitational Solo Exhibition: Recording the Day When Fragments of the Past and Pieces of the Future Pass By, Gallery Cheongpung, Gangneung, Korea

Group Exhibitions (Invitational)
2025 Future Yarning, Piano Craft Gallery, Boston, USA
2025 Boundary and Beyond, Arts Collaborative Medford, MA, USA
2025 Information Overload, 808 Commonwealth Gallery, Boston, USA
2025 Urban Resistance, Arise Artspace, Busan, Korea
2024 Changing Tides, Hopkinton Center for the Arts, Massachusetts, USA
2024 Digital Soup Residency at Fountain Street Art Sidewalk Gallery, Boston, USA
2023 Digital Soup Residency at Cyber Art Gallery, Boston, USA
2023 Water, Ancient Greek Philosophy and in Western Alchemy, LaguanaART.com Gallery, Mission Viejo, California, USA
2023 Boston MFA Mixer, Nancy and Edward Roberts Gallery, Lesley University College of Art and Design, Boston, USA
2022 What''s Next: Perspectives, Micro to Macro, Emerson College Media Art Gallery, Boston, USA
2022 Unfolding, Behind VS Shadow, Boston, USA
2022 Burning Man Decompression, Knockdown Center, New York, USA
2022 Banging the Door, Piano Craft Gallery, Boston, USA
2021 "God of Water", Bower Union, New York, USA' WHERE name_ko = '박소형' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
- 2016 Musashino Art University, Department of Oil Painting, Oil Painting Major

Solo Exhibitions
- 2025 Gallery Chungjang 22 Invitational <refresh Gwangju>
- 2025 Dohwaheon Museum Invitational <refresh Goheung>
- 2024 Gallery 177 Invitational <refresh Busan>
- 2024 Noeul Artisan Center Invitational <refresh Seoul>
- 2024 Seolmijae Museum Invitational <refresh>
- 2020 Art Space At Solo Exhibition <Tiger Exhibition>
- 2017 THE PLOT GALLERY Invitational <Fresh Paintings>
- 2017 BANKAN Encore Invitational, Japan
- 2015 BANKAN Invitational, Japan

Group Exhibitions
- 2024 N2 Art Space Group Exhibition <Simultaneous>
- 2023 Arisu Gallery Group Exhibition <The Giving Tree>
- 2016 Roppongi National Art Center 5 Art Exhibition, Japan
- 2016 Musashino Art University Graduation Exhibition, Japan

Collections
- 2025 Dohwaheon Museum / Work: Black Hole

Lectures
- 2018 Sejong Science Arts Gifted School Special Lecture [Interpreting the Unconscious]
- 2024 Sejong Science Arts Gifted School Special Lecture [Interpreting the Unconscious]' WHERE name_ko = '박수지' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
2024.03- Ph.D. Candidate, AI Design Lab, Graduate School of Techno Design, Kookmin University
2015.03-2025.08.22 Ph.D. in Fine Arts, Department of Painting, Graduate School, Hongik University
2013.03-2015.02 M.F.A., Department of Painting, Graduate School, Hongik University
2007.09-2010.06 B.F.A. / DNAP, L''École Supérieure d''Art et Design Le Havre-Rouen, France, Fine Arts Major (2010.06 / Bachelor)

Solo Exhibitions
2024.05.28-06.03 ''Visual Dialogue'', Hongik University Museum of Modern Art, Seoul
2015.06.03-06.05 Art & Life Show / aT Center (Yangjae), Exhibition Hall 1
2014.10.28-11.02 ''Passing'', Art Seoul / Hangaram Art Museum, Seoul Arts Center, Seoul
2014.09 M.A. Thesis Exhibition / Hongik University Museum of Modern Art, Seoul
2014.05.29-06.02 ''Passage'', Gallery Seven / Painting, Hangaram Art Museum, Seoul Arts Center, Seoul
2013.12.13-12.22 ''Passing'', Gallery Seven / Painting, Hangaram Art Museum, Seoul Arts Center, Seoul
2013.06 ''Art Seoul'' / Painting, Hangaram Art Museum, Seoul Arts Center, Seoul
2010.02.06 / 2009.02.06 / 2008.02.06 (Painting, Installation, Video), ESAH Gallery, France

Group Exhibitions
2025.11.21-11.29 Reloaded, Dapsimni Art Lab, Korea Media Art Association, Seoul
2024.10.23-10.28 Asian Young Artist Exhibition (80 artists), Sejong Center for the Performing Arts, Gwanghwamun International Art Festival, Seoul
2024.09.01-09.12 Herald Arcade 15 (12 artists), Herald Auction, Seoul
2023.11.1-11.8 Hanam Fringe Art Fair (60 artists), Hanam Cultural Foundation
2014.10 Passport / Daejeon MBC M-Gallery, Daejeon MBC
2013.09 14th GPS ''Do'' Exhibition / Painting, Hongik University Museum of Modern Art, Seoul
2012.11 Alpha Young Artist Exhibition / Painting
2011.11 ''Fall in Love'' / Digital Print, Santorini Gallery, Seoul
2010.04-06 ''Art and Nature'' / Installation, Jardin Suspendu au Havre, France
2009.04 ''Bouger'' / Digital Print, Theater France, France
2009.11-2010.04 Workshop ''Art, Architecture with Nature'' - Jean Louis' WHERE name_ko = '박지혜' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Nori Gallery 3-Person Exhibition (2014), Korea Watercolor Association Exhibition (2010-2018), Baek Geum-a Solo Exhibition, Jeju Mythology Exhibition (2023-25), Artists'' Cooperative Exhibition (2024-25) and others' WHERE name_ko = '백금아' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
B.F.A., Department of Painting, Sookmyung Women''s University
M.F.A., Department of Formative Arts, Graduate School, Sookmyung Women''s University

Solo Exhibitions
2025 <Density of Memory>, Gallery Invitational, Art Space J, Bundang
2025 <Seo Geum-aeng Exhibition>, Gallery Ilho, Seoul
2024 <Energy of Space>, Competition, Jungnang Art Center Hanpyeong Gallery, Seoul
2023 <Paradox of an Ordinary Day>, Alo Invitational, Gwanghwamun Ssalong, Seoul
2023 <Energy of Space>, E-Land Curated Exhibition, Kensington Resort Gallery, Jeju
2022 <Selected Artist Exhibition>, E-Land Space, Seoul
2022 <Lingering Gaze>, E-Land Curated Exhibition, Guro NC Department Store, Seoul
2020 <Looking at Everyday Life>, Invitational, Sempio Space, Icheon
2018 <Seo Geum-aeng Invitational>, GS Tower The Street Gallery, Seoul
2016 <Traces, Lingering>, A-Company Curated, Humax Village, Bundang
2011 <Placing the Heart in Space>, Gallery Competition, Gallery Dool, Seoul
2010 <Emerging Artist Competition>, Topohaus, Seoul
2008 <Rooms>, Leehyung Art Center, Seoul

Group Exhibitions
2025 <ASYAAF Asia University Student & Young Artist Art Festival>, Culture Station Seoul 284, Seoul
2025 <Encountering Dreams>, Competition, Gallery Ilho, Seoul
2024 <Waves of Memory>, Sewol Ferry 10th Anniversary Memorial Exhibition, Modern & Contemporary Art Museum Damda, Yongin
2024 <1st Creative Conference Memorial Exhibition>, E-Land Cultural Foundation, E-Land Space, Seoul
2022 <K-Auction Premium Online Auction Preview>, K Auction Art Tower, Seoul
2021 <Smooth and Grooved>, Gong Gallery Cafe, Ilsan
2021 <K-Auction Premium Online Auction Preview>, K Auction Art Tower, Seoul
2021 <Emerging Artist Space Support Exhibition>, United Gallery, Seoul
2020 <All Different Paintings>, Art Space H, Seoul
2019 <Mediazen Small Paintings>, Art Space H, Seoul
2019 <Breeze Art Fair>, Nodeul Island, Seoul
2019 <LOCAL PRIDE>, Gongsyel Curated, Seochon Cafe Street, Seoul
2018 <Breeze Art Fair>, Sejong Center for the Performing Arts Museum, Seoul
2018 <Gwanghwamun International Art Festival>, Sejong Center for the Performing Arts Museum, Seoul
2017 <ASYAAF Asia University Student & Young Artist Art Festival>, DDP, Seoul
2017 <Daelim Changgo x Minari House>, Daelim Changgo Gallery Column, Seoul
2016 <Breeze Art Fair>, Blue Square NEMO, Seoul
2015 <Sookmyung Women''s University 110th Anniversary Alumni Exhibition>, Moonshin Museum of Art, Seoul
2015 <Breeze Art Fair>, Seoul Innovation Park, Seoul
2014 <ASYAAF>, Culture Station Seoul 284, Seoul
2011 <ASYAAF>, Hongik University, Seoul
2010 <ASYAAF>, Sungshin Women''s University, Seoul
2010 <Summer Summer Summer, Sookmyung Western Painting Alumni Exhibition>, Insa Art Center, Seoul
2010 <Breathing House Project>, Gallery Curated, Kimi Art, Seoul
2010 <ARCK U.S. Tour Exhibit-II>, Tacoma, Washington, U.S.A.
2009 <Behind SPACE>, Gallery Curated, EM Art Gallery, Seoul
2009 <Auction Star & Hana Bank Gold Club Joint Curated Exhibition>, Dogok Tower Hana Bank PB Center, Seoul
2009 <ASYAAF>, Former Defense Security Command, Seoul
2009 <ARCK U.S. Tour Exhibit-I Gallery HOMELAND>, Portland, U.S.A.
2009 <Hearts in Motion, Sookmyung Western Painting Alumni Exhibition>, Insa Art Center, Seoul
2009 <Seoul Auction 4th Auction Preview>, Shinsegae Gallery Seoul, Busan
2008 <EVERYDAY LIFE>, Gallery Curated, Gallery Sam, Busan
2008 <ASYAAF>, Former Seoul Station, Seoul
2008 <Phenomenon and Illusion>, Gallery Curated, AKA SEOUL Gallery, Seoul
2008 <Art Road Festival Booth>, Central City, Seoul
2008 <Intro Painting Exhibition>, Sejong Center Annex, Seoul
2007 <KPAM Pet Mania Exhibition>, Hangaram Art Museum, Seoul
2007 <studio_UNIT OPEN STUDIO>, Gallery HUT, KT Art Hall, Seoul
2007 <18th, 19th Container & Jaewon Exhibition>, Cheongpa Gallery, Seoul

Awards
2009 ART CONNECTION KOREA 1st Emerging Artist Grand Prize
2008 Grand Art Exhibition of Korea Contemporary Art Selection (Hongik Design Center)
2007 Grand Painting Exhibition of Korea Western Painting Special Selection (Seoul Museum of Art Branch)
2007 Sookmyung Women''s University Best Graduation Work Award (Cheongpa Gallery)
2005 World Peace Art Competition Western Painting Selection (Ansan Danwon Museum of Art)

Collections
MMCA Art Bank, E-Land Cultural Foundation,
A-Company, APC Works <Monthly Hanok> and numerous private collections' WHERE name_ko = '서금앵' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
B.F.A., Department of Western Painting, College of Fine Arts, Ewha Womans University
M.A., Photography Design Major, Graduate School of Industrial Art, Hongik University

Exhibition Career
2024 Living in That House, Gallery Bresson, Seoul
2024 House of Memory Invitational, Yeosulgotgan, Cheongju, and 13 solo exhibitions total
2024 Ground Seohak, Jeonju Art Gallery, Jeonju
2024 House of the Heart, Songpa-gu Yesong Museum of Art, Seoul, and 31 group exhibitions total

Publications
2020 The Houses at Night, Nunbit
2021 The Houses at Night, Namib

Awards
2022 BELT 2022 Print/Photography Competition Artist Photography Category Selected
2021 2nd FNK Photography Award Art Photography Category Winner
2018 Seoul City Hall Sky Plaza Gallery Artist Competition Winner' WHERE name_ko = '손은영' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'M.A., Western Painting, Yeungnam University

24 Solo Exhibitions
2025 K-POP ART Song Kwangyeon, PAC Gallery Opening Curated Invitational, Jinju
2025 Dream of a Butterfly - Song Kwangyeon, Gallery Sun Invitational, Seoul
2025 Dream of a Butterfly - Song Kwangyeon (Ulsan Foundation for Arts and Culture Art Support Selected Project, 2020/22/24/25), Ulsan
2024 Dream of a Butterfly - Song Kwangyeon, BNK Kyongnam Bank HQ Art Gallery Invitational, Changwon
2019 Song Kwangyeon Invitational, Ulju Culture & Arts Center, Ulsan
2018 Dream of a Butterfly - Song Kwangyeon, DGB Gallery (Gallery G&G Curated, Daegu Bank 2nd HQ) Invitational, Daegu
2016 Dream of a Butterfly - Song Kwangyeon, Art Hub Online Gallery Invitational
2015 Dream of a Butterfly - Song Kwangyeon, Chilgok Kyungpook National University Hospital Healing Gallery Invitational, Daegu
2014 Dream of a Butterfly - Song Kwangyeon, Gallery Cheongdam Invitational, Daegu
2010 Dream of a Butterfly - Song Kwangyeon, Gallery H Invitational, Hyundai Department Store Ulsan
2010 Dream of a Butterfly, Song Kwangyeon Invitational, Dongwon Gallery, Daegu
2008 Maekhyang Gallery 32nd Anniversary Song Kwangyeon Invitational, Maekhyang Gallery, Daegu

Solo Booth
2017 START 2017 (Selected as Solo Booth Artist), Saatchi Gallery, London, UK

2-Person Exhibition
2016 POP of KOLOR (Kyungjoo Park & Kwangyeon Song), Korean Cultural Center at the Korean Embassy in the US Invitational, Washington DC, USA

2-Person Exhibition
2021 Into the Aesthetics of Tradition, 2-Person Invitational Curated Exhibition Im Sangjin & Song Kwangyeon, Gallery Mua, Busan

3-Person Exhibition
2017 Ongojisin, Korea-China 3-Person Exhibition, Korean Cultural Center in Shanghai, Shanghai Hyanggang Gallery Curated Invitational, Korean Cultural Center in Shanghai, China

60+ Curated Exhibitions
Infinite Painting, Flowers Have Bloomed, Cheonan Museum of Art, Cheonan
Wow~! Funny Pop, Gyeongnam Museum of Art, Changwon
A Certain Art Community: Boogie Woogie Museum, Ulsan Museum of Art
True Luxury with ART (StART Art Fair Seoul 2022 Preview), Grand InterContinental Seoul Parnas
STEP-UP: MOMENTUM, Rina Gallery, Seoul
Marilyn Monroe and Korean Pop Art (Shinsegae Centum City Grand Opening Special Exhibition & Shinsegae Touring Exhibition, Busan, Seoul, Gwangju)
Paintings That Bring Happiness (Sejong Center Curated), Book Seoul Dream Forest Art Center
Art & Joy (Park Youngduk Gallery / Insa Gallery), Insa Gallery, Seoul
Power of Ulsan Art, 25 Mid-career Ulsan Artists Invitational, Ulsan Culture & Arts Center
Blue Dot Asia, Hangaram Art Museum, Seoul Arts Center, Seoul
Korean Pop Art, Insa Art Festival, Seoul
Time Travel Exhibition, Art Park Gallery, Seoul
Beauty Painting Exhibition, Insa Gallery, Seoul
Eye-Catching, Blue Dot M Gallery Opening Exhibition, Changwon
Philosophy-Clad Artists, Geumgang Museum of Art, Changwon
Aesthetic Paradox, Namgaram Museum, Jinju
Colores de Corea, Korean Cultural Center in Spain Curated 4-Person Exhibition, Madrid, Spain

Art Fairs: START Art Fair (Saatchi Gallery, London), Art Singapore, Art Beijing, Art Taipei, START Art Fair Seoul, Seoul Open Art Fair,
Korea International Art Fair, Art Busan, Galleries Art Fair, Daegu Art Fair, Asia Contemporary Art Show (Hong Kong), BAMA,
Seoul Art Show, LA Art Show

Collections: Ulsan Museum of Art, Korean Folk Village Museum, Gallery Wi (Pyeongtaek), Leeahn Gallery, Insa Gallery, Gallery Art Park,
Gallery Cheongdam (Daegu), Dongwon Gallery, and numerous corporate, hospital, and private collectors' WHERE name_ko = '송광연' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Shin Gunwoo b. 1986
B.F.A., Department of Media Art & Design, Induk University, 2016

Solo Exhibitions
2024 <The Trite Is the New>, Dalcheon Art Studio, Daegu, Korea
2022 <Cropped City>, Gallery Onui, Seoul, Korea
2022 <Shin Gunwoo''s Walking Mind>, Mir Gallery, Daegu, Korea
2022 <DUAL: Artworks in the Age of Self-Replication>, BGM Gallery Lotte World Tower, Seoul, Korea
2021 <PRESENT>, Gallery Chosun, Seoul Foundation for Arts and Culture Art Activity Support, Seoul, Korea
2021 <Architectural Landscape>, YOONION ART SPACE, Seoul, Korea
2019 <RETRO>, Coutances Art Center, Coutances, France
2018 <Walking Narratives>, Space 55, Seoul, Korea
2018 <Destroy the Dystopia>, Monthly, Seoul, Korea
2016 <Self-Funeral>, MAKSA (now Place Mak1), Seoul, Korea

Selected Group Exhibitions
2025 <Ion and Reason>, Daegu Art Factory 15th Cohort Resident Artist Exhibition, Daegu Art Factory, Daegu, Korea
2025 <Modernity: Time Becoming Art>, Hyundai Department Store Apgujeong Main Store, Seoul, Korea
2025 <Dalseong Daegu Contemporary Art Festival 2025 - Chronicles of Waves>, Gangjeong-bo The ARC, Daegu, Korea
2025 <NOWHERE>, National Residency Joint Exchange Exhibition, Daegu Art Factory, Daegu, Korea
2024 <Dalseong Daegu Contemporary Art Festival 2024 - Still, Romance>, Gangjeong-bo The ARC, Daegu, Korea
2024 <Residency Collaboration Exhibition - Flexible Gap: Shadow of Gaze>, Daegu Art Factory, Suchang Youth Mansion, Daegu, Korea
2023 <ABOUT THERE>, MHK Gallery, Seoul, Korea
2022 <How We Remember the City>, Ulsan Art Support New Group Support, Art Ground HQ, Ulsan, Korea
2022 <No Whales in Jangsaengpo>, Arts Council Korea Support Project, 131 Small Museum of Art, Ulsan, Korea
2021 <Project B Side Metropolitan>, Goyang Youth Hope New Deal Project, Goyang Aram Museum of Art, Goyang, Korea
2021 <DMZ Art Samadhi: Remaker>, Art Hotel Remaker, Gangwon Cultural Foundation, Goseong, Gangwon-do, Korea
2020 <Open Studio - 2nd Cohort Resident Artists>, Suchang Youth Mansion, Daegu, Korea
2020 <Just Modern> <Gathering>, Connected Team Education Program Participating Artist, MMCA Seoul, Korea
2020 <Tautology>, Hori Factory, Seoul, Korea
2019 <ART SOUS LES ARBRES 1>, Coutances Art Center, Coutances, France
2018 <Energy of the Cosmic Clock>, Donuimun Museum, Seoul, Korea
2018 <Hybridity and Confusion>, R3028, Seoul, Korea
2017 <Taste Is the House of Being>, Curated Exhibition - Your and My Habitus, Alternative Space Noon, Suwon, Korea
2016 <Mayfly 8>, Direct From Studio Sale, Seoul, Korea
2015 <Mayfly 7>, Seogyo Experimental Art Center, Seoul, Korea
2015 <Aerial Exhibition>, Aerial Studio, Pangyo, Korea
2010 <Art Group Exhibition>, The Show Gallery, Toronto, Canada
2010 <Open Studio>, SERENDIPITY SPACE, Toronto, Canada

Residencies
2025 Daegu Art Factory 15th Cohort Resident Artist (2025.2.4-12.4), Daegu, Korea
2024 Dalcheon Art Studio 4th Cohort Resident Artist (2024.2.19-12.19), Daegu, Korea
2021 Science Walden Resident Artist (2021.9.7-9.23), UNIST, Ulsan, Korea
2020 Suchang Youth Mansion 2nd Cohort Resident Artist (2020.7.7-10.6), Daegu, Korea
2020 Coutances Art Center, 1st Cohort Resident Artist (2019.5.2-7.29), Coutances, France

Awards & Selections
2021 DMZ Art Samadhi: Remaker Participating Artist, Gangwon Cultural Foundation
2020 Art Activity Support (Visual Arts) Selected, Seoul Foundation for Arts and Culture

Collections
Gangwon Cultural Foundation
Hori Art Space
Coutances Art Center
Coutances Municipal Museum of Art
Gallery Pont des Arts
Gallery Iang' WHERE name_ko = '신건우' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
B.F.A., Department of Painting, Hongik University; M.F.A., Department of Painting, Graduate School, Hongik University

Solo Exhibitions
2025 Keeptik Curated Solo Exhibition, Notting Hill Lounge, Gamil
2025 Collage of Ordinary Things, Gangbuk Samsung Hospital Nanum Zone
2020 Young Artist Space Support Competition Winner - Booth Solo Exhibition, United Gallery, Seoul
2002 1st Solo Exhibition, Gwanhun Gallery, Seoul

Group Exhibitions
2025 Gangdong Young Artist Support Competition <All That Shines>, Gangdong Art Center Artrang, Seoul
2025 Summer Special Invitational: 16 Artists'' Imagination <Put It in My Cabinet>, Space Second View, Seoul
2024 2024 Gangdong Young Artist #Our Moment 35 Landscapes Exhibition, Gangdong Art Center Artrang, Seoul
2024 Gwanak x Seocho Exchange Art Fair BnB, Gwancheonno Culture Platform S1412 & Seoriful Youth Art Gallery, Seoul
2023 18th Gwanghwamun International Art Festival - Asian Contemporary Art Young Artist Exhibition, Sejong Museum of Art
2023 Predictable Future - Gangdong Art Center Curated Exhibition, Gangdong Art Center, Seoul
2023 GALLERY IN THE CITY - Construction Fence Project, Seoul
2023 Keeptik #0002, Amidi Gallery, Seoul
2023 Keeptik #0001, Dada Project, Seoul
2022 Form 2022, CICA Museum, Gimpo
2022 ASYAAF, Hongik University Museum of Modern Art, Seoul
2022 2nd, 3rd Hoho Art Festival, Collabo House Doksan, Seoul
2022 We Support - Gangdong Artists Support Project Competition, Gangdong Art Center Artrang, Seoul
2002 Cosmetic Art 2002 - Colorful! Powerful!, Insa Art Center, Seoul
2001 4induction Exhibition, Hongik University Museum of Modern Art, Seoul
and others' WHERE name_ko = '신연진' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Dammong Shin Yeri
B.F.A., Department of Textile Art, Kyungwon University (now Gachon University), 2003
Senior Designer at Master Hwagakjang Han Chun-seob Hwagak Craft Workshop (Gyeonggi Intangible Cultural Heritage), 10 years
Current: Representative of Minhwa Craft Studio ''Dammong''
Invited Artist, Republic of Korea National Art Special Invitational Exhibition
SNAF Seongnam Art Fair Artist Exhibition
Mokwonhoe Group Exhibition participant' WHERE name_ko = '신예리' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'B.F.A. and M.F.A., Department of Painting, College of Fine Arts, Seoul National University

Solo Exhibitions
1990 Kumho Museum of Art
1991 Songwon Gallery
1992 To Art Space
1994 Seokyeong Gallery
1996 Kumho Museum of Art
1999 Dongsanbang Gallery

Group Exhibitions
1988 * Korean Painting - Transformation of Consciousness (Dongduk Art Museum)
Impression Exhibition (Gallery Sangmundang)
1989 * 43-Person Exhibition (Chosun Ilbo Art Museum)
Korean Painting in Transition (Seoul Press Center)
1990 * Young Exploration 90 (MMCA)
Today''s Face (Galleria Art Museum Opening Exhibition)
1991 * Korean Painting - Today and Tomorrow (Walker Hill Art Museum)
Message and Media Exhibition (Gwanhun Gallery)
1992 * Contemporary Korean Painting (Hoam Gallery)
Proposal for Korean Figurativeness (Gallery Seomok)
1993 * Korea-China Art Exchange Exhibition (Seoul Arts Center)
Korean Contemporary Art - New Generation Trends (Fine Art Center)
1994 * 27 Aphorisms of Korean Contemporary Art (Busan World Gallery)
Happy Our Home (Gallery Art Beam)
1995 * Path of Self-Respect 2 (Kumho Museum of Art)
Hankook Ilbo Young Artist Invitational (Baeksang Memorial Hall)
1996 * Interpretation of the Human (Gallery Savina)
Humanism (Insa Gallery)
1997 * Portrait of Our Era - Father (Sungkok Art Museum)
Gwangju Biennale - Margins of the Earth (Gwangju)
1998 Walking Together (Gallery Samsung Plaza)
1999 * JoongAng Art Competition Past Winners Invitational (Hoam Gallery)
Status and Prospect of Korean Painting (Daejeon Museum of Art)

Awards
1982 JoongAng Art Competition Encouragement Prize' WHERE name_ko = '심현희' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'B.F.A. and M.F.A., Department of Printmaking, College of Fine Arts, Hongik University

Publications
Artmandu''s ''The Goal Is Banggu (防口)'' (Hangil Publishing, 2022)
Artmandu''s ''Beetle News'' (Brush & Pen, 2025)

Awards
2021 SICAF Seoul International Cartoon & Animation Festival Comic Category Achievement Award, Seoul
2019 The Brandlaureate World BestBrands Awards 2019 - Personal Artist Category, Shangri-La Hotel Tower Ballroom, Singapore, Oct 31

Solo Exhibitions
2026 Artmandu''s ''Beetle News'', Born Star Rocks Gallery, New York
2022 Caricature Battle ''Ear-Plugging Oddities''
Caricature Battle ''Lower Your Eyes''
Artmandu''s ''Human Encyclopedia'', Korea Manhwa Contents Agency 2nd Exhibition Hall, Bucheon
2022 Caricature Invitational ''People We Loved'', Albany Park Public Library, Chicago, USA, and 9 more

Group Exhibitions
2025 International Satirical Cartoon Exhibition - Eyes of East Asia, Saitama Media Tower News Art Gallery Walk, Tokyo
Beyond the People Exhibition, Maru Art, Seoul
Korean Caricaturist Association Exhibition, Korea-Belgium 120th Anniversary Korean Cartoon Special Exhibition, Korean Cultural Center in Belgium, Belgium
Saint-Just-le-Martel International Editorial Cartoon Salon, Saint-Just-le-Martel, France
and others' WHERE name_ko = '아트만두' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
2016 B.A., Department of Photography & Media, Sangmyung University

Solo Exhibitions
2024 My Name Is, Noeul Artisan Center, Seoul
2023 Authentic City, Gallery Bresson, Seoul
2021 NEW REMINISCENCE, Gallery Bresson, Seoul
2020 NEW REMINISCENCE, Ewha Seoul Hospital Art Cube, Seoul
2018 CITY OASIS, Gallery Bresson, Seoul
2017 LUCK, Gallery Bresson, Seoul

Group Exhibitions
2025 Invisible Cities, Gallery Bresson, Seoul
2024 CRAFT + MAN = SHIP, Hangang Park Seoul Battleship, Seoul
2023 The Medium Is the Massage, Collabo Mullae, Seoul
2022 Simultaneous Exhibition, Gallery Gaze, Seoul
2021 Taste of Weather, Gallery Bresson, Seoul
2021 SEEA 2021, Seoul Arts Center, Seoul
2021 Photographer''s Way of Travel, Gallery Bresson, Seoul
2021 Porsche Dreamers On Artists Selected & Gwangju Design Biennale Exhibition

Awards & Selections
2021 Porsche Dreamers On Artists Top 20 Selected
2020 Ewha Seoul Hospital Art Cube Competition Artist Selected
2011 Suwon Hwaseong Photo Competition Grand Prize
2010 Jeju International Airport Photo Exhibition Silver Prize
2009 W New Talent Contest Photographer Category Finalist
2007 Daily Project TOP 5 Selected

Film
Director
2021 LUNATIC - Silent Dance Film (Directed & Starred, 10+ International Film Festival Awards & Invitations)
2021 Companion Bot - Short Film

Acting Credits
2020-2025 (Commercials): Ministry of Employment and Labor, Hyundai Oilbank, Porsche, Google Ads, LG U+ and others
2020-2025 (Films): Mirage, Birth of Tragedy, Pung, REDLINE, A Mother Like Mother and others

Publications
2023 ''Love Is the Only Answer: Birth of Sense'', by Ahn Soju
2023 SOYCOPASS proprietary IP NFT development and release' WHERE name_ko = '안소현' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Ph.D., Department of Oriental Painting, College of Fine Arts, Hongik University
Teaching: Former Visiting Professor, University of Ulsan
Lecturer at Kyungsung University, Chosun University, University of Ulsan

Solo Exhibitions
2024 Rumination, Gagi Gallery, Ulsan
2022 Boundary Travel, Buk-gu Culture & Arts Center, Ulsan
2017 The Journey to The Recovery, Gana Art Space, Seoul
2016 The Journey to The Recovery Invitational, Caffebene Time Square, New York, USA
2015 The Journey to The Recovery Invitational, THE WHEEL HOUSE, New York, USA
2012 Only Dream-ing Traveler Curated, THE K Gallery, Seoul; Hwabong Gallery Invitational, Seoul
2010 Only Dream-ing Traveler Curated, Gallery SU, Seoul
2009 Joy of Voyage Invitational, Gallery HOSI, Tokyo, Japan
Joy of Voyage Curated, Young Art Gallery, Seoul
2008 Joy in Deviation Curated, Gallery Young, Seoul
2007 Joy in Deviation, Gallery Space Pause, Tokyo, Japan

Group Exhibitions
2025 Attempt to Touch the World: Sharing, Leon Gallery, Seoul
2024 Our Summer, VVS MUSEUM, Seoul
"DREAM", Uncharted Territory Studio, Seoul
2023 History of Time Recorded in Color Exhibition, Insa Art Center, Seoul
Ulsan Culture Expo & Ulsan APM Invitational, U-Eco, Ulsan
2022 Three Coexisting Perspectives Curated, Korea Energy Agency, Ulsan
We Need a Summer Vacation Too Invitational, F1963, Busan
8 Journeys Invitational, Gyomun Gallery, Busan
2021 Singing the Everyday, Baeksong Gallery, Seoul
Sinchuk Year Korean Painting Invitational, Gallery hoM, Seoul
Travel and Beyond Invitational, Ulsan Museum of Contemporary Art, Ulsan
2020 Light and Color Seen by Heart, Dongduk Art Gallery, Seoul
2018 ASYAAF & Hidden Artist Festival, DDP, Seoul, and others

Residency: ARPNY - Artist Residency Program, New York, USA

Collections: Ulsan Culture & Arts Center, University of Ulsan, Ulju World Mountain Film Festival, CK Dental Hospital, CNP Apgujeong Cha & Park Dermatology, corporate and private collections' WHERE name_ko = '안은경' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
M.A., Department of Philosophy, Graduate School, Sogang University
B.A., Department of Traditional Religious Art, Incheon Catholic University

Solo Exhibitions
2024 c ; stand up for yourself, ㅁ, Gallery Oudo, Seoul
2020 c ; summer, Yangchul Seoul, Seoul
2013 empty interval, Gallery The K, Seoul
2008 clean, Cloud, Gallery Hoshi, Tokyo, Japan

Group Exhibitions
2023 Eternal Moments, Gallery Graph, Seoul
2022 Gallery Opening Exhibition, Edition, Montreal, Canada
2022 Selasart International Visual Art Exhibition, Ohana Cafe, Metro, Indonesia
2020 TRiCERA PRESENTS SPECIAL PROMOTION, Shinwa Auction, Tokyo, Japan
2017 Colorful Amoeba Playground, Culture Tank, Seoul
2014 The World They See - Three Sensitive Perspectives, Chosun University Museum, Gwangju
2011 The Blank, Kimi Art, Seoul
2009 Gwangju & Seoul Museum of Art Creative Studio Exchange No..., Gwangju Museum of Art, Gwangju
2009 THE FORGOTTEN TIME, Love2arts Gallery, Antwerp, Belgium
2008 99 Tents, 99 Dreams, One World, Jwawoo Museum of Art, Beijing, China

Residencies
2009 Gwangju Museum of Art Creative Studio Residency, Gwangju
2008 Hadaeri Summer Forest Art Festival Residency, Gangwon-do' WHERE name_ko = '양운철' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Background
KAIST (Civil & Environmental Engineering / Industrial Engineering) Graduate

15 Solo Exhibitions, 70+ Curated Group Exhibitions
2024 Seoul Youth Biennale Art Critic Award
2023 Jeju Bunker de Lumières Media Art Exhibition ''Bloom''
2022 Gwanghwamun International Art Festival International Invitational Invited Artist
2019 Incheon Foundation for Arts & Culture West Sea Peace Art Project Co-Curator' WHERE name_ko = '예미킴' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Solo Exhibitions
2022 ''From the Moon to the Moon'', Art Space Young, Seoul
2022 ''Dark Room'', Art Logic Space, Seoul

Group Exhibitions
2025 ''2025 Zodiac Painting Exhibition'', Icheon Museum of Art, Icheon
2024 ''In My Loneliest Hours'', Insa Gallery, Seoul
2024 ''A Finding Persona'', Gallery Unplugged, Seoul
2024 ''Dream Drawing'', Gallery 1707, Seoul
2023 ''2023 H-EAA National Young Artist Competition Selected 10 Artists Exhibition'', Art Space Hohwa, Seoul
2023 ''Seeping In'', Gallery Ilho, Seoul
2023 ''Shape of Play'', Hankyoreh, Athing Gallery, Seoul
2023 ''In Contemplation, Each Has Their Own Sound'', A-Lounge Gallery, Seoul
2023 ''BAMA BUSAN International Art Fair'', BEXCO, Busan
2023 ''Dream of Hanyang'', Gallery 1707, Seoul
2022 ''Outside of Form'', Geumboseong Museum of Art, Seoul
2022 ''FOCUS ART FAIR'', Carrousel du Louvre, Paris
2022 ''ASYAAF'', Hongik University Museum of Modern Art, Seoul
2022 ''Encountering Dreams'' Emerging Artist, Gallery Ilho, Seoul

Awards
2023 2023 H-EAA National Young Artist Competition, Excellence Award (Hoban Cultural Foundation)

Collections
Hoban Cultural Foundation' WHERE name_ko = '오아' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Honorary Professor, Busan University of Foreign Studies; Photo Critic; Exclusive Artist, International Culture & Art Exchange Center
2025 Korea-China International Plein Air Exhibition (Group), Taihu Art Museum, Wuxi, China (collected)
2025 Korea-China International Art Exchange Exhibition (Group), Dongshan State Guest House Art Museum, Suzhou, China (collected)' WHERE name_ko = '이광수' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'B.A., Department of Photography, Osaka University of Art
M.A., Photography (Pure Photography / Image Science), Graduate School of Arts & Design, Sangmyung University

Solo Exhibition
2025 Space Thunder Invitational (Hyewon Photo Album), Space Thunder
Hyewon Photo Album, Iz Gallery
Jeju International Photo Exhibition Lee Sucheol Invitational (Jeju Non-Simultaneity), Gallery Simong
Journey of Memory, Solaris Gallery Osaka
2023 Journey of Memory, The Beam Gallery Daejeon
2022 Journey of Memory, Yeomi Gallery Seosan
2021 Traces and Light, Toma Gallery Daegu
2020 Daydream, Gallery Hyeyum Gwangju
2018 Non-Simultaneity Jeju, Yesul Sanghoe Toma (Daegu), Space 22 (Seoul), Bresson Gallery (Seoul), Yeomi Gallery (Seosan)
2016 Bresson Gallery x OhmyNews Joint Curated "Finding the Photographer" Lee Sucheol Solo Exhibition
"Day Dream", Bresson Gallery
2011 Hwamong Junggyeong, Geurimson Gallery
Resurrection 2012, Nabi Gallery
Lee Sucheol Photo Exhibition, Gallery Ui
2008 Epiphany of Illusion, Gallery ON; Architectural Photography, Bresson Gallery
2006 Landscape of Memory Drawn with Light, Nau Gallery
1999 Memories, Ihu Gallery

Group Exhibition
2025 2025 New Wave, Bresson Gallery
Insadong Art Week (IAW), Gallery 5
The Way We Remember, Index Gallery
2024 D*Composition, Space 22
2023 Life Memory Place, Doldam Gallery Jeju
2022 Chungnam National University 70th Anniversary Faculty Exhibition, Baekma Art Hall
Let''s Play Exhibition, Heesu Gallery (Seoul), Haeundae Culture Center (Busan)
Jeju International Photo Festival, Doldam Gallery
Kim Young-seob Gallery Opening CONTEMPORARY KOREA PHOTOGRAPHY, Kim Young-seob Gallery
Alley Exhibition, Palais de Seoul
Feast of Photography, Doldam Gallery (Jeju)
2021 Jeju International Photo Festival, Ia Gallery
2020 Galleries Art Fair, COEX (Nau Gallery)
2019 On Photography, Bresson Gallery
2019 Gift Exhibition, Lotte Department Store Gallery Daejeon
2017 Island of Photography Songdo, Songdo Commodore Hotel, Pohang
2016 Hang Light in My Room, Space Opt
2015 DMC Art Festival, Digital Media City Gallery
Star Party, Space Sun+
Book Space Painting People Harmony Exhibition, Noeun Art Libro
2014 Contemporary Art Ruhr Media Art Fair, World Heritage Site, Zollverein, Essen, Germany
2013 ARTIST''S PRESENT, GALLERY SEIN
White Summer, Lotte Department Store Gallery Daejeon
2011 Splendid Heart, Eulji Media Gallery
2009 Contemporary Korea Photographs Exhibition, Osaka University of Art Information Center Exhibition Hall, Japan
2009 Seoul Museum of Art Photo Festival Circulation of Photography, Seoul Museum of Art
Pilmuk & Photo, Mulpa Space
Unexpected Landscape Lee Sucheol-Jo Miyoung 2-Person Exhibition, Space Mobin
2008 2008 WAKE UP New Exploration of Korean Photography, Lux Gallery
Deep-Rooted Photo Exhibition, Gallery Irum
Invisible Space, Sangmyung University Arts Design Center Gallery
Sky Name Earth Exhibition, Gallery Irum
2005 60th Anniversary of Liberation Korean Photography Past and Present, Gwanghwamun Gallery
2004 Korea-Japan Photo Exchange Exhibition: 14 Photographers of the Ark, Japan Cultural Center Silk Gallery
2001 SAKA-NO MACHI ART in Yatsuo 2001, Toyama Yatsuo, Japan, and other group exhibitions

Team Project Activities
2018 Non-Simultaneity Jeju, Biotope Gallery Jeju (Jeju Foundation for Arts & Culture Grant)
2017 Incheon Women Just As You Are, Incheon Art Platform (Incheon Foundation for Arts & Culture Grant)
2016 2016 Incheon Women, Seongwang Museum of Art (Incheon Foundation for Arts & Culture Grant)

Career
2007-2012 Lecturer, Department of Photography, Daegu Arts University
2008-2009 Lecturer, College of Art, Kookmin University
2013-Present Lecturer, Department of Photography & Media, Sangmyung University
2010-Present Lecturer, Department of Design Creativity, Chungnam National University' WHERE name_ko = '이수철' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Career
2022.6-Present Chairman, Forest of Art Social Cooperative
2018.1-2020.3 Art Director, ARTFIELD Gallery
2014.5-2017.3 Representative, A-Tree Gallery
2004-2013 Representative, Photo Group

Education
B.A., Department of Photography, College of Arts, Chung-Ang University
Diploma, Department of Photography, Istituto Europeo di Design, Milan, Italy

Teaching
2004.3-2014.6 Lecturer, Division of Design, Konkuk University
2000.3-2009 Adjunct Professor, Department of Multimedia, Namseoul University

Publications
2025 ''La Bella Estate'' (Translation), Noksaek Gwangseon
2025 ''Slow Human'', Geulhangari (Text & Photography)
2016 ''Heroes of MERS'', Dulda Books (Photography)
2015 ''Poets of the Secular City'', Logopolis (Photography)

Awards
2025 14th Green Literature Award (Photo essay ''Slow Human'', Geulhangari)

Solo Exhibitions
2025.6.20-7.20 "Slow Human", Seoul (Lapland)
2024.3.6-3.25 "Sacred Trees of Namhae - Memory of Time", Namhae (Namhae Exile Literature Museum)
2023.12.5-12.17 "Green Paradise - Fiji", Vium Gallery, Seoul; "Mangrove, Trees on Water", Gallery Da, Hanam
2023.10.10-10.31 "Sacred Trees of Tongyeong", Gallery Mijak, Tongyeong
2022.8.2-8.16 "Sacred Trees of Sinan - Usil", Sojeon Museum of Art, Siheung; Yesul-i Background, Gwangju
2021.5.4-5.15 "Sacred Trees of Jeju - Poknang", LeeSeoul Gallery, Seoul
2020.2.2-2.29 "Baobab, Trees Loved by Gods", ARTFIELD Gallery, Seoul
2018.11.20-11.27 "Trees Generations", Fortino Santa Antonio, Bari, Italy; ARTFIELD Gallery, Seoul
2018.3.26-4.29 "Human Tree", ARTFIELD Gallery, Seoul
2017.11.29-12.9 "Dreaming Tree", ARTSPACE HOSEO, Seoul
2017.6.9-6.25 "Himalaya", Gallery Munrae, Seoul
2016.10.20-11.2 "Forest", ARTSPACE HOSEO, Seoul
2016.7.4-7.17 "Poet''s Face", A-Tree Gallery, Seoul
2015.7.8-7.13 "Tree", Gallery Index & A-Tree Gallery, Seoul; Art in Island, Bongpyeong
2015.2.4-2.28 "Blue Tree 3", A-Tree Gallery, Seoul
2014.1.11-1.22 "Blue Tree 2", Gallery Arte22, Seoul
2013.5.30-7.15 "Blue Tree", Gallery Jung (Seoul, Bucheon, Yongin), iT Gallery, Canson Gallery, Seoul
2009.7.22-8.10 "Wind Blows", W Gallery, Seoul
2009.5.4-5.16 "Number", Irum Gallery, Seoul
2008.12.3-2009.1.11 "Flowing Flowers", Kim Young-seob Photo Gallery, Seoul
1998.10.8-10.20 "C''era una volta il nudo, e poi...", Famiglia Artistica Milanese, Milan, Italy; Gallery May, Seoul' WHERE name_ko = '이열' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Solo Exhibitions
2025 <Where Wishes Linger and Rise Again>, Lee Yuji Invitational Solo Exhibition, Art Boda Gallery, Seoul
2025 <Karma Dice>, Ganghwa Jeondeungsa Museoljeon Seoun Gallery Competition Selected, Seoun Gallery, Incheon
2024 <Party of Wishes>, Lee Yuji Invitational Solo Exhibition, The Squares Gallery, Seoul
2024 <Dreamer''s Paradise>, Eunpyeong Cultural Foundation Sai Competition Selected, Eunpyeong Cultural Foundation, Seoul
2017 <Landscape of the Abyss>, Sai Art Document Competition Selected, Sai Art Document, Seoul

Group Exhibitions
2026 <Anew Beyond: Like Starting Again>, Samwon Gallery, Seoul
2025 <Sumunjang Art Fair 2>, Suwon Cultural Foundation, 111CM, Suwon
2025 Roha Gallery Group Small Works, Seoul
2025 Inspired Fair SETEC, Seoul
2025 <Exploring Life> Yungyeom & Lee Yuji 2-Person Exhibition, GG2 Gallery, Seoul
2025 BANK Art Fair, SETEC, Seoul
2025 Yeongwon Art Fair, Yeongdo C Gallery / AR Gallery, Seoul
2025 <Galleries Art Fair Suwon: Sumunjang Art Fair>, Suwon Cultural Foundation, Suwon
2025 <0 Won Art Fair>, 0 Degrees Gallery / AR Gallery, Seoul
2025 <BANK Art Fair>, Fairmont Ambassador, Seoul
2025 <The Art of Letting Go>, C-Muse Project, Space Atel, Seoul
2024 <Small Museum>, Lee Miyeon & Lee Yuji 2-Person Exhibition, Suwon Cultural Foundation, Starfield Small Museum, Suwon
2024 <Chuncheon Art Island: Korea and India>, Chuncheon Cultural Foundation, Nami Island Pyeonghwarang Gallery, Chuncheon
2024 <Sumunjang Art Fair PART 2>, Suwon Cultural Foundation, 111CM, Suwon
2024 <Art Record Cheongju>, Geu-eotteon, Chungbuk Cultural Foundation, Culture Manufacturing Plant, Cheongju
2024 <YOUTH> Group Exhibition, Whitestone Gallery, Seoul
2024 <Sumunjang O! Galleries Art Fair IN Suwon>, Suwon Cultural Foundation, Suwon Convention Center, Suwon
2024 <Jeju International Art Fair>, Jeju Convention Center, Jeju
2024 <Weekly K-Auction>, K Auction, Seoul
2024 <Light and Dark> Neonji & Lee Yuji 2-Person Exhibition, Art Boda Gallery, Seoul
2023 <Gallery Siseon> Lee Yuji & Lee Jeongmin 2-Person Exhibition, Curated by Seoul National University Emeritus Professor Kim Jeonghee, GS Siseon, Seoul
2022 <Daydream: A Dream Dreamt at Noon> Kim Gitae, Lee Yuji, Jang Soyeon 3-Person Exhibition, Informel Seongsu, Seoul
2022 <Cheonggi Iljeon> Jeju Youth Day, Jeju Special Self-Governing Province Office 1st Building, Jeju
2021 <Gwanin Culture Village>, Gwanin (former) Agricultural Cooperative Fertilizer Warehouse, Ministry of Culture, Sports and Tourism, Gwanin Cultural Regeneration Research Society, Pocheon
2021 <Wonderful Days for All>, Seoul Citizen University, Seoul
2021 <Eulji Art Fair Prize>, Jung-gu Cultural Foundation, Eulji Twin Tower, Seoul
2020 <Eulji Art Fair Prize>, Jung-gu Cultural Foundation, Eulji Twin Tower, Seoul
2020 <A1 Emerging Youth Artist>, Geumboseong Art Center, Seoul
2019 <Hanseong Baekje Songpa Art Festival>, Yesong Museum of Art, Seoul
2019 <Nut Gallery Selected Artist Special Exhibition>, Nut Gallery, Seoul
2018 <From Everyone to Here>, 3-Person Exhibition, Curated by Lee Juhee, Art Space Et, Seoul
2018 <ASYAAF Part 1>, DDP, Seoul
2018 <Seodaemun Inn Art Fair>, Seodaemun Inn, 7 Picture, Seoul
2018 <3rd A1 Emerging Artist>, Geumboseong Art Center, Seoul
2017 <First Collection Experience>, Ecorak Gallery, Seoul
2017 <ASYAAF Part 2>, DDP, Seoul
2017 <1st Track - Healing> Yungyeom & Lee Yuji 2-Person Exhibition, Seojeong Art Center, Seoul
2016 <Gaze of the Future> Seojeong Art Center Emerging Artist Selected Exhibition, Seojeong Art Center, Seoul
2016 <5th Spielplatzhan Competition> Lee Yuji & Ju Sang-eon 2-Person Exhibition, Spielplatzhan Gallery, Seoul
2016 <ASYAAF Part 2>, DDP, Seoul
2015 <GIAF Gwanghwamun Art Festival Young Artist> Competition Selected, Sejong Museum of Art, Seoul
2015 <Facing Anxiety> M.A. Thesis Relay Solo Exhibition, Kookmin Art Gallery, Seoul
2015 <Exchange Stroke Painting>, Kwaeyeonjae Museum of Art, Yeongwol, Gangwon-do
2014 <Dawn Phenomenon>, Pyeongchang-dong Yeonwoo Gallery, Seoul
2014 <ASYAAF Part 2>, Former Seoul Station, Seoul
2013 <Movement Exhibition> Suwon University Western Painting Graduation Exhibition, Iz Gallery, Seoul

Awards
2024 <Artist of Tomorrow> Gyeomjae Jeong Seon Competition Selected, Excellence Award, Gyeomjae Jeong Seon Museum of Art, Seoul
2024 <JDC Jeju Art Competition>, Encouragement Award, Jeju Gallery Association, JDC, Jeju
2022 <4th Seoul-ro Media Canvas>, Flat Work Award, Seoul-ro Media Canvas, Manri-dong Square, Seoul
2020 <Art Prize Gangnam>, Excellence Award, Art Prize Gangnam, Gangnam Cultural Foundation, Seoul
2016 <Summer Saengsaek Exhibition> Gasong Art Award Competition Selected, Collaboration Category, Gong Art Space, Seoul
2016 <1st Seoriful ART for ART>, Special Selection, Yujung Art Center, Seoul
2015 <14th Hanseong Baekje Art Award>, Special Selection, Yesong Museum of Art, Seoul
2015 <12th Hanseong Baekje Art Award>, Special Selection, Yesong Museum of Art, Seoul
2013 <15th Danwon Art Festival>, Special Selection, Danwon Museum of Art, Seoul

Art Sponsorship Program
2025 Samwon Art Sponsorship 8th Cohort, Samwon Paper, Samwon Gallery, Seoul

Collections
2024 Gyeomjae Jeong Seon Museum of Art, "Self Bloomed in Wetland, Flower of the Abyss"
2020 Seoul Culture Headquarters Museum, "Forest of the Abyss 2"
2016 Hana Bank Art Bank, "Red Room"
and fair and private collector collections

Arts Education
2025 Korea Arts & Culture Education Service ''Healing Like Spring'' Dementia Senior Participatory Teaching Artist, Project C, Eunpyeong-gu Naereul Geonneoseo Library, Seoul

Workshops
2025 <Mind Pharmacy - Suwon Festival> Oct 25, ''Sacred Object Workshop of Wishes'', Suwon
2025 <Myeongdong Meal - One Bite of Art> Oct 22, ''Bibbidi Bobbidi'' Art Peddler Workshop, Seoul

Residency
2026 Chuncheon Art Village 4th Cohort, Chuncheon Cultural Foundation, Chuncheon, Gangwon-do' WHERE name_ko = '이유지' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
2009 Ph.D. coursework completed, Art History, University of Manchester, UK
2002 M.A., Contemporary Art, Sotheby''s Institute of Art, London
2001 M.F.A., Fine Art (Painting), University of the Arts London
2000 Diploma, Graphic Design, Cavendish College, London, UK

Solo Exhibitions
2025 Room of Hospitality: Welcome VIP, 12th Gyeongnam International Art Fair Special Invitational, CECO (Changwon Convention Center)
2024 Tell Me The Story, Art Space J_Cube1, Seongnam (2024 Seongnam Cultural Foundation Arts Creation Support Project Competition Winner)
2023 Room of Desire, Jeolmeun Dal Y-Park (Haslla Museum Branch), Yeongwol (Curated Invitational)
2022 Moneyscape, Cafe Esperanto, Seoul (Invitational)
2017 Monoticon - Esperanto of Emotions, Cafe Esperanto, Seoul (Invitational)
2016 Digilog - Esperanto of Emotions, Gallery Sijak, Seoul (Curated)
2004 Emotional Esperanto, Art Space Mieum, Seoul (Exhibition Competition Winner)

Group Exhibitions
2025 Blue Summer, Seongnam Art Center Cube Sarangbang Gallery, Seongnam
57th Japan Shin-In Exhibition, Tokyo Metropolitan Art Museum, Tokyo
2024 ''Reimagining the City'', Seongnam Cube Museum, Seongnam
2022 ''Portrait of a Young Artist'', Young Art Gallery, Daejeon
2016-17 ''Metropolis of Desire'', Busan Museum of Art, Busan
2013 ''Stars of the World'', Hangaram Art Museum, Seoul Arts Center, Seoul
2008-10 ''Mirror, Mirror!'', MMCA Children''s Art Museum, Gwacheon
2006 Gwangju Biennale 3rd Sector ''Artist''s Parlor'', Gwangju Folk Museum, Gwangju
2005 ''Portfolio 2005'', Seoul Museum of Art, Seoul
''Party'' Exhibition, Sungkok Art Museum, Seoul

Publications: <Paintings with Stories>, <Room of Paintings>, <Northern European Museum Tour>, <Minimum Art 100 for Today''s Adults> and others' WHERE name_ko = '이은화' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Born 1955, Busan
1983 B.S., Department of Food Engineering, Pusan National Fisheries University

Solo Exhibitions
1989 Our Daily Life - I: Geurim Madang Min, Seoul; Ondara Museum of Art Invitational, Jeonju
1992 Our Daily Life - II: Geurim Madang Min, Seoul; Ondara Museum of Art Invitational, Jeonju; Gallery Nouveau Invitational, Busan
2005 Good Days! Peaceful Everyday (Deokwon Gallery, Seoul)
2006 Good Days!! (Busan Democracy Park Invitational, Busan)
2010 Old Story (Park Jinhwa Museum of Art Invitational, Incheon)
2018 In the Paradise (Namu Art Gallery Invitational, Seoul)
2021 Earth Castaway (Busan Democracy Park Invitational, Busan)
2023 On the Street (Namu Art Gallery Invitational, Seoul)
2025 Holoism (From the Invisible to the Visible), Artverse in Paris

Group Exhibitions (approx. 150)
2025 Flipping the Board (Gyeonggi Museum of Art)
Nonsense Like Moon''s Reflection on a Lake (Arte Sup)
5.18 People''s Uprising 45th Anniversary Media Art Special Exhibition (REGENERATION), Alternative Art Space Ipo
Peace Cultural Festival (Dongducheon Peace Flag Exhibition), Soyo Mountain, Former VD Clinic Protest Site Parking Lot, Dongducheon
2025 World Artists Korean Peninsula Peace Conference ''Art Revolution'' Exhibition, Heyri Art Village Gallery Hangil
Jeongseon International Bookplate Festival
Chronicles of Light / Democratization Memorial Hall' WHERE name_ko = '이인철' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Jeju Mythology Exhibition (2016), Park Geun-hye Impeachment Exhibition (2017), Daegu Photo Biennale (Fringe), Suwon International Photo Festival, Jeju Mythology Korea-Japan Exhibition (2017), Volcanic Island International Photo Festival, Republic of Korea International Photo Festival, Double Portrait Series Exhibition (2019), Lost Garden Exhibition, Village Theater DMZ Residency Exhibition (2020), Wise Home Life Exhibition (2021), Birds Don''t Fear the Pandemic Exhibition (2022), Volcanic Island Exhibition (2023), Chilsilparyeoan Exhibition (2024), A Thousand Cameras (2025), and numerous solo exhibitions, group exhibitions, and art fairs' WHERE name_ko = '이재정' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = '1984 Born in Korea
2017 Diploma, Kunstakademie Düsseldorf, Meisterschüler, Class of Prof. Franka Hörnschemeyer
2015 9 semesters completed, Hochschule für Künste Bremen, Fine Arts
2009 M.F.A., Sculpture, Kookmin University
2007 B.F.A., Sculpture, Kookmin University

Solo Exhibitions
(05.2026 Title TBD, CICA Museum, Gimpo, Korea)
11.2025 <Hollowed Colors>, Art Space Et, Seoul, Korea
06.2023 <art-hoc solo exhibition>, duesseldorf-art, Düsseldorf, Germany
02.2023 <structure>, Quittenbaum Galerie, Munich, Germany
09.2019 <reversed>, Biesenbach Galerie, Cologne, Germany
11.2015 <Studies for between spaces>, Alternative Space Noon, Suwon, Korea
07.05.2014 <One night stand>, Alternative Space Immigration Office, Bremen, Germany
06.2009 <Boundary of skin>, Art Space Hyun, Seoul, Korea

Group Exhibitions (Selected)
11.2025 <Grand Art Exhibition of Korea Modern Art Awards>, Gallery B, Seoul, Korea
10.2025 <Shin Saimdang Art Competition>, Gangneung Culture Center, Gangneung, Korea
08.2025 <E-Land Cultural Foundation 16th Exhibition Competition>, Dapsimni Art Lab, Seoul, Korea
07.2025 <13-Person Emerging Artist Exhibition>, Mill Studio, Seoul, Korea
04.2024 <From Abstract To Nature>, Quittenbaum Galerie, Munich, Germany
02.2024 <Es kommt nicht auf die Größe an>, Galerie Lachenmann-Art, Frankfurt, Germany
01.2024 <Achromatic>, Biesenbach Galerie, Cologne, Germany
07.2023 <Studio 84>, Galerie Lachenmann Art, Constance, Germany
06.2023 <Trialogue-Aspects of Abstraction>, Biesenbach Galerie, Cologne, Germany
04.2023 <Female Perspectives>, Galerie Lachenmann Art, Frankfurt, Germany
11.2021 <Luxembourg Art Week>, Biesenbach Galerie, Cologne, Germany
01.2021 <Sculptural. Painting>, Biesenbach Galerie, Cologne, Germany
05.2020 <Carte Blanche>, Biesenbach Galerie, Cologne, Germany
01.2020 <MNMSLM 2>, Biesenbach Galerie, Cologne, Germany
09.2018 <Sinngefüge>, Biesenbach Galerie, Cologne, Germany
06.2018 <augenfällig/fresh positions>, BBK Art Association, Düsseldorf, Germany
01.2018 <Juxtaposition>, Biesenbach Galerie, Cologne, Germany
11.2017 <unbunt-achromatic>, Biesenbach Galerie, Cologne, Germany
10.2017 <Arbeitstitel-Akademie>, Kunsthalle Düsseldorf, Germany
04.2017 <EAF-50 Contemporary Artists>, Enter Art Foundation, Multipolster Store, Berlin, Germany
02.2017 <Die Grosse>, Cooperation Class Hörnschemeyer, Kunstpalast, Düsseldorf, Germany
12.2015 <LOT-Lack of Transmission>, Detro_it, Toronto (US, CA)
10.2014 <Landgänge>, Gesellschaft für Aktuelle Kunst Bremen, Germany
07.2013 <High On Visual Art>, Hutchins Gallery, Brooklyn (US)
07.2013 <12 plus 9 Frühe Netzwerke>, Bremen City Gallery, Germany
and others

Scholarships
2015 DAAD Matching Fund Scholarship, Bremen, Germany

Awards
2025 Selection, Grand Art Exhibition of Korea Modern Art Awards, Seoul
2025 Selection, Shin Saimdang Art Competition, Gangneung
2017 Nominee, Blooom Award 2017 by Warsteiner, Germany
2016 Nominee, Zucker Art Collection, Budapest, Hungary
2014 Grand Prize, Poster Concept Pathfinder Award, Kookmin University, Seoul
2011 Grand Prize, Hochschulpreis, Hochschule für Künste Bremen, Germany' WHERE name_ko = '이지은' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Publications
"Flowers Blooming in the Shade" Bundo Publishing (1981)
"Han - A Meeting of Theology and Art" co-authored with Seo Namdong, Bundo Publishing (1982)
"Biography of Van Gogh" Woongjin Publishing (1987)
"Biography of Kim Hongdo" Woongjin Publishing (1987)
"Dawn Comes, Beat the Drum!" Theory and Practice (1989)
"Even Birds Have Weight" Haeinsa Publishing (1990)
"Mountain Cherry Blossoms in White..." Hakgojae (1993)
"Song of Dry Grass" Hakgojae (1995)
"Such a Good Day" Hakgojae (2000)
"On the Night When Pear Blossoms Bloomed White" Munhakdongne (1996)
"One Sound" Munhakdongne (2001)
"Even Birds Have Weight" Munhakdongne (2002)
"Waking to Morning Every Day: Lee Cheolsu''s Leaf Letters" Samin (2006)
"Thank You for Being Here" Samin (2009)
"I Miss You Today Too (Lee Cheolsu''s Leaf Letters)" Samin (2010)
"Small Gift" Homi (2004)
"Song" Homi (2005)
"Happiness of a Bowl of Rice, Joy of a Bowl of Water" Samin (2004)
"Quietly, Quietly, Love These Small Things" Samin (2005)' WHERE name_ko = '이철수' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Solo Exhibitions
2024 GALLERIE LUTÈCE PRESENTS_Kimchi (12/24-12/28, COEX, Seoul)
2023 Ms. Lee''s Drifting (2/15-3/1, Jeong Mun-gyu Museum of Art)
2022 Kimchi_Breath (3/30-4/3, CICA Museum)
2022 Moon of the Top (1/10-1/26, Gallery Hoho)
2021 Breath_Profound (1/28-2/17, Art Jamsil)
2019 Kimchi (11/20-11/30, Alternative Art Space Ipo)
2016 WHO AM I? (11/25-12/8, Jeongsu Gallery)
2015 Form Is Emptiness, Emptiness Is Form (3/11-4/3, AP Gallery)

Selected Group Exhibitions
2025 <DMZ International Art Exchange Project for the 80th Anniversary of Liberation: Beyond Borders>, DMZ Museum & Unification Observatory, Goseong (Gangwon-do)
2025 <Counter Memory, Counter Voices> Finale Performance, Daegu Station, Daegu
2025 <New Simdo Journey - Bridging Two Worlds Through Art>, Ganghwa War Museum Lawn, Ganghwa
2024 <Fukuoka Art Award 2024> Laureate Exhibition, Fukuoka Art Museum, Japan
2023 <UTOPIA?! PEACE>, Kunstraum Potsdam / Berlin Wall Memorial (Bernauer Straße) / Babelsberg Palace, Germany
2023 <FREEDOM 2023>, Fukuoka Asian Art Museum, Japan
2022 <Changwon Sculpture Biennale - Beyond Borders Project>, Seongsan Art Hall, Changwon
2022 <SIEAF Seomjin River International Experimental Art Festival>, Jewolseom, Gokseong
2021 <After DMZ, Breath of the Earth>, Yangpyeong Museum of Art, Gyeonggi-do
2021 <Yeosu International Art Festival>, Yeosu Expo Convention Center, Yeosu
2020 <Kathmandu Contemporary Art Exhibition>, Nepal Art Council, Kathmandu, Nepal
2018 <DMZ Art Festa 2018 "Peace: Wind"> (2018 PyeongChang Winter Olympics), Goseong Unification Observatory & DMZ Museum, Gangwon-do
2018 <DMZ Art Festa 2018 "Peace: Wind"> (2018 PyeongChang Winter Paralympics), Gwanghwamun Square, Festival Park PyeongChang, DMZ Museum, Gangwon-do
and others

Awards & Selections
2026 <Hongti Art Center Residency> Long-term Resident Artist Selected, Busan Cultural Foundation
2024 2nd <Fukuoka Art Award> Excellence Award, Fukuoka Art Museum
2023 <UTOPIA?! PEACE> Invited & Selected, Kunstraum Potsdam / Berlin Wall Memorial / Babelsberg Palace, Germany - Berlin Wall Foundation & Kunstraum Potsdam
2018 <DMZ Art Festa 2018 "Peace: Wind"> (2018 PyeongChang Cultural Olympiad) Artist Selected, Ministry of Culture, Sports and Tourism & Gangwon-do
2016-2017 Overseas Exhibition Corporate Sponsorship Artist Selected, Shinjin Steel Co.
2013 20th <Korea Art International Competition> Excellence Award, Korea Art International Exchange Association
and others

Collections
Fukuoka Art Museum (2024)
Goseong DMZ Museum (2018)' WHERE name_ko = '이현정' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = '1974-1980 College of Arts, Dongguk University
1980-1983 Graduate School of Arts, Dongguk University
1984 Solo Exhibition: Life + Human (Gwanhun Gallery, Seoul)
Korean Critics'' Recommended Notable Artist Selection
1985 Invitational - Notable Artist (Seoul Art Museum)
1986 Song of Life I (Arab Gallery, Seoul)
1993 Invitational: Rain, Wind, Cloud (Bongseong Gallery, Daegu)
1997 Invitational: Ceramic Painting Exhibition (Hakcheon Gallery, Cheongju)
2002 Song of the Forest (Cheongju Arts Center, Cheongju)
2011 Invitational: Song of the Forest (419 Verones Gallery, LA)
Invitational: Tiger Who Loved Flowers (Gallery ATTY, Seoul)
2012 Song of the Forest (Insa Art Center, Seoul)
2013 Song of the Forest: Story of Trees (Insa Art Center, Seoul)
2014 Invitational: Spring Visit (Jeonju Hanji Museum); Lee Hongwon Drawing Exhibition (Sup Gallery, Cheongju)
2015 Lee Hongwon Invitational (Morris Gallery, Daejeon)
2019 Lee Hongwon Solo Exhibition (Gilgaon Gallery, Cheongju)
2020 4-Person Invitational of Artist Naon-ja and Teacher (Insa Art Plaza Gallery, Seoul)
2023 Moon Jar Exhibition (Insa Art Plaza, Seoul)
29 Solo Exhibitions total, 300+ Group Exhibitions
International Exhibitions: LA, New York, Sarajevo, Peru, China, Japan

Collections & Notable Activities
MMCA Art Bank
Cheongju Museum of Art
Chungbuk Provincial Office
Chungbuk Office of Education
SK Guest House
Portrait of Danjae Shin Chae-ho
Cheongnamdae Presidential Record Painting (Roh Tae-woo)
2013 Dongbu Securities Calendar
2014 SK Calendar' WHERE name_ko = '이홍원' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
Ph.D., Photography, Department of Design & Crafts, Graduate School, Hongik University

Solo Exhibitions
2025 Flowers Fall to Earth, Busan Gallery, Busan
2023 Donghae Line - Station/History, Gallery Lucida, Jinju
2022 Donghae Line - Station/History, Alliance Française de Busan ART SPACE, Busan
2018 Flowers Fall to Earth, Alliance Française de Busan ART SPACE, Busan
2017 Today''s Weather, Gallery Sujeong, Busan
2012 BEYOND, Toyota Photo Space, Busan
2011 BEYOND, Gong Geunhye Gallery, Seoul

Group Exhibitions
2025 Memory Is an Old Story (Geumsam Museum of Art, Busan)
2025 Our Heterotopia (Gallery Tan, Daejeon)
2025 Busan-Ulsan-Gyeongnam Photo Exchange Exhibition: Afterimage of Memory (Busan City Hall Gallery, Busan) and 60+ exhibitions

Publications
2024 Flowers Fall to Earth, Ryugaheon
2011 BEYOND, Ryugaheon' WHERE name_ko = '정금희' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'M.A., Fine Art, Chelsea College of Arts, London, UK
B.F.A., Painting (Western Painting), Sejong University, Seoul, Korea

Solo Exhibitions
2025 Palimpsest - Things That Remain While Disappearing, Space Thunder, Seoul
2024 Connection, Gallery Sil, Place Nakyang, Nakyang Mosa
2023-2024 Time, Space and Memory - Storing Time and Space as Memory, E-Land Gallery Artro / E-Land Cultural Foundation, Seoul (Shin Guro NC Department Store)
2022 YONDER, Fill Gallery, Seoul
2022 The Time in Between, Seoul Shinmun-Seoul Gallery Exhibition Artist Competition Selected Artist Exhibition, Seoul
2021 I Run Into You, Sai, Eunpyeong Cultural Foundation Youth Artist Support Project, Art Soombi, Seoul
2021 Line and Light, Art Space W, Wooshin Jewelry, Seoul
2020 Rendezvous, E-Land World HQ, E-Land Cultural Foundation, Seoul
2020 TIME, Fill Gallery, Seoul
2018 Intersected Time, Seum Art Space, Seoul
2017 MY STORY, Fill Gallery, Seoul
2017 Remembrance, Sai Art Document, Seoul
2016 Self-Transformation, Invitational, Jeong Gallery, Seoul

Selected Group Exhibitions
2025 Summer Salon, Gangseo Artrium Gallery Seo (Gangseo Culture Center), Seoul
2025 Gaze of the Gap, P&C Total Gallery, Seoul
2025 3-Person Invitational, MH Gallery, Gyeonggi-do
2024 Stay, 3-Person Exhibition, Gallery hoM, Seoul
2023 Far Away, 3-Person Exhibition, Gallery hoM, Seoul
2021 Reaching, Dongtan Art Space Emerging Artist Competition 3-Person Exhibition, Hwaseong Cultural Foundation, Gyeonggi-do
2016 YAP (Young Artist Project), Relay 3-Person Exhibition, Jeong Gallery, Seoul
and numerous others

Awards
2021 BIAF New Wave, Busan International Art Fair, Emerging Excellence Award
2021 Insa Art Plaza Gallery Artist Competition, Encouragement Prize
2018 IBK Industrial Bank of Korea Emerging Artist Competition, Grand Prize
2018 K-Painting Emerging Artist Competition, Excellence Award, Yunseung Gallery / Value Creative Foundation
2017 Yangju Municipal Chang Ucchin Museum of Art, 2nd New Drawing Project, Selection
2016 GAMMA Young Artist Competition, Selection

Collections
MMCA Art Bank, Seoul City Hall Museum, Gyeonggi Museum of Modern Art, Yangju Municipal Chang Ucchin Museum of Art,
Korean Fine Arts Association, Yunseung Gallery / Value Creative Foundation, Jogyejong Anguk Seonwon,
Fill Gallery, Gallery Jeong, Seum Art Space, Sophis Gallery' WHERE name_ko = '정미정' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = '2009, M.A., Department of Painting, Graduate School of Art & Design, Daegu University, Gyeongbuk

Solo Exhibitions
2024 Moving World (Culture Art Factory, Pohang)
2023 Spielen: Form Play (Apsan Gallery, Daegu)
2022 Mein Blau und Weiß (Omoke Gallery, Gyeongbuk)
2021 Die unvollendete Welt (Smiling Face Art Center, Daegu)
2019 Die Nacht (Dongseong Salon, Daegu)
2017 Augen zu und sehen (Damso Galerie & Teehaus, Berlin, Germany)
2010 Dreaming House (Yeongcheon Art Creative Studio, Yeongcheon)
2009 Symbolic Expression of Everyday Thought (Mir Gallery, Pohang)

Residencies
2022-2024 Art Lab Beomeo Resident Artist, Daegu
2009 Yeongcheon Art Creative Studio 2nd Cohort Resident Artist, Gyeongbuk

Selections
2025 Suseong Renaissance Project Art Rental Program, Suseong Cultural Foundation
2024 Pohang Culture & Arts Support Project Selected Exhibition
2024 Emerging Artist Competition Winner, Busan Connected
2021 Regional Artist Art Rental Program, Daegu Cultural Foundation

Group Exhibitions
2025 Garden Blooming from Fire (Daegu Art Factory, Daegu)
2025 HERMON Focus (Gallery Heomun, Busan)
2025 New Forces (Gallery Jien, Ulsan)
2024 Art Panorama ART (Daegu Art Way Space 2-4)
2024 Busan, Connected (Busan Modern & Contemporary History Museum B1 Vault Gallery, Busan)
2024 Opening Exhibition Pohang 4.4.3 (Gallery 443, Pohang)
2024 Art Record Cheongju (Culture Manufacturing Plant, Cheongju)
2024 Day and Night: Kim Sehan & Jeong Seoon 2-Person Exhibition (Apsan Gallery, Daegu)
2024 Yeongnam Young Artist Invitational: Playground Rediscovered (POSCO Gallery, Pohang)
2024 Center of Gravity (Gallery Oneul, Daegu)
2023 From Gunwi to Daegu (Samguk Yusa Theme Park, Daegu)
2023 ART SQUARE Form Play (Hyundai Outlet, Daegu)
2023 ARKO Online Media Art Activity - Transparent Society (Overlap, www.weavinglab.net)
2023 Art in Hongju (Hongseong Myeongdong Shopping District, Chungnam)
2023 Beautiful Companionship Exhibition (Dangjin Culture & Arts Center, Chungnam)
2022 Local: My Expansion (Dongseong-ro Sparkland Electronic Board, Daegu)
2022 Suseong Inside 49-31 (Sangdong 49-31, Daegu)
2022 Youth Art Project YAP''22 Boundary Point (EXCO, Daegu)
2022 2nd Youth Discovery Project How Are You? (Gallery M, Gyeongbuk)
2022 Rencontre (Elbirou Art Gallery, Sousse, Tunisia)
2022 Mosaic for Afghan Women Japan with Asian Friends (Space 680, Kyoto, Japan)
2022 RE:MIXING (Art Lab Beomeo Space 1-5, Daegu)
2022 Your and My Space (Art Lab Beomeo Space 1-5, Daegu)
2021 It''s Time 2 (Hwan Gallery, Daegu)
2021 A Midsummer Night''s Dream (Bona Gallery, Daegu)
2021 Homemade Art Mate (Andong Arts Center, Gyeongbuk)
2020 Art Spectrum WE (Beomeo Art Street Space 3-4, Daegu)
2020 Art Road - Suseong Trail Exhibition (Suseongmot Path, Daegu)
2019 Women''s Gaze of Daegu (EXCO, Daegu)
2018 Years Go By (Bongsan Culture Center, Daegu)
2017 Into an Unfamiliar Landscape (Gallery SUN, Daegu)
2017 Moonlight Project - Unsent Letter (Damso Galerie & Teehaus, Berlin, Germany)
2017 Sewol Passion (PG Berlin Gallery, Berlin, Germany)
2015 48 Stunden Neuköln - SOS - Kunst rettet Welt (BLEACH CLUB, Berlin, Germany)
2007-2014 Numerous group exhibitions and invitational exhibitions' WHERE name_ko = '정서온' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = '2018 B.F.A., Department of Painting, Incheon Catholic University

Solo Exhibitions
2025 Chaekgado (Scholar''s Bookshelf): Landscape of Life, Gallery Hwal, Seoul
2024 Shining Moments, Cafe Esperanto, Seoul
2022 Chaekgado: Embracing Life, CICA Museum, Gimpo
Chaekgado: Embracing Life, Gallery Nut, Seoul
2021 MANIF 2021 - Art Figuratif, Seoul Arts Center, Seoul
2019 Color of Light, Film Forum Gallery, Seoul
2017 Another Me, Film Forum Gallery, Seoul
2015 Jo Shinuk Exhibition, Sai Art Space, Seoul

Group Exhibitions (Selected)
2025 Walking on Waves, Film Forum Gallery, Seoul
Art Prism Art Fair, COEX, Seoul
Grand Healing Art Exhibition of Korea, Wolsan Museum of Art, Donghae
Seoul Jung-gu Art & Culture Festival, L7 Myeongdong by Lotte, Seoul
Starbucks Art Competition Award Exhibition, Seoul National University Dental Hospital Gallery Chiyu, Seoul
Seoul International Art Awards, KEPCO Art Center, Seoul
Artist (Dis)covery Exhibition, Gangnam Disabled Welfare Center Active Gallery, Seoul
Janghang 1931 Moving Boundary, History of Janghang, Seocheon
Sewol Ferry 11th Anniversary Memorial Exhibition, 4.16 Life Safety Education Center, Ansan

Awards (Selected)
2025 Grand Healing Art Exhibition of Korea Special Selection
2025 Seoul International Art Awards Seoul Metropolitan Council Chairman Award
2025 Starbucks Art Competition Bronze Prize
2023 Gwanghwamun International Art Festival Competition Selected, Sejong Center Museum
and numerous others' WHERE name_ko = '조신욱' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = '1940 Born in Seoul
1960 Attended Hongik University College of Fine Arts, Department of Western Painting (withdrew after one semester)

Solo Exhibitions
2016 Joo Jaehwan: Metamorphosis in the Dark, Hakgojae, Seoul
2015 Chimi Mangryang (Ghosts and Goblins), Trunk Gallery, Seoul
2013 The Odd Show - Janggo Joo Jaehwan, Alternative Art Space Ipo, Seoul
2012 Gwanhun Gallery, Seoul
2011 Vertigo, Trunk Gallery, Seoul
2009 Gallery Soso, Paju
2007 CCTV in Operation, Project Space Sarubia Dabang, Seoul
2002 Behold This Pleasant Fellow, Sejong Gallery, Jeju
2001 Yesul Madang Sol, Daegu
2000-01 Joo Jaehwan: Behold This Pleasant Fellow, Art Sonje Center, Seoul

Selected Group Exhibitions
2018 4·3 70th Anniversary East Asian Peace & Human Rights Exhibition: From Silence to Outcry, 4·3 Peace Memorial Hall, Jeju
2017 Unity of Literature and Painting, Gyeongju Solgeo Museum of Art, Gyeongju
2017 Grass Stands, Art Space Pool, Seoul
Song Against Oblivion, Seoul Museum of Art Namseoul Branch, Seoul
2016 Title Match: Joo Jaehwan vs Kim Donggyu, Seoul Museum of Art, Seoul
2015 Three Star Show, Indipress, Seoul
4.16 Sewol Ferry 1st Anniversary Memorial: Resisting Oblivion, Ansan Culture & Arts Center, Ansan
22nd 4·3 Art Festival: Transparent Tears of Ice, Jeju Museum of Art, Jeju
Asia and Rice, Jeonbuk Art Center, Jeonju
Liberation 70th Anniversary: The Great Flow - Noisy, Hot, Overflowing, MMCA Seoul
Fortune-Telling House, Zaha Museum, Seoul
Jungle Shoes, Kim Kim Gallery, La Suisse/Nantes, France
Grass Stands, Art Space Pool, Seoul
2014-15 Content-Certified Mail: Prove Your Life, Alternative Art Space Ipo, Seoul
2014 SeMA Biennale, Mediacity Seoul 2014: Ghosts, Spies, Grandmothers, Seoul Museum of Art; Korean Film Archive, Seoul
Old Commands and New Performances, Philosophy Academy, Seoul
Once Is Not Enough, Sigak, Seoul
Indonesia-Korea Artists Exhibition: Low Stream, Jeju Museum of Contemporary Art, Jeju
2013 Expanding Two Islands, National Gallery of Indonesia, Jakarta; Tony Raka Art Gallery, Bali, Indonesia
Night Shadow, Shamanism Museum, Seoul
Residency Now, Songwon Art Center, Seoul
Heyri Slow Art: Running World, Walking Art, Resting Village, Nonbat Art School, Paju
2012 20+ Meeting Art, Goyang City 20th Anniversary 20 Artists Invitational, Aram Museum of Art, Goyang
Humble Art, Complex Cultural Space Emu, Seoul
Gyeonggi Creation Center Residency, Gyeonggi Creation Center, Ansan
2011 Poetry and Painting as One, Gana Art Center, Seoul
23rd Motherland''s Mountains, Sejong Center Gwanghwarang, Seoul
Dépaysement: City Unfolding, Arko Art Center, Seoul
2010 Reality and Utterance 30 Years: Social Reality and Artistic Reality, Insa Art Center, Seoul
In Between, One and J Gallery, Seoul
Power of Gyeonggi-do, Gyeonggi Museum of Modern Art, Ansan
Beyond the Yellow Line, Kyunghyang Gallery, Seoul
Language Play, Sungkok Art Museum, Seoul
The Trickster Makes This World, Nam June Paik Art Center, Yongin
2009 Seoul History Museum Special Exhibition: Gwanghwamun Ballad, Seoul History Museum, Seoul
Blue Dot Asia 2009, Hangaram Art Museum, Seoul Arts Center, Seoul
Daehak-ro 100, Arko Art Center, Seoul
2008 Poet Kim Suyoung 40th Memorial: Conversion Period, Art Space Pool, Seoul
Ko Wooyoung Manga: Never Ending Story, Arko Art Center, Seoul
Pop Art Toon: Opening the Time Capsule, Korea Manhwa Museum, Bucheon
Where the World Sat, Kookmin Art Gallery, Seoul
Working Magazine Works, Ga Gallery, Seoul
2007-08 Pulse of the People - Realism in Korean Art 1945-2005, Niigata Bandaijima Art Museum; Fukuoka Asian Art Museum; Fuchu Art Museum, Tokyo; Otani Memorial Art Museum, Nishinomiya; Miyakonojo Art Museum, Miyazaki, Japan
2007 100 Years of Korean Modern Poetry: 500 Poets & 500 Artists, Sejong Center, Seoul
Son Jangseop & Joo Jaehwan, Gallery Noon Changdeokgung, Seoul
Wham - Gallery Noon Changdeokgung Opening, Gallery Noon Changdeokgung, Seoul
Imagination Recharge: Six Imaginations Telling Contemporary Art, Gyeonggi Museum of Modern Art, Ansan
2006 Drawing Well, Drawn to Drawing - SoMA Drawing Center Opening, SoMA, Seoul
9th West Sea Art Festival, National Education Field Exhibition, Incheon Culture & Arts Center, Incheon
Somewhere in Time, Art Sonje Center, Seoul
Memory of Books, Heyri Book House Gallery, Paju
2005 Liberation 60th Anniversary: Trial and Advance, National Assembly Central Plaza, Seoul
The Battle of Visions, Kunsthalle Darmstadt, Germany
Discordance: Korean Contemporary Art, Richard F. Brush Art Gallery, St. Lawrence University, Canton, USA
2004 Peace Declaration 2004: 100 World Artists, MMCA Gwacheon
Alchemy of Everyday, MMCA Gwacheon
You Are My Sunshine: Korean Contemporary Art 1960-2004, Total Museum of Art, Seoul
2003 50th Venice Biennale Arsenale, Z.O.U. - Zone of Urgency, Venice, Italy
Comics in Art, Art in Comics, Ewha Womans University Museum, Seoul
Mothersland: Anti-War/Peace, Gwanhun Gallery; Art Space Pool, Seoul
Welcome to Seoul: Seoul National Art Association 2003, Gwanghwamun Gallery, Sejong Center, Seoul
You, Where Do You Live? - 1st New Town, MBC Janghang-dong Broadcasting Site, Goyang
2002 4th Gwangju Biennale: P_A_U_S_E, Gwangju Biennale Exhibition Hall, Gwangju
2001 Wind Wind Wind: 13th Motherland''s Mountains, Sejong Art Museum Annex, Sejong Center, Seoul
Next Generation, Asian Contemporary Art, Passage de Retz, Paris
2000 Busan International Art Festival: Leaving Godot, Busan Museum of Art, Busan
Joo Jaehwan & Ko Seungwook''s Public Video, Art Space Pool, Seoul
1999 Korea+JAALA: Northeast Asian and Third World Art, Seoul Museum of Art 600th Anniversary Hall, Seoul
1998 98 City and Video: Clothing, Food, Shelter, Seoul Museum of Art 600th Anniversary Hall, Seoul
1996 Reading Korean Masterpiece Poems Through Paintings, Hakgojae, Seoul
1995 50 Years of Liberation: Historical Art, Hangaram Art Museum, Seoul Arts Center, Seoul
1994 Donghak Peasant Revolution Centennial: Saeyasaeya Parangsaeya, Hangaram Art Museum, Seoul Arts Center, Seoul
1988 Milan Triennale, Wood Carving & Dancheong ''Suseon Jeondo'', Seoul Pavilion, Milan
1987 Anti-Torture, Geurim Madang Min, Seoul
1980-88 Reality and Utterance Group, Dongsanbang Gallery, Seoul, and numerous projects

Awards
2002 UNESCO Prize Special Award, 2002 Gwangju Biennale, Gwangju
2001 10th National Artists Award, Korean National Artists Association

Publications
2001 Behold This Pleasant Fellow
1980-2000 Art Culture

Collections
MMCA, Gwacheon
Art Bank, Gwacheon
Seoul Museum of Art, Seoul
Nam June Paik Art Center, Yongin' WHERE name_ko = '주재환' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Solo Exhibitions
2020 ''Slight Movement'', Zaha Museum, Seoul
2019 ''Living Water'', Namu Gallery, Seoul
2017 ''Homecoming'', Changryong Village Creative Center, Gyeonggi-do
2017 ''Evening at the Biotope'', Namu Gallery, Seoul
2015 ''Flowing Light'', Osan Museum of Art, Gyeonggi-do
2012 ''Poésie of Existence'', Gwanhun Gallery, Seoul
2010 ''Festival of Childhood'', Gallery Artside, Beijing, China
2009 ''Seat of Vanity'', T Art Center, Beijing, China
2001 ''RETURN'', Deokwon Gallery, Seoul, Korea' WHERE name_ko = '최경선' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Solo Exhibitions
2023 POP KIDS (Gallery H, Seoul)
Believing Is Seeing (Artertein Gallery, Seoul)
Face (Hoseo University Central Library Gallery, Cheonan)
2019 Choi Yunjeong Invitational (Gallery H, Cheongju)
2018 There Being (Gallery Banditraso, Seoul)
2016 Follow ME (Banditraso Gallery, Seoul)
Pop Kids (YTN Art Square, Seoul)
2014 Into The Pinhole (A.Style, Hong Kong)
Show Me the Money (Gallery Grida, Seoul)
2013 Desire (Gail Museum of Art, Gapyeong)
Into The Pinhole (Gallery 192, Seoul)
2010 Fantasyland (Sai Art Gallery, Seoul)
Choi Yunjeong Solo Exhibition (With Space Gallery, Beijing)
2009 Moderno (Busan Art Center, Busan)
2008 Nostalgia (KEPCO Plaza Gallery, Seoul)

Group Exhibitions
2023 Kiaf (COEX, Seoul)
Galleries Art Fair (COEX, Seoul)
Hong Beom-do: Portrait of the General (Namu Art, Seoul)
Survey of Our Wellbeing (Chosun University Museum, Gwangju)
Drawing Box (Artreon Gallery, Seoul)
Yeonhui Art Fair (Artertein Gallery, Seoul)
All Drawings of the World (Artertein Gallery, Seoul)
Winter at Sogong (Sogong Space, Seoul)
Empathy 23 (Artreon Gallery, Seoul)
2023 Gwangju Able Art Fair (Kim Dae-jung Convention Center, Gwangju)
2022 19th Asian Art Biennale Bangladesh 2022 (National Art Gallery, Dhaka)
I Am What I Paint (Califa Gallery, Seoul)
Desire (Artreon Gallery, Seoul)
Total Support (Total Museum of Art, Seoul)
Art Project 22 (Art Space KC, Pangyo)
Inscribed on the Thousand-Year Road, Your and My Gaze (Gyeonggi New Millennium Gallery, Suwon)
2021 Great Roots (Insa Art Center, Seoul)
All Drawings of the World (Artertein, Seoul)
Yeonhui Art Fair (Artertein, Seoul)
Women''s Rights Story Through Contemporary Art: March (ArtNoid 178, Seoul / Geumjeong Arts Center Gallery, Busan / Seogu Culture Center, Incheon)
Empathy 2021 (Artreon Gallery, Seoul)
PLAS Art Show (COEX, Seoul)
Urban Break (COEX, Seoul)
2020 Visual Imagination (Seohae Museum of Art, Seosan)
All Things Prosper (Art Terminal Small Museum, Jeongseon)
Cart Museum (Art Terminal Small Museum, Jeongseon)
Super Collection (Superior Gallery, Seoul)
From Everyday (Gallery The Flow, Seoul)
Everyone''s Drawing (Artertein, Seoul)
2019 WIT: What''s the Issue These Days? (Chosun University Museum, Gwangju)
Neighbor Artists (Namu Art, Seoul)
Art Busan (BEXCO, Busan)
Family Garden (Yangpyeong Museum of Art, Yangpyeong)
Do The Right Thing (Jeju Sculpture Park Exhibition Hall, Jeju / National Assembly, Seoul)
2018 SCOPE MIAMI (Miami Beach, Miami)
Daegu Art Fair (Daegu Convention Center, Daegu)
Shanghai Art Fair (Shanghai World Expo Exhibition & Convention Center, Shanghai)
Art Mining (DDP, Seoul)
Korean Pop Art (Hanam Cultural Foundation, Hanam)
Do The Right Thing (Seongbuk-gu Office Gallery, Seoul)
Osan Museum of Art New Acquisitions (Osan Museum of Art, Osan)
2017 Media Ecstasy (Kyungpook National University Museum, Daegu)
Fantastic Show Show Show (Gallery Jain Zeno, Seoul)
Do The Right Thing (Glendale Library, LA)
Arari Platform - POP (Art Terminal Small Museum, Jeongseon)
Image and the Other''s Eye (Seosan Culture Center, Seosan)
2016 Heritage of Our Times (Yangpyeong Museum of Art, Yangpyeong)
Oh, Lone Wolf (Woojong Museum of Art, Boseong)
2015 Seoul Affordable Art Fair (DDP, Seoul)
Art China (National Agricultural Exhibition Center, Beijing)
Run to Fancyland (The Popsy Room, Hong Kong)
Hello! Pop (Jeju Museum of Art, Jeju)
Inter-Reflection (Seosan Culture Center, Seosan)
Uncertain Paradise (Gallery Imaju, Seoul)
Art Busan (BEXCO, Busan)
Hong Kong Affordable Art Fair (HKCEC, Hong Kong)
Beyond Pop (Lotte Hotel Gallery, Seoul)
Discourse of Convergence (Sai Art Space, Seoul)
2014 Live and Let Live (Gallery Clay, Sydney)
Singapore Affordable Art Fair (F1 Pit Building, Singapore)
Kiaf 2014 (COEX, Seoul)
Art Gwangju 14 (Kim Dae-jung Convention Center, Gwangju)
Busan Art Show 2014 (BEXCO, Busan)
Asia Contemporary Art Show (Conrad Hotel, Hong Kong)
Galleries Art Fair (COEX, Seoul)
2013 Girl''s Dream (Lotte Gallery, Seoul)
Meeting a Zombie on Teheran-ro (Gallery Imaju, Seoul)
Asia Contemporary Art Show (JW Marriott, Hong Kong)
Falling for Comics (Lotte Gallery, Daejeon)
As Seen (Gallery Grida, Seoul)
Black Bridge Exhibition (TV12 Gallery, Seoul)
2012 Asia Contemporary Art Show (Grand Hyatt Hotel, Hong Kong)
Real/Unreal (With Space Gallery, Beijing)
ART Plage (Lotte Gallery, Busan/Seoul)
This Is Popular Art (Sejong Center Museum, Seoul)
Real/Unreal (Sai Art Gallery, Seoul)
Can You Find Me? (Ilhyun Museum, Yangyang)
2011 Yangpyeong Museum Opening Exhibition <Magic Land, Yangpyeong> (Yangpyeong Museum of Art)
Fun + Pop: Pleasant Contemporary Art (Gwacheon Civic Center, Gwacheon)
Emerging Artists Part 3 (MK2 Art Space, Beijing)
Psychology of Desire: Speaking of Us (Gail Museum of Art, Gapyeong)
2010 Art Share (Dongduk Art Gallery, Seoul)
Flow of Korean Contemporary Art III - Pop Art (Gimhae Culture Center, Gimhae)
Departopia (Lotte Gallery, Anyang)
9th Funny Painting Funny Sculpture (Sejul Gallery, Seoul)
Hahahohoho (Shinsegae Gallery, Gwangju/Busan)

Collections
MMCA Art Bank (Gwacheon), Yangpyeong Museum of Art, Osan Museum of Art, HiteJinro (Seoul),
META Korea (Seoul), Hoseo University (Asan), AnaPass (Seoul), YK BNC (Seoul) and numerous private collections

Residency & Other Projects
2013 Collaboration with LOTTE (Seoul)
2011 Collaboration with HITE (Seoul)
2011 Liinwimi Creative Studio (C.O.L. Art Management, Beijing)' WHERE name_ko = '최윤정' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
B.A., Photography, Chung-Ang University
M.P.A., Graduate School of Public Policy, Ajou University

Solo Exhibitions
2023 Kairos Mural, Art Space Areum, Suwon
2022 Hwaseong: Landscape of Apocalypse, Suwon SK Artrium Art Gallery, Suwon
2020 Hwaseong: Landscape of Apocalypse, Haenggung-jae Gallery, Suwon
2019 Tears, DDP Notification Hall 2, Seoul
2019 Hwaseong: Peripheral Landscape, Ideale, Suwon
2017 Dreaming Ballad, Nosong Gallery, Suwon

Group Exhibitions
2025 Busan International Photo Festival Open Call Special Exhibition, Busan
2025 Question Project, KP Gallery, Seoul
2024 Contemporary Photographer Special Exhibition, Manhattan, USA
2024 AI-Generated Media Art by Suwon Culture & Arts Professionals, Suwon Media Center, Suwon
2024 Culture Line 1 Touring Exhibition (5 cities) Urban Landscape, Urban Flaneur (Bupyeong, Bucheon, Yeongdeungpo, Suwon, Uijeongbu Cultural Foundations)
2024 Fly High Artist Competition Curated Exhibition, Chungmuro Gallery, Seoul
2023 Republic of Korea International Photo Festival, Hangaram Art Museum, Seoul Arts Center, Seoul
2022 Gyeonggi-do Women Artists Association, Gangho Gallery, Seoul
2022 Republic of Korea Photo Festival, Hangaram Art Museum, Seoul Arts Center, Seoul
2021 Art Gyeonggi Halloween Art Market, Collaboration Space Hanchigak, Pyeongtaek
2021 Art Gyeonggi Art Road 77, Um Gallery, Paju
2021 Contemporary Photography Competition Selected Artist Exhibition, Gallery Index, Seoul
2021 Insadong Photo Shop, Topohaus, Seoul
2019 Gyeonggi-do Photo Festival, Anseong Matchum Art Hall, Anseong
2019 Republic of Korea Photo Festival, Hangaram Design Museum, Seoul Arts Center, Seoul
2018 Gyeonggi-do Photo Festival, Icheon Art Gallery, Icheon
2018 PASA Festival, Suwon Art Exhibition Hall, Suwon
2016 Gyeonggi-do Local Artist Invitational, Pyeongtaek Lake Art Center, Pyeongtaek
2016 Suwon Light Painting Festival, Suwon Traditional Art Center, Suwon
2015-19 Northeast Asian Photo Exchange Exhibition, Suwon Art Exhibition Hall, Suwon

Awards & Selections
2025 Kyobo Education Foundation VR Art Gallery Competition Artist Selected
2024 Culture Line 1 Touring Exhibition Artist Selected (5 Cultural Foundations)
2024 AI Media Art Artist Selected, Suwon Cultural Foundation Media Center
2024 Fly High Artist Competition Selected, Chungmuro Gallery
2023 Republic of Korea International Photo Festival Hyeonghyeongsaeksaek Award
2023 Hyeonghyeongsaeksaek Culture & Arts Support Project Selected, Suwon Cultural Foundation
2021 8th Contemporary Photography Competition Artist Selected, Gallery Index
2021 Art Gyeonggi 2021 Artist Selected, Gyeonggi Cultural Foundation
2020 Hyeonghyeongsaeksaek Culture & Arts Support Project Selected, Suwon Cultural Foundation' WHERE name_ko = '최재란' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
2019 M.F.A., Sculpture, Académie Royale des Beaux-Arts de Bruxelles, Belgium
2016 B.F.A., Sculpture, Académie Royale des Beaux-Arts de Bruxelles, Belgium
2015 DNAP, School of Fine Arts, Toulon, France

Awards & Selections
2024 Angeli Museum Award
2023 Nowon Cultural Foundation <Gyeongchunseonsupgil Gallery & Culture Space Jeongdam 2023 Visual Arts Exhibition Support Project>
2021 Porsche Korea ''Dreamers On Art Award'' Selected
2021 7th Gasong Art Award ''Excellence Award'' (Dongwha Pharmaceutical Gasong Foundation)
2020 Mapo-gu <Our Neighborhood Artterieur Project>
2017 ''Young Belgian Talents'' Selected (Affordable Art Fair Brussels)

Solo Exhibitions
2023 <Record of Traces n''1>, CICA Museum, Gimpo

Group Exhibitions
2024 <Drawing Now 2024>, CICA Museum, Gimpo
2024 <19th Gwanghwamun International Art Festival - 2023 Asian Contemporary Art Young Artist Exhibition>, Sejong Center Museum, Seoul
2024 <Ninja>, Space Tu, Seoul
2024 <AAC Beautiful Companionship>, Angeli Museum, Yongin
2023 <Gyeongchunseonsupgil Gallery & Culture Space Jeongdam 2023 Visual Arts Exhibition Support Project by Nowon Cultural Foundation>, Gyeongchun Line Forest Gallery, Seoul
2023 <Garden of April>, Gallery The J, Incheon
2022 <Between Time and Space: Youth, Vibe>, Iksan Youth Hall, Iksan
2022 <2022 Green Renaissance Project "Nature Art Cube Exhibition" by Group Yatu>, Jeonju Palbok Art Factory, Jeonju
2022 <Drawinging Drawing Festival>, Insa 1010, Seoul
2022 <THE HOUSE OF MACAN BY Porsche Korea>, Cafe Poze, Seoul
2021 <Dreamers.On in Porsche Now Busan>, PIAK, Busan
2021 <Choice and Change>, (EX) Iri Financial Association, Iksan
2021 <2021 Gwangju Design Biennale_Dreamers.On by Porsche Korea>, Gwangju Biennale, Gwangju
2021 <7th Summer Saengsaek>, Insa Art Center, Seoul
2020 <Chungbuk Education & Culture Center Special Exhibition ''Nature Art Cube 12x12x12+Nature''>, Yebom Gallery, Cheongju
2020 <Geumgang Nature Art Biennale 2020 ''Nature Art Cube 12x12x12+Nature''>, Geumgang Nature Art Center, Gongju
2020 <Abstract Mind>, CICA Museum, Gimpo
2018 <Festival ''Triennale de l''art et du Végétal''>, La Maison Culturelle d''Ath Center, Ath, Belgium
2018 <Love - Ath>, Espace Alternatif, Ath, Belgium
2018 <Carte de Visite>, ARTopenKUNST Espace Vanderborght, Brussels, Belgium
2017 <L''Apropos>, KULTURANIVL, Nivelles, Belgium
2017 <Autonomy>, Espace Alternatif, Brussels, Belgium
2017 <Young Belgian Talents 6 Artists>, Affordable Art Fair Brussels, Tour & Taxis, Brussels, Belgium
2017 <Carte de Visite>, ARTopenKUNST Espace Vanderborght, Brussels, Belgium
2016 <Ministère d''Affairs Intérieures>, Espace Alternatif, Brussels, Belgium
2016 <Extraordinaires Objets de l''Ordinaire>, Galerie des AAB, Paris, France
2016 <Cachan Biennale d''Art Contemporain>, Hôtel de Ville-Orangerie-Château Raspail, Cachan, France
2014 <INSTALLATION PRESSING - EBB AND FLOW>, Galerie Le Pressing, La Seyne-sur-Mer, France

Collections
Dongwha Pharmaceutical' WHERE name_ko = '최혜수' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = '2025 Wasteland: Field of Phantoms Exhibition (57th Gallery) / 2024 Wasteland: Field of Idols Exhibition (Namu Art) / 2023 Partisan of Trees Guerrilla Exhibition: Portrait of General Hong Beom-do (Namu Art) / 2023 Fukushima Josam Mosa Exhibition (Arte Sup) / 2023 70th Anniversary of Armistice Curated Exhibition: Beloved Faces (Imjingak) / 2023 SAF Artist Support Fund Exhibition (Indipress) / 2023 10.29 Itaewon Disaster Memorial Exhibition (Arte Sup) / 2022 ''Looking'' Solo Exhibition (Namu Art) / 2021 Kim Suyoung 100th Birthday Anniversary Exhibition (Le Franc) / 2020 ''Sad'' Solo Exhibition (Hwain Art) / 2019 Republic of Korea Prosecution Exhibition (Space Union) / 2018 Peace, Reunification, Wish DMZ International Invitational (Odusan Unification Tower) / 2018 Nuclear Society Exhibition (Stateless Art Space) / 2018 ''It Hurts'' Solo Exhibition (Namu Art) / 2017 Bitter Taste Is the Taste of Life Group Exhibition (Insa Art Plaza) / 2016 Chilmoe Kimgu Invitational (Gallery Hwain Arts) / 2013 ''Back Alley Story'' Solo Exhibition (Gyeongin Gallery) / 1986 Fresh Statements by Young Generations (Geurim Madang Min) / 1985 1980s Representative Works Exhibition (Geurim Madang Min) / 1985 40th Liberation Anniversary Memorial Street Solo Exhibition (Ganghwa Market) / 1984 Local Artist Exhibition (Chilmoe Gallery) / 1983 Indépendant Exhibition (MMCA) / 1982 Dong-A Art Festival Entry (MMCA)' WHERE name_ko = '칡뫼 김구' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'B.F.A., College of Fine Arts, Hongik University

Solo Exhibitions
2025 With the Forest, Gallery Or, Yongin
2024 Forest, Circulation and Healing, Beotyi Museum Gallery, Yongin
2023 In the Summer Forest, Dongbaek Bookstore Gallery Invitational, Yongin
2022 Spring Is Coming, Asan Hospital Gallery Invitational, Seoul
2021 Your Forest, Gallery Gabi Invitational, Seoul
2021 Small Forest, Donuimun Museum Village Artist Gallery Selected Artist Exhibition, Seoul
2020 When I Miss You, Gallery Gabi Invitational, Seoul
2019 Spring, Fly Up and Bloom, Daelim Changgo Gallery Invitational, Seoul
2017 Forest of Memory, Gallery Gabi Selected Artist Exhibition, Seoul
2016 Pink Forest, Gallery Life Invitational, Seoul
2015 Forest Drawn with Thread, Seongbuk Art Creation Center Gallery Maejeum Selected Artist Exhibition, Seoul
2014 Forest. Breath. Rest., THE K Gallery Invitational, Seoul
2012 Forest Drawn with Thread, JH Gallery Selected Artist Exhibition, Seoul
2011 Forest Drawn with Thread, KB Kookmin Bank Seocho PB Center Invitational, Seoul
2009 When I Miss the Green, Gallery Topohaus, Seoul

Group Exhibitions
2025 50 Artists'' Early Spring, Eaglrak Art Space, Seoul
2024 Art Gyeonggi Run Festival, Gallery Kki, Paju
2024 100 Artists 100 Works, Artree Gallery, Seoul
2024 Gallery 71 Art Market, Gallery 71, Seoul
2023 Majungmul Art Market, Kim Ria Gallery, Seoul
2023 Art Festa Jeju, Jeju International Convention Center, Jeju
2022 Comply with Peace, Jeon Tae-il Memorial Hall, Seoul
2021 Up Close 03, Platform-L Museum, Seoul
2021 Art DMZ Festival, Studio Kki, Paju
2021 Sinjang-dong Halloween Art Market, Collaboration Space Hanchigak, Pyeongtaek
2021 Art Gyeonggi x Art Road 77, Gallery Um, Paju Heyri
2021 Ecological Art Connecting Nature and Humans, Gyeonggi Provincial Office Northern Branch Gyeonggi Millennium Gallery, Uijeongbu
2020 38th Galleries Art Fair, COEX, Seoul
2019 Art Living House Art Fair, Gyeonggi Imagination Campus Space 1986, Suwon
2019 Art Gyeonggi x Union Art Fair, S Factory, Seoul
2019 5th DOUZ Exhibition, Lee Jeonga Gallery Competition Artist Exhibition, Seoul
2018 3rd Art Gyeonggi Our Home One Painting, Icheon World Ceramics Center & Gyeonggi Touring Exhibition Venues
2018 36th Galleries Art Fair, COEX, Seoul
2017 51st Korean Fine Arts Association Exhibition, Hangaram Art Museum, Seoul Arts Center, Seoul
2016 Singapore Affordable Art Fair, F1 Pit Building, Singapore
2015 Joyful Beginning, Heesu Gallery Competition Artist Exhibition, Seoul
2015 Encountering Dreams, Gallery Ilho Competition Artist Exhibition, Seoul
2013 2nd Local Color New York Competition, Manhattan, New York
2013 47th Korean Fine Arts Association Exhibition, Hangaram Art Museum, Seoul Arts Center, Seoul
2013 Happy Tuesday, KB Kookmin Bank Star City PB Center, Seoul
2012 Seven Perspectives, JH Gallery Competition Artist Exhibition, Seoul
2011 Seoul Arts Center Artist Studio Exhibition II, Gallery 7, Seoul Arts Center, Seoul
2011 45th Korean Fine Arts Association Exhibition, SETEC, Seoul
2011 6th Kyunghyang Art Competition, Kyunghyang Gallery, Seoul
2010 AW Convention Center Gallery AW Artist Competition, AW Convention Center, Seoul
2010 14th Na Hyeseok Art Competition, Suwon Art Museum, Suwon
2010 The Realism, Gallery Gaga Competition Artist Exhibition, Seoul
2009 38th Gusang Exhibition, Seongnam Art Center, Bundang
2009 Contemporary Art & Vintage, Gallery Young, Seoul
2008 Korea-US Exchange Exhibition, Gallery Hun New York, Gallery Ho Seoul
2008 1st Seoul Arts Center Artist Studio Exhibition, Hangaram Art Museum, Seoul Arts Center, Seoul

Awards
2025 Yongin Special City Cultural Arts Competition Project Selected Artist
2024 Yongin Cultural Foundation Exhibition Culture Competition Selected Artist
2021 Songjeong Art Culture Foundation Creative Support Selected Artist
2021 Gyeonggi Cultural Foundation Selected Artist
2020 Seoul Donuimun Museum Village Artist Gallery Selected Artist
2019 Gyeonggi Cultural Foundation Selected Artist
2018 Gyeonggi Cultural Foundation Selected Artist
2015 Seoul Foundation for Arts and Culture Seongbuk Art Creation Center Selected Artist
2013 2nd Local Color New York Competition Excellence Award
2011 6th Kyunghyang Art Competition Encouragement Prize
2010 14th Na Hyeseok Art Competition Selection
2009 38th Gusang Exhibition Selection

Collections
MMCA (Art Bank), Gyeonggi Museum of Modern Art, Sanhak Cooperation Foundation, Haesung Korean Medicine Hospital (Gangnam Branch), E-Wide Plus Co., Yeonhong Development Co., Cafe Coin (Myeongdong Branch 1), Gallery Gabi, JH Gallery, THE K Gallery, Daelim Changgo Gallery, and numerous private collections

Current: Member, Korean Fine Arts Association' WHERE name_ko = '홍진희' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
2009 MFA, Pratt Institute, NY, USA
2007 MA, Nottingham Trent University, UK
2003 BFA, Department of Western Painting, Seoul Women''s University

Selected Solo Exhibitions
2025 Anonymous Moments, Chungju Cultural Foundation Mokgye Narae, Chungju
Anonymous Moments, Gallery LP, Seoul
2024 This Moment, Gallery Ilho, Seoul
Fragrance of This Moment, 09 Salon, Seoul
2023 Before Any Words, Gallery Coral, Seoul
Before Any Words, Gallery Still, Ansan
Before Any Words, Gallery Dos, Seoul
2022 Before Thinking, Gallery Hanok, Seoul
Before Thinking, Sai Art Space, Seoul
2021 Before Mind, Gallery Nut, Seoul
Before Mind, CICA, Gimpo
2017 Vantage Point, Lobby Gallery at 1133 Avenue of the Americas, Presented by ChaShaMa & Durst Organization, New York, NY
Before Mind, ChaShaMa Space at 55 Broadway, New York, NY
2015 In Between, Gallery Pirang, Heyri
In Between, Space Sun Plus, Seoul
2014 In Between, Gallery Imaju, Seoul
2012 Dialogue of Silence, Yashar Gallery, Brooklyn, NY
2011 Dialogue of Silence, Amos Eno Gallery, Brooklyn, NY
2010 Dialogue of Silence, Pop Art Factory, Seoul
Dialogue of Silence, Chelsea West Gallery, New York, NY
and 24 total

Selected Group Exhibitions (90+ domestic and international)
2025-2006 exhibited extensively across Seoul, New York, Brooklyn, Long Island City, Miami, Washington DC, Vienna, Chicago, Busan, Daegu, Gangneung, Paju, and other cities

Collections
One Medical Group (Cobble Hill, Brooklyn Location), Seoul Eastern District Court' WHERE name_ko = '김레이시' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Solo Exhibitions
2019 ''Adapted Territory'', Kim Chong Yung Museum Creative Support Exhibition, Kim Chong Yung Museum, Seoul
2013 ''Eternal Vacation'', Seoul Museum of Art Emerging Artist Selected Exhibition, Space Can, Seoul
2011 ''Shadow of Landscape'', Ehingen Municipal Museum of Art Curated Invitational, Ehingen, Germany

Group Exhibitions
2025 ''Yesterday Is the Future of the Past'', Songwon Art Center, Seoul
2023 ''Comply with Peace'', Jeon Tae-il Memorial Hall Gallery, Seoul
2022 ''Buffer Time'', Gyeonggi Millennium Gallery, Gyeonggi Northern Provincial Office, Uijeongbu
2019 ''Formula of Imagination'', Busan Museum of Contemporary Art New Acquisitions Exhibition, Busan Museum of Contemporary Art, Busan
2017 ''Border 155'', Seoul Museum of Art Main Building, Seoul
2016 Gyeonggi Promising Artist Saengsaeng Hwahwa, ''14 Perspectives'', Goyang Aram Museum of Art, Goyang, Gyeonggi-do
2015 ''Salon de SeMA'', Seoul Museum of Art New Acquisitions Exhibition, Seoul Museum of Art, Seoul
2014 ''BETWEEN WAVES'', Amorepacific Museum of Art Curated APMAP, Osulloc Museum, Jeju
2013 ''Events'', MMCA Goyang Studio Exhibition Hall, Goyang, Gyeonggi-do
2012 ''60 Works for Baden-Württemberg'', Siggen Municipal Museum of Art, Germany
2011 ''No Limits'', Stuttgart Wirtschaftshaus, Stuttgart, Germany
2010 ''Die Natur Verbindet'', Villingen-Schwenningen Municipal Park, Germany
2009 ''Zart'', curated by Jan Hoet, Galerie ABT ART, Stuttgart, Germany
2008 ''Test Bild'', Polizei Building, Stuttgart, Germany
2007 ''Foto Sommer'', Kunstakademie Exhibition Hall, Stuttgart, Germany
2006 Kunst Projekt ''Vor Fahrt'', Birkenwald Straße, Stuttgart, Germany' WHERE name_ko = '김태균' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
B.F.A., Department of Calligraphy, College of Fine Arts, Wonkwang University (1st class)
M.A., Art History, Graduate School of Humanities, Dongguk University

Current Positions
Honorary Chairman, Korea Calligraphy Design Association
Executive Committee Member & Director, Calligraphy Division, Korean Fine Arts Association
Team Leader, KBS Art Vision Video Graphics Team
Adjunct Professor, Calligraphy Professional Course, Nazarene University Lifelong Education Center
2022 Chairman of Jury, Grand Art Exhibition of Korea Calligraphy Category

Awards
2015 9th Dasan (Jeong Yakyong) Grand Award (Culture & Arts Category), Namyangju City

Publications
Kim Seong-tae, ''Learning Calligraphy with Brush alongside Jangcheon'', Deokju Publishing, 2022

18 Solo & Invitational Exhibitions / 250+ Group Exhibitions
2025 Muwoosoo Gallery Curated Jangcheon Kim Seong-tae Invitational ''Letters of Our Nation'', Muwoosoo Gallery, Seoul
2024 New Spring Curated Jangcheon Kim Seong-tae Invitational ''Spring of Gwangju'', Gwanseonjae Gallery, Gwangju
2024 ''Spring of Seoul in Mullae'' Curated Invitational, ArtField Gallery, Seoul
2021 Jangcheon Glsup Gallery Opening Exhibition, Haeundae, Busan
2020 Admiral Yi Sun-sin 475th Birthday & 75th Navy Anniversary Invitational, Naval Jinhae Base Command
2018 Gwangyang Bonga Grand Opening Curated Invitational, Gwangyang Bonga, Seoul
2018 Independence Activist Quotations Invitational, Independence Hall of Korea, Cheonan
2016 Notable Series IV Jangcheon Kim Seong-tae Invitational ''Ah! Admiral Yi'', Asan Foundation Gallery
(Extended: 2016 Independence Hall of Korea, Biseonjae)
2014 Notable Series III Sister Hae-in''s Poetry Exhibition ''Children Are Hope'', Insadong Sunhwa Gallery
(Extended: 2014 Busan Haeundae Culture Center)
2013 Notable Series II Dasan Jeong Yakyong 250th Birthday Memorial ''Ah! Yeoyudang'', Ara Art, Seoul
2011 Notable Series I 1st Anniversary Memorial of Venerable Beopjeong, Topohaus, Seoul

Title Calligraphy (Selected)
2025 Hwaseong Special City Inauguration Signboard
2024 Shinhan Financial New Year Slogan
2023 Film ''Seoul Spring''
2022 National Palace Museum ''Palace Signboard Exhibition''
2019 YTN Slogan
2015 Film ''Spirits'' Homecoming'' Title
2014 Blue House & Presidential Security Service Promotional Video Title
2014 Shinsegae Management Philosophy & Core Values
and numerous others

Broadcast Title Calligraphy
Historical Drama Taejong Yi Bang-won / Jang Yeong-sil / Immortal Admiral Yi Sun-shin / Tale of the Olden Days / and numerous others
Cultural: TV Show Jingpum Myeongpum / Korean Table / Gugak Hanmadang / Korean Language Challenge / Myeongyeonmanri / and others' WHERE name_ko = '장천 김성태' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Solo Exhibitions
2021 Baby Baby!, Hanok Gallery Invitational, Seoul
2021 Flower of Paramita, Mahabodhi Seonwon Invitational, Gyeongju
2020 Hidden Flower: Road to the Beloved, Seoul
2015 Goryeo Buddhist Painting Reproduction Exhibition, Proxy Place Gallery Invitational, LA, USA
2005 Buddhist Painting Exhibition, Yongin University Museum, and 10+ exhibitions

Major Invitational Group Exhibitions
2019 Kim Kyung-ho + Jo Yi-rak 2-Person Exhibition, Tibet House Invitational, New York, USA
2017 Goryeo Buddhist Painting Reproduction Exhibition, Flushing Town Hall, New York, USA, and 30+ exhibitions

Current
Jo Yi-rak Goryeo Buddhist Painting Research Institute
Cultural Heritage Repair Technician: Reproduction Technician #7148, Conservation Technician #7547
Lecturer, Muwoosoo Academy' WHERE name_ko = '조이락' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
2013 B.F.A., Department of Textile Art & Fashion Design, College of Fine Arts, Hongik University

Solo Exhibitions
2025 <Digging Out>, Rounded Flat, Jun 27-30, Seoul
2024 <Bad Taste>, Gallery Moss, May 24-31, Seoul
2022 <Story of a Ring Worm>, Peace Culture Jinji, Seoul, Oct 22-Nov 4
2022 <Overpainted Zone>, Goyang Aram Nuri, Goyang, Jul 27-31
2022 <Entrance>, Gallery Cafe Gaze, Seoul, Apr 20-May 8
2021 <Fragment of the Screen>, Horanggasinamu Creative Space, Gwangju, Nov 16-22
2021 <Genesis Garden - Gaze Beyond Focus>, Wumin Art Center, Cheongju, Sep 20-Nov 6
2020 <Genesis Garden - Inverted Clock>, Goyang Aram Nuri Museum, Goyang
2020 <Genesis Garden>, Yeongcheon Art Creative Studio, Yeongcheon
2018 <Not Unpleasant>, Gallery Binkan, Seoul
2014 <Reverse Chase>, Gallery Gaia, Seoul

Group Exhibitions
2025 <Landscape-Still Life>, N2 Art Space, Seoul, Jun 27-Jul 19
2025 <Tongue of Oblivion, Burning Eyes>, Art Space Raph, Seoul, Mar 14-Apr 5
2024 <Songdo Wandering>, Art Space In, Songdo, Oct 27-Nov 1
2024 <Demon''s Tail>, Gallery Horton, Aug 6-31
2024 <PROSPECT24>, Gallery Dehwite, Seoul, Feb 16-Mar 15
2023 <UNDER THE SURFACE>, Horanggasinamu Creative Space, Gwangju, Dec 15-Jan 15
2023 <Room 360>, Online Platform ''Spatial'', Oct 25-Dec 31
2023 <Expanding Landscape>, Goyang Aram Nuri Museum, Goyang, Oct 5-13
2023 <The Medium Is the Massage>, Collabo House Mullae, Seoul, Feb 22-27
2022 <Pretzel>, Gallery Gaze, Seoul, Dec 14-31
2022 <Yeonseoksan Horanggasinamu>, Yeonseoksan Woosong Museum, Oct 1-28
2022 <Together with Tiger>, Art District P, Busan, Sep 20-Oct 1
2022 <Simultaneous>, Gallery Gaze, Gallery Moss, Gallery Choyeon, Jun 2-12
2022 <Realistic Dreamers>, Gallery Moss, Seoul, Apr 19-25
2022 <Museum Contemplating Nature>, Goyang Aram Nuri Museum, Apr 13-May 25
2022 <Synthesis of Relations>, Horanggasinamu Creative Space, Gwangju, Mar 15-31
2021 <With>, Horanggasinamu Creative Space, Gwangju
2021 <I Too Am an Art Collector>, Goyang Aram Nuri Museum, Goyang
2021 <Story of a Miner>, Horanggasinamu Creative Space, Gwangju
2021 <Trouble in Paradise>, Round Them Oranges, Jaipur
2020 <Shadow of Perception>, Sian Museum of Art, Yeongcheon
2019 <Drawing on Paper>, Art Space Seoro, Seoul
2018 <Man>, Space Illi, Seoul
2018 <Landscape>, Gallery Birch, Seoul
2017 <Painter''s Self-Portrait>, Dooin Gallery, Seoul
2017 <Cloudy and Slow>, Beoplyeonsa Bulil Museum of Art, Seoul
2016 <What Is Art?>, Banditraso, Seoul
2016 <Group 23.5 Degrees>, Duru Art Space, Seoul
2015 <Group 23.5 Degrees>, Gallery Cheong / Gana Art Space / Gallery Imaju, Seoul
2013 <2013 Tetsuson>, Gallery BankART, Yokohama
2012 <Today''s Hongik Textile Art Curated Invitational>, KEPCO Art Center Gallery, Seoul
2012 <Goodness>, Seoul Museum of Art Gyeonghuigung Branch, Seoul
2011 <I>, Golden Tower Gallery, Seoul

Residencies
2022 Peace Culture Jinji 5th Cohort Resident Artist
2021 Horanggasinamu Creative Space 7th Cohort Resident Artist
2020 Yeongcheon Art Creative Studio 12th Cohort Short-term Resident Artist' WHERE name_ko = 'Salnus' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
2021-2024 Maryland Institute College of Art
BFA in Painting
summa cum laude

Solo Exhibitions
2024 Lazarus Hall Gallery, 131 W North Ave, Baltimore, Maryland - To Be Continued

Selected Group Exhibitions
2024 Korean Consulate in Washington DC, Washington, DC - Summer Comes to My Hometown, Seoul
Fox Gallery, Baltimore, Maryland - Spotlight, Graduating Seniors in Focus
2023 Deckers Gallery, Baltimore, Maryland - Juried Undergraduate Exhibition

Awards
Institutional Awards (Maryland Institute College of Art)
2024 Distinguished International Student Award
2023 General Fine Arts Department Recognition Award
Juried Undergraduate Exhibition Fall 2023 Merit Award
Presidential Scholarship
MICA Visionary Scholarship
2022 Foundation Department Recognition Award
Distinguished International Student Award
Presidential Scholarship
MICA Visionary Scholarship
2021 Presidential Scholarship
MICA Visionary Scholarship' WHERE name_ko = '이채원' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Solo Exhibitions
Asian Games (1986), Dong-A Art Festival Invitational (1987), Pro-Democracy Movement (1987), Jeonnong-dong 588 (1990), Buddhist Symbolism (1994), Traditional Patterns Invitational (1995), People of Donggang (2001), Wounds Left by Typhoon Rusa (2002), Mountain Village People (2004), Insadong: Landscapes of Memory (2007), Shinmyung Installation (2008), Erasing Mountains (2008), Insadong, Spring Days Pass (2010), Market Day: Lonely Peripheral Landscapes (2015), Cheongnyangni 588 (2015), It Is People (2016), Mountain Village People (2018), etc.

Publications & Co-authored Works
''Cheongnyangni 588 Photo Collection'', ''Go Forth, and Say It Was Beautiful: Cheon Sangbyeong Photo Collection'', ''Insadong Story Photo Collection'', ''Mountain Village People Photo Collection'', ''People of Donggang Photo Essay'', ''Buddhist Symbolism Photo Collection'', (Co-authored) ''Upo Wetland'', ''Donggang'', ''Nakdonggang'', ''Seoul Environment'', ''Great Collection of Korean Buddhist Art'' (7 volumes), etc.

Awards & Selections
Dong-A Art Festival Serial Work ''Red Light District'' Grand Prize (1985)
Asian Games Record Photography Competition Grand Prize (1986)
Gangwon Documentary Artist Selected (2002)
''Seoul Culture Today'' Culture Grand Prize (2018)' WHERE name_ko = '조문호' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Solo Exhibitions
* ''From Market to Cultural Heritage'' Jeong Yeongsin Solo Exhibition, 2025, Gallery Bresson
* ''The Market and People Are My Medicine'' Jeong Yeongsin Market Photo Exhibition, 2025, Gallery Index
* ''Jinan: That Fond Landscape'' / Community Museum Gyenam Jeongmiso
* ''Mother''s Land'' (2024, Jeonju Seohak-dong Photo Art Museum)
* ''Janghang Line Market Road Traveled Alone'' Publication Memorial Exhibition (2023, Gallery Index, Insadong)
* Jeong Yeongsin''s ''Market Day'' 2021-2022, Donuimun Museum Village Artist Gallery
* ''Mother''s Land'' 2021, Insadong Namu Art
* ''Let''s Go to the Market'' 2020, Gallery Bresson
* ''Capturing a Million Expressions at the Market'' (2018, Jeongseon Icicle Festival)
* ''Jeong Yeongsin''s Korean Markets'' (2017, National 5-Day Market Expo)
* ''Market Day'' (2016, Ara Art)
* ''Let''s Go to the Market Project 2'' (2015, Jeongseon Bus Terminal Cultural Space)
* ''Let''s Go to the Market'' (2015, Ara Art)
* ''Jeong Yeongsin''s Market'' (2012, Deokwon Gallery)
* ''Jeong Yeongsin''s Market Day Installation'' 2008, Jeongseon Mt. Manji Seonangdang Site
* ''Jeong Yeongsin''s Rural Market'' (2008, Jeongseon Arirang Festival Installation)

Group Exhibitions
* 2022 Time of Memory - Damyang Exhibition
* ''Soonsilsion'' (2017, Namu Gallery)
* ''Byeongshin Muran Hayaje'' (2017, Arisu Gallery)
* ''Candlelight History Exhibition'' (2017, Gwanghwamun Square)
and numerous other group exhibitions

Publications
* ''Beloved Land, Beloved Market - Jeollanam-do Edition'' 2025, Nunbit
* ''Puppies Met at Rural Markets'' 2023, Isup
* ''Janghang Line Market Road Traveled Alone'' 2023, Nunbit
* ''Mother''s Land'' 2021, Nunbit
* ''Let''s Go to the Market'' (From Rural Market to Cultural Heritage) 2020, Isup
* ''Jeong Yeongsin''s Market Stories 3'' 2019, Ramoretter e-book
* ''Jeong Yeongsin''s Market Stories 2'' 2019, Ramoretter e-book
* ''Jeong Yeongsin''s Market Stories 1'' 2019, Ramoretter e-book
* ''Market Day'' Nunbit Photographer Series 29, Jeong Yeongsin Photo Collection, 2016, Nunbit
* ''Jeong Yeongsin''s National 5-Day Market Pilgrimage'' 2015, Nunbit
* ''Korean Markets'' 2012, Nunbit Archive
* ''Rural Market Stories'' 2002, Jinseon Publishing
2013-2014 Nongmin Shinmun "Jeong Yeongsin''s Market Pilgrimage" serialization
2014 TBN Traffic Broadcasting "Jeong Yeongsin''s Stories from the Market"

Current
* Member, Writers'' Association; Committee Member, Inter-Korean Literary Exchange Committee
* Editorial Board Member & Contributing Reporter, Seoul Culture Today
* ''Jeong Yeongsin''s Market Stories'' currently serialized in Seoul Culture Today' WHERE name_ko = '정영신' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = '2024
Guro-gu Youth Achievement Solo Exhibition: Love All
2026
SAF Exhibition: Seeds of Art, Forming a Forest, Korea Smart Cooperative
2025
MEDEL GALLERY / SHU X GALLERY / VINCI
Mullae Art Fair
Circulation Gap: Everything Disappeared and Only ○○ Remained
2024
Project Space Gaze
2023
7th Art 5-Day Market Ewha
2023 ASYAAF
2023.04
Academic VIVIDROOM
2023 B.F.A., Department of Western Painting, Dankook University
2022 <ON AIR>
Dankook University Graduation Exhibition
July Artist Exhibition: Hwan, 2-Person Exhibition
Drawinging
Seogojeon Invitational
Multi-Color Painting
50th Gusang Exhibition National Competition - Seoul Competition Selection' WHERE name_ko = '한미영' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = '2025 Cut Sentences, Open Square (Democratization Memorial Hall)
2024 Solo Exhibition: Even If It Takes a Little Time (Dongducheon Ecological Peace Museum The Dream)
2020 Print, Print, Print (MMCA)
2019 Square: Art and Society (MMCA)
2017 Between Floors (MMCA Gwacheon)
2015 Gwangju Biennale 20th Anniversary Special Exhibition (Gwangju Museum of Art)
16 Solo Exhibitions and numerous group exhibitions
2012 Koo Bohnchang Art Award
Collections: MMCA, Gyeonggi Museum of Modern Art, Sakima Art Museum (Japan), Fukuoka Asian Art Museum (Japan)

Publications: ''I Am a Farmer'', ''Even If It Takes a Little Time'', etc.' WHERE name_ko = '이윤엽' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Solo Exhibitions
2025 Lee Munhyeong Solo Exhibition 2025 (Hanppyeom Museum, Cheonan)

Group Exhibitions
Flight of Minhwa Exhibition_Chapter 6: Repetition and Pattern (Korea Museum of Art, Seoul) and 20 others

Art Fairs
2025 7th Republic of Korea Minhwa Art Fair Solo Booth (SETEC, Seoul) and 1 more

Awards
13th Contemporary Minhwa Competition Excellence Award' WHERE name_ko = '이문형' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Solo Exhibitions
1st 2001.5 ''Giggle'' Curated Invitational (Moro Gallery, Seoul)
2nd 2001.11 ''Time & Space'' (Artist Guild Space Gallery, Paris, France)
3rd 2005.5 ''A Midsummer Night''s Dream'' Curated Invitational (Korean Embassy in Italy, Rome, Italy)
4th 2010.5 ''Children''s Play'' Curated Invitational (Art Space H, Seoul)
5th 2021.6 ''Reading Atelier Publication Memorial Curated Invitational'' (Paju Wisdom Forest)
6th 2024.9 ''Key to Open Myself'' Curated Invitational (Chuncheon Gallery The Way)
7th 2025.4 ''Reading Atelier'' Curated Invitational (Suwon Gallery Yeongtong)
8th 2025.5 ''Shape of Life'' Curated Invitational (Paju Gallery Jijihyang)
9th 2025.12 ''Library Fantasy'' Curated Invitational (Osan The Space Gallery)

2-Person Exhibition
2018.6 ''Method of Creating Energy for Life'' (Kuga Museum of Art Curated Invitational, Fukuoka, Japan)

Awards
1997 University Art Exhibition - Special Selection (Honam University)
2003 4th Giovanni Pericone National Art Competition - Grand Prize (Primo Premio)

Mural Restoration
2008 Rock Mural Restoration (UNESCO World Heritage Serengeti National Park, Tanzania, Africa)

Collections
Korean Embassy in Italy
Korean Catholic Church in Rome, Italy
Rotary Club Fiuggi, Italy
Asia Publishing Culture Information Center
Korean Culture Contents Research Institute

Group Exhibitions
1997-1999, 2006 ''Color'' Exhibition (Gwanhun Gallery, Seoul)
1998 Print Academy Exhibition (MMCA Gwacheon)
1999 Dongki Exhibition (Gwanhun Gallery, Seoul)
Version Channels (Gallery Boda, Seoul)
2003 ''Glocallizzazione'' (Inter Culturale Permanente Roma Gallery, Rome, Italy)
2010 Dongduk 100th Anniversary / Dongduk Women''s University 60th Anniversary Exhibition (Dongduk Art Gallery)
2018 Dongduk Women''s University Painting Department 50th Anniversary Mokhwa Exhibition (Dongduk Art Gallery, Dongduk Women''s University Museum)
2020 30th Mokhwa Exhibition (Online)
2021 6th His Art Fair (Insa Art Plaza)
2021 Something Exhibition (Raemian Gallery)
2022 31st Mokhwa Exhibition (Online)
2022 Book Artist Tent (Paju Wisdom Forest)
2024 Today''s Suwon Exhibition (Suwon Municipal Manseok Exhibition Hall)
2025 32nd Mokhwa Exhibition (Dongduk Gallery)
2025 LA Art Show (LA Convention Center) / BAMA Busan International Art Fair (BEXCO) / Gyeongnam Art Fair (Changwon Convention Center)

Publication
2021.6 ''Reading Atelier'' Published (Cheonnyeon-ui Sangsang)

Column Serializations
2016.8-2020.12 Sports Kyunghyang Painting Book Review ''Cheon Jisu''s Reading Atelier'' Column
2023.2-2024.5 Sports Kyunghyang ''Picture Books Read by Cheon Jisu'' Reviews
2023.8-Present Chaekkiraut, Culture News, MHN Sports ''Picture Books Read by Cheon Jisu'' Reviews' WHERE name_ko = '천지수' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Ceramicist' WHERE name_ko = '김지영' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'B.F.A., Department of Ceramics, Seoul National University of Science and Technology' WHERE name_ko = '김태희' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'B.F.A., Department of Painting, Hongik University' WHERE name_ko = '정재철' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'B.F.A. and M.F.A., Department of Painting, College of Fine Arts and Graduate School, Hongik University
Ph.D., Painting, Graduate School, Department of Fine Arts, Hongik University' WHERE name_ko = '장희진' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Registered artist at Open Gallery' WHERE name_ko = '김유진' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'Education
Ph.D., College of Fine Arts, Seoul National University

Solo Exhibitions
2010 Gallery Art Link
2008 Doctor Park Gallery
2007 SEO Gallery, 2007 1st Young Artist Selected
2004 Gallery Art Link
2004 Sejong Gallery

Group Exhibitions
2009 The Flower, KAIST Graduate School of Technology & Management
2009 Songeun Art Awards, Insa Art Center
2009 Flower Garden, 63 Sky Art
2009 Streaming Life, Gallery H
2009 Come to Life, Moin Gallery
2008 Yangpyeong Environmental Art Festival - Inevitable Cloud, Manas Gallery
2008 International Art Book Making Festival, Baum Art Gallery
2008 New Acquisitions, Seoul Museum of Art
2008 Korean Contemporary Prints 1958-2008, MMCA Gwacheon
2007 Incheon International Women''s Art Biennale, Incheon
2007 Trees I Barely Remember, IM ART Gallery
2007 Bubble Wrap, Yeh Gallery, Korea Arts Council International Exchange Fund Selected
2007 Seoul Art Competition - Print, Seoul Museum of Art
2007 Aesthetics of Edition, Masan Art Center
2007 Spectrum of the Korean Contemporary Print, Russia
2007 Hello Chelsea! 2007, PS 35 Gallery, USA
2007 Geumgang Art Competition, Daejeon Museum of Art
2007 Tough Thickness of Time, Topohaus
2007 Personality & Passion, Doctor Park Gallery
2007 Sofa Museum, Jinheung Art Hall
2006 Print Spectrum, Sun Gallery
2006 Printing Our Society, Kookmin University Museum
2006 Seoul Print 2006, Moran Gallery
2005 Trembling Exhibition, Topohaus
2005 Seoul Print 2005, Topohaus
2005 Dwelling Exhibition, Seoul National University Wooseok Hall
2004 Asian Youth Art Festival, Changwon Seongsan Art Hall
2004 Seoul National University College of Fine Arts Online Alumni Exhibition, Open Art
2003 Digital + Camera Exhibition, Joheung Gallery
2003 Imaginary Library Exhibition, Stone & Water Gallery
2003 Korean Contemporary Print Exhibition & International Print Exchange Exhibition, Sejong Center Museum
2003 Heyri Festival - Art in Architecture, Community House
2002 Korean Contemporary Printmakers Association Exhibition, Gwanhun Gallery
2001 Seoul National University Graduate School - Beijing Central Academy of Fine Arts Exchange Exhibition, Beijing, China
2001 Layer Upon Layer Exhibition, Boda Gallery
2001 Korean Contemporary Printmakers Association Competition, Seoul Museum of Art
2000 Print! Club Small Meeting Exhibition, Joheung Gallery
2000 Korean Contemporary Printmakers Association Competition, Jongno Gallery
2000 The Other Side Exhibition, KEPCO Plaza Gallery

Collections
MMCA Art Bank (Gwacheon), Seoul Museum of Art, Samsung Hospital Cancer Center, Industrial Bank of Korea, Seoul Central District Court, Namseoul University, SEO Gallery

Awards
2000 Korean Contemporary Printmakers Association Competition Special Selection
2001 Korean Contemporary Printmakers Association Competition Excellence Award
2006 Space International Print Biennale Selected Works
2007 Korea Arts Council Fund for Arts Promotion
2007 Emerging Artist Support Category Selected
2007 Geumgang Art Competition Special Selection
2008 30th JoongAng Art Competition Selected Artist
2009 Seoul Foundation for Arts and Culture Artistic Expression Activity Support Selected
2009 Songeun Art Awards Selected Artist

Teaching
2003-2005 Lecturer, Sangmyung University
2007 Lecturer, Baekseok University
2002-2010 Lecturer, Seoul Arts High School

Thesis
2001 Study on Multi-layered Visual Experience Expression Using Plant Subjects' WHERE name_ko = '고자영' AND (history_en IS NULL OR trim(history_en) = '');
UPDATE artists SET history_en = 'B.F.A., Department of Ceramics, Seoul National University of Technology (now Seoul National University of Science and Technology)
Operator of Lee Donggu Ceramics Studio' WHERE name_ko = '이동구' AND (history_en IS NULL OR trim(history_en) = '');

------------------------------------------------------------
-- 5. batch-005.ts: artists NOT in artists-data.ts
------------------------------------------------------------
UPDATE artists SET bio = '정 채 희(丁 彩僖, JUNG CHAE-HEE) 서울대학교 미술대학 회화과(서양화 전공)를 졸업하고 중국 북경 중앙미술학원 대학원에서 벽화 전공으로 졸업하였습니다. 대학원 과정을 통해 다양한 조형 매체를 배우고 특히 동양의 예술적 가치에 매료되어 전통 재료와 기법을 깊이 있게 연구하였습니다. 이러한 관심은 중국, 일본, 인도, 동남아 등 아시아 여러 지역을 고찰하며 동양 문화를 다채롭게 체험하는 것으로 이어졌습니다.
1990년 첫 개인전을 시작으로 현재까지 총 21회의 개인전과 130여 회의 단체전에 참여했으며, 전시기획 경력 또한 다수 보유하고 있습니다. 특히 2003년 중국에서 귀국하며 아트사이드 갤러리 3층 전관에서 국내 처음으로 본격적인 칠화와 칠벽화 개인전을 선보인 이후, 옻칠을 주된 재료로 하여 작업을 활발히 이어오고 있습니다.
주요 경력으로는 2005년부터 2006년까지 국립현대미술관 미술창작스튜디오 고양 2기 입주작가로 활동했으며, 2003년부터 2022년까지 서울대를 비롯한 여러 대학에서 벽화 및 옻칠 재료기법 등을 강의했습니다. 국외 활동으로는 2013년 남인도 코타얌 국제 벽화축제 초청작가 참여, 일본 石川國際漆展 입상, 국제 아트페어 그리고 중국 중앙미술대학원 및 전국미술 우수작품상(2001, 2002) 수상 등의 성과를 통해 국제적인 역량을 입증했습니다.
현재는 천연 재료와 동양 전통 기법을 바탕으로, 자연으로부터 얻어지는 삶의 경험과 기억 속에 축적된 심상의 풍경을 옻칠 작업을 중심으로 입체, 설치 등으로 장르를 확장하며 꾸준히 작품 세계를 심화시키고 있습니다.' WHERE name_ko = '정채희' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET history = '서울대학교 미술대학 회화과를 졸업하고 중국 북경 중앙미술학원 대학원에서 벽화 전공 졸업. 개인전 21회를 포함해 다수의 전시에 참여했으며, 특히 옻칠화 작업을 중심으로 활동.

주요 개인전
2023 쌉살한 잎새_우주의 바다 갤러리, 부산
2021 숨,쉼_누크갤러리, 서울
2020 너머의 풍경_갤러리 내일, 서울
2014  깊은 방_샘터 갤러리, 서울
2006 慈雲遊月_학고재, 서울 (서울문화재단 창작지원)
2003 漆로 그린 그림전_갤러리 아트사이드, 서울
주요 단체전 및 활동
2025 異.合(2인전)(가제)_삼세영 갤러리, 서울
2024 Art Miracle in Kangwha_에버리치 호텔, 강화도
2021  시간의 정원_우리 옛돌 박물관, 서울
2017 겸재와 함께 옛길을 걷다_겸재미술관, 서울
2013 코타얌 국제 벽화축제 참여 (남인도)
2010 KIAF 10_COEX 태평양홀, 서울
2009 동양화 새 천년기획-한국화의 현대적 변용전_예술의전당 한가람 미술관, 서울
2005-2006 국립현대미술관 미술창작스튜디오 고양 2기 입주작가
2002 중국 전국미술 우수작품상 수상 (중국미술관, 북경)
2001 중국 중앙미술대학원 우수작품상 수상 (북경)' WHERE name_ko = '정채희' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET history = '개인전 2025 수묵_사군자展 행촌미술관, 해남
2024 하늘이 내린천 인제가 가꾼 자작나무(기적의 도서관 인제)
2023 페르마노 (두인미술관 서울)
2022 화엄지리展(화엄사 성보박물관) 범 내려온다. 복 내려온다(신안),
2021 김환기 고택의 달과 별展(김환기고택)
2020 두륜展(해남,행촌미술관)
2019 탕진수묵展(서울,인영갤러리)
2017 예술인센터(서울)
2005 이형갤러리

그룹전
2025 2025세화전 <푸른꿈> 행촌미술관, 여행스케치(스페이스결 서울)
2024 시적인 풍경(노스부르가갤러리 인스부르그 오스트리아) 해남은 봄부터 미술관展(해남문화               예술회관 해남) 해남의 아름다운 맛展(해남문화예술회관 해남)  먹빛-畵답하다(안동예술의전당)              후소회전(라메르갤러리) 진심경전(인사아트프라자) 안평안견예술정신전(한벽원갤러리)
붓이 옳다(동덕갤러리) 국제아트페스티발(치앙마이 태국)
2023  2023전남국제수묵비엔날레, 17회포창국제아트페스티발(방콕), 진심경(인사아트프라자)
보구곷에 매화향기 퍼지고. 전(보구곶 작은미술관),
2022  축척된 즉흥전(전남갤러리), 풍류남도 아트프로젝트 몽류임하(행촌미술관)
우용민,박태준 2인전(행촌미술관)
2021  제1회 김환기미술제(달빛,바다에 빠지다.김환기고택)
축척된 즉흥전(갤러리 j&g)
한국화 구상회전(인사아트 프라자)
2021전남국제수묵비엔날레 해남전
2020 맨드라미 시들지않은...(저녁노을미술관)
구상부스전(인사아트프라자)
둔장마을미술관개관전
2019 해돋이전(윤갤러리)
붓을따라가다(스페이스 날집)
풍류남도 아트프로젝트-봄(수윤미술관)
해남 국제 수묵워크샵
경북 독립운동 유적지 그림전(경북도청)
구상회전(인사아트프라자).
공재 그리고 화가의 자화상전(행촌미술관)
2018 동방채묵전(영월)
전남 국제 수묵 비엔날레(종가의 향기)
남도밥상전(인영갤러리)
바림전(대전시청)
2017 전남국제 수묵비엔날레
풍류남도 아트 프로젝트-수묵남도
미황사전(학고재)
탕진수묵전(동덕갤러리)
2016  탕진수묵전
수상
2005,특선,무등미술대전
2004,입선,서울미술대상전
1989,입선,국전
1988,입선,목우회

작품소장
2020년 행촌미술관 <두륜> 2020, 198X545cm  한지에 먹
2023년 전남 도립미술관 <눈꽃> 2022, 180*720, 한지에 먹,
2024년 Gallery Northbruga <설송호랑이> 한지에 먹 2022_145x74cm
2023년 전남 도립미술관 <지리산 반야봉181x360cm 2022>
2025년 Gallery Northbruga <공작> 한지에 먹, 2025_145x74cm 외 매화 풍경 등 12점 출판  <두륜> 도서출판 헥사곤, 2020
<지리> 도서출판 헥사곤 2025' WHERE name_ko = '우용민' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET bio = '박영선은 중국 루쉰 미술대학에서 수학한 판화가이자 화가로, 현재 인도 오로빌에 거주하며 작업하고 있다. 동아대학교 미술대학에서 미술을 전공한 이후, 중국 현대 판화 교육의 중심지인 루쉰 미술대학에서 판화 기반의 회화와 조형 언어를 체계적으로 익혔다.
중국 유학 시기부터 판화의 선과 면, 반복과 축적의 방식을 중심으로 작업을 이어온 그는, 이후 인도 오로빌에 정착하며 작업의 환경과 범위를 확장해왔다. 오로빌은 국적과 종교, 이념을 넘어선 국제 공동체로, 박영선은 이곳에서의 삶과 예술 실천을 통해 공동체, 노동, 자연, 인간의 존엄이라는 주제를 지속적으로 탐구해왔다. 오로빌 현지에서는 전시회를 열며 국제적 맥락 속에서 작품을 발표했다.
박영선은 출판으로 『까이비간』(산지니, 2007), 인도에서 마하리쉬 마헤시 요기 관련 영성과 사유를 다루는 콘텐츠를 시각 언어로 구현하는 작업을 수행했다.
박영선의 이력은 한국, 중국, 인도를 잇는 이동의 경로 속에서 형성되었다. 판화와 회화를 중심으로 한 그의 작업은 특정 지역이나 제도에 한정되지 않고, 학습과 정착, 공동체적 삶을 오가며 축적되어 왔다.' WHERE name_ko = '박영선' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '미술교사출신의 시사만화 작가 경력을 가진 애니메이터. 1953년 경상남도 울산에서 태어나 서울대학교 회화과를 졸업하고 휘문고, 중경고 등에서 미술교사 생활을 했다. 1980년대 후반 우리나라가 전반적인 민주화 추세로 진전될 때 한겨레신문의 1칸 만평작가로 데뷔, 직선적이면서도 호쾌한 시사풍자만화의 전범典範을 보여준 주인공. 그가 한겨레신문을 통해 8년여 선보인 ‘한겨레 그림판’은 1980년대 후반 신문시사만화의 한 방향을 제시한 수작秀作으로 평가할 만하다. 그러나 아쉽게도 박 화백은 8년간 연재한 한겨레신문사를 퇴직, 지금은 애니메이션 창작에 전념하고 있다. 한겨레 그림판 은 지금도 많은 독자들이 기억하고 있는 ‘90년대 명작 시사만화’였다.

그 외에 장편애니메이션 영화 ''오돌또기'', ''별별이야기'', ''사람이 되어라''의 감독을 맡았으며, 우리만화 발전을 위한 연대모임의 회장을 역임했다. MBC 뉴스데스크 ''박재동의 TV만평''을 감독하기도 했다. ''제4회 민주 언론상''과 ''제1회 한겨레상''을 수상했다. 현재 한국예술종합학교 영상원 애니메이션과 교수로 재직하며, 시사만화가로 활동 중이다.

지은 책으로 『환상의 콤비, 아이야 우리 식탁엔 은쟁반에』, 『목 긴 사나이』, 『제억 공화국』, 『만화 내사랑』, 『한국 만화의 선구자들』, 『악! 법이라고?』, 『똥깅이』, 『어둠은 빛을 이길 수 없습니다』 외 다수가 있다.' WHERE name_ko = '박재동' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '강레아 작가는 한국 최초의 여성 클라이밍 및 산악 사진작가로, 암벽에 핀 소나무 등 자연의 강인한 생명력을 포착하는 작품으로 유명하며, 디자이너 출신으로 늦게 사진에 입문하여 신구대학교 사진과를 졸업 후 전문 사진작가로 활동하고 있다. 그녀의 작품은 한국을 넘어 프랑스 등 해외에서도 전시되며, 강인하면서도 서정적인 시선으로 산과 바위를 담아내는 것으로 평가받는다.' WHERE name_ko = '강레아' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '최병수는 1960년 경기도 평택 출생. 태어나자마자 바로 서울 동작구 상도동으로 이사. 가난한 집안 형편 때문에 한광상업전수학교 2학년 중퇴 후 사회생활 시작. 신문팔이, 중국집 배달원, 선반 보조공, 미싱 수리공, 보일러공, 전기용접공, 목수 등 수십 개의 직업을 전전하며 전국을 돌면서 노동자 생활을 함. 어린 시절 동네 친구였던 김환영(신촌 벽화사건 관계자, <마당을 나온 암탉> 제작자)과 함께 지내며, 홍대 미생들과 자주 어울림. 20대 때 시절 오토바이 사고로 크게 다시고, 노동자 시절 다친 손 역시 제대로 치료 받지 못해, 군 면제 받음. 퇴원 후 구파발에 비닐하우스를 짓고 2여년을 지냄. 이 시기 김환영, 홍황기, 김진하 등 당시 홍대 미대생이었던 친구들이 아지트 삼아 자주 드나들었고, 이들과 어울리면서, 예술 검열과 탄압의 대표적 사건으로 거론되는 신촌 벽화사건(<일하는 사람들>), 정릉 벽화사건(<상생도>)에 모두 관계하게 됨. 벽화 작업 과정과 더불어 벽화가 지워지고 관련된 예술가들이 구속되는 과정, 공권력에 의해 화가로 불려지게 된 과정에 대해 상세하게 구술. 친구 김환영의 영향으로, 그림마당 민에 드나들며 ‘민미협’ 활동을 지켜보게 됐고, 이후 ‘민미협’에 가입해 벽화분과 활동을 하며 류연복 등과 함께 <연대 100년사>를 공동 작업함. 1987년 6월 항쟁 당시 경찰의 최루탄에 맞아 쓰러진 이한열 열사의 사진이 실린 신문 기사를 접하고, 문영미, 문영태 등의 도움을 받아 판화와 대형 걸개그림 <한열이를 살려내라>를 제작, 연세대학교 학생회관에 설치. 구술 과정에서 <한열이를 살려내라> 목판과 이한열 영결식에 사용된 장례식 도면을 공개함. <노동해방도>(1989), <백두산>(1989), <반전반핵도>(1988), <장산곶매> 등 1980년대 문화예술운동을 대표하는 수많은 걸개그림들을 제작, 1980년대 중후반, 문화예술운동 소집단들이 폭발적으로 증가한 분위기 속에서, 소집단 활동의 외부인 입장에서 비교적 객관적으로 시대의 분위기를 증언. 노동자 출신 전업화가로, 1980년대 문화예술운동의 분위기가 소강된 이후에도 지역(전남 여수 등)에서 예술운동(환경생태운동 등)을 지속적으로 이어가고 있음.' WHERE name_ko = '최병수' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET history = '- 1960년 경기 평택 출생

- 한광상업전수학교 중퇴

- 중학교 시절부터 노동자로 사회생활 시작 : 신문팔이, 중국집 배달원, 선반 보조공, 미싱 수리공, 보일러공, 전기용접공, 목수 등 수십 개의 직업을 거치며 노동현장 안에 있었음

- 20대 초반, 당인리 발전소 근처에서 어린 시절 친구였던 김환영(신촌 벽화사건 관계자, <마당을 나온 암탉> 제작자)과 함께 지내며, 홍대 미대생들과 교류

- 20대 때 오토바이 사고로 크게 다침, 노동자 시절 다친 손을 제대로 치료 받지 못해, 군 면제로 이어짐.

- 홍대 미대생들의 아지트가 된 구파발 비닐하우스

- 예술 검열과 탄압의 대표적 사건으로 거론되는 신촌 벽화사건(<일하는 사람들>), 정릉 벽화사건 (<상생도>)에 모두 관계

- 벽화 작업 과정과 더불어 벽화가 지워지고 관련된 예술가들이 구속되는 과정, 공권력에 의해 화가로 불리게 된 과정

- 친구 김환영의 영향으로, ‘그림마당민’에 드나들며 ‘민미협’ 활동에 관여. ‘민미협’에 가입해 벽화분과 활동 (류연복 등과 <연대 100년사>를 공동 작업)

- 1987년 6월 항쟁 당시 경찰의 최루탄에 맞아 쓰러진 이한열 열사의 사진이 실린 신문 기사를 접함

- 문영미, 문영태 등의 도움을 받아 판화와 대형 걸개그림 <한열이를 살려내라>를 제작, 연세대학교 학생회관에 설치

- <노동해방도>(1989), <백두산>(1989), <반전반핵도>(1988), <장산곶매> 등 1980년대 문화예술운동을 대표하는 걸개그림들의 제작과정과 현장 활용 구술

- 1980년대 중후반, 문화예술운동 소집단들이 폭발적으로 증가한 분위기 속에서도 외부인의 입장에서 비교적 객관적으로 시대의 분위기를 증언

- 명실공히 노동자 출신 전업화가로, 1980년대 문화예술운동의 분위기가 소강된 이후에도 지역(전남 여수 등)에서 예술운동(환경생태운동 등)을 지속' WHERE name_ko = '최병수' AND (history IS NULL OR trim(history) = '');
UPDATE artists SET bio = '민정기(閔晶基, Min Joung-Ki, b.1949)는 ''현실과 발언'' 창립회원으로 1979년말 ''현실과 발언'' 창립 초기부터 공식적 해체기(1990)까지 민중미술진영의 주요 작가로서 참여했으며, 또한 90년대 이후부터는 경기도 양평으로 거소를 옮겨 ''산과 땅과 더불어 살아가는'' 인간의 삶의 회화적 기록이라 이름할 산수화, 화훼화를 그려내고 있다. 민정기의 작품세계는 초기, 소위 ''이발소그림''으로 통칭되는 촌스럽고 세련되지 않은 그림을 다시 모방해 고급미술의 회랑에 내놓았다. ''통속''의 사회에서 통속적으로 살고 있다는 우리 모두의 자의식을 건드린 것이다. 반미학적 다다이스트적 기획이라는 점에서 음울한 시대의 알레고리로 읽혀졌다.
이후 그는 숲으로 향해 걸어갔다. 그러나 정확히는 땅을 향해, 역사의 지층을 향해서다. 그러다가 그는 저잣거리로 나선다. 길, 도로, 강물의 흐름을 따라가는 것이다. 그것은 ''오늘로 향하는 길''이다. 모든 것이 실증화(positivity)되어가는 세계의 방향, 모든 것이 깨끗해저만 가는 미술의 방향과 어긋나는 길이다. 또한 양평 시대의 ''산수화''들은 산세와 지세 가운데 삶의 거처를 정하고, 이를 풍수(風水)의 지혜로 여겼던 옛사람들의 흔적을 좇아 시각화함으로써 동시대적 삶과의 그 거리를 통각하게 한다는 점에서 그의 소박하고 대중적인 삶의 진지한 감정에 대한 여전한 애정과 건강한 연민을 확인하게 된다.
초기, 민중적 삶의 그늘진 길모퉁이를 외면하지 못했던 연민의 시선으로부터 그 삶의 시간의 지층을 파들어가는 인류학적 통찰에로 나아간 길, 풍경의 그늘, 회화의 그늘이라 이름할 이유다.' WHERE name_ko = '민정기' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET bio = '서공임 작가는 40년 넘게 민화 외길을 걸어온 한국의 대표적인 현대 민화가로, 전통 민화의 맥을 잇되 세련된 색감과 현대적 감각을 더해 독자적인 작품 세계를 구축했으며, 《민화 컬러링 위시북》 등 저술 활동과 함께 민화의 대중화 및 국제화에 힘쓰고 있는 민화 대가다.' WHERE name_ko = '서공임' AND (bio IS NULL OR trim(bio) = '');
UPDATE artists SET history = '<학력>
서울대학교 전자공학과 졸업
경희대학교 한의대 박사

<전시 경력>

개인전
2022 신들의 땅, 갤러리 큰바다영, 제주
2024 가닿음으로, 갤러리 누보, 제주

단체전
제주의 자연과 평화를 위한 다수의 단체전에 참여' WHERE name_ko = '김수오' AND (history IS NULL OR trim(history) = '');

COMMIT;