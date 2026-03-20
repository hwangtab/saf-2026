BEGIN;

-- ============================================================
-- 1. name_en backfill (21 artists)
-- ============================================================

UPDATE artists SET name_en = 'Jeong Chaehui' WHERE name_ko = '정채희';
UPDATE artists SET name_en = 'U Yongmin' WHERE name_ko = '우용민';
UPDATE artists SET name_en = 'Park Yeongseon' WHERE name_ko = '박영선';
UPDATE artists SET name_en = 'Kang Rea' WHERE name_ko = '강레아';
UPDATE artists SET name_en = 'Choe Byeongsu' WHERE name_ko = '최병수';
UPDATE artists SET name_en = 'Min Jeonggi' WHERE name_ko = '민정기';
UPDATE artists SET name_en = 'Seo Gongim' WHERE name_ko = '서공임';
UPDATE artists SET name_en = 'Unknown Artist' WHERE name_ko = '작가미상';
UPDATE artists SET name_en = 'Gi Yeonhui' WHERE name_ko = '기연희';
UPDATE artists SET name_en = 'Banggeure' WHERE name_ko = '방그레';
UPDATE artists SET name_en = 'Hanbok Roberto' WHERE name_ko = '한복 로베르또';
UPDATE artists SET name_en = 'Jeong Misuk' WHERE name_ko = '정미숙 ';
UPDATE artists SET name_en = 'Bae Minyeong' WHERE name_ko = '배민영';
UPDATE artists SET name_en = 'Choe Suhwan' WHERE name_ko = '최수환';
UPDATE artists SET name_en = 'Lee Hanbok Roberto' WHERE name_ko = '이한복로베르또';
UPDATE artists SET name_en = 'Kim Sugil' WHERE name_ko = '김수길';
UPDATE artists SET name_en = 'Choe Ingi' WHERE name_ko = '최인기';
UPDATE artists SET name_en = 'happypuring' WHERE name_ko = 'happypuring';
UPDATE artists SET name_en = 'Song Hyeonjeong (HYUNN)' WHERE name_ko = '송현정(HYUNN)';
UPDATE artists SET name_en = 'DUNGZAK CESTLAVIE' WHERE name_ko = '등작 燈酌 DUNGZAK CESTLAVIE';

-- ============================================================
-- 2. bio_en backfill (17 artists)
-- ============================================================

-- 박재동
UPDATE artists SET bio_en = 'Park Jaedong — The Godfather of Korean Editorial Cartooning

Park Jaedong (born December 20, 1952) is one of Korea''s most influential cartoonists and art educators, having debuted in the cartoon world in 1974. Born in Beomseoeup, Ulsan, he moved to Busan around age ten and grew up immersed in comics at his father''s manhwa-bang (comic book rental shop). The son of a looked-down-upon comic shop owner went on to enter the Painting Department at Seoul National University, a proud achievement for his humble family. After a long period of searching, he embarked on the path of an editorial cartoonist.

After teaching art at Hwimun High School and Junggyeong High School from 1979, he joined the Hankyoreh newspaper at its founding in 1988 and serialized the editorial cartoon column Hankyoreh Geulimpan for eight years. Through sharp satire and social commentary during the 1980s and ''90s, he earned the reputation as the master of Korean editorial cartooning, with critics noting that "Korean editorial cartooning can be divided into before and after Park Jaedong."

In 1984, he joined Reality and Utterance (Hyeonsilgwa Bareon), the pioneering Minjung art collective, working alongside major contemporaries such as Oh Yun, Lim Oksang, Kim Jeongheon, and Kang Yobae. His work is recognized not merely as political satire but as art that elevates the lives and social voices of ordinary people.

In 1996, he founded the animation company Odolttogi and produced the TV editorial cartoon segment Park Jaedong''s TV Manpyeong for MBC Newsdesk, crossing the boundaries between comics and motion pictures. Webtoon artist Kang Full has credited Park''s editorial cartoons as the inspiration for his own career, and the animation sequence depicting the May 18th Gwangju Uprising in the film 26 Years was also produced by Odolttogi, underscoring Park''s broad influence on Korean comics and visual culture.

His statement — "The more power oppresses the public, the fiercer and more powerful cartoonists'' works become" — encapsulates his artistic spirit. He received the 10th Kobau Cartoon Award, the 4th Democratic Press Award, and the 1st Hankyoreh Award for expanding the social role of comics.

As a professor in the Animation Department at the Korea National University of Arts, he has also devoted himself to nurturing the next generation, inspiring countless young artists with his educational philosophy: "There is no right answer in art — think of yourself as a cartoonist right now and start drawing." His major publications include Palm Art, Life Comics, and Silk Road Sketch Journey Vols. 1 & 2.' WHERE name_ko = '박재동';

-- 김수오
UPDATE artists SET bio_en = 'Kim Suo was born and raised on the volcanic island of Jeju. As a child playing in the sea at Tapdong beneath Sarabong Peak, he remembers turning over rocks at low tide to find crabs and sea snails, cracking open sea urchins on the spot. Those memories are more than nostalgia. After spending his youth on the mainland, he returned to his hometown at the age of forty only to find the sea irrevocably changed. Watching marine life disappear due to development and pollution, he says simply: "The sea is dying." In those words lie both grief and an urgent conviction that what is old must be remembered.

In 1984 he left Jeju to study electronic engineering, worked at a research institute for six years, then enrolled in a college of Korean medicine. He returned to Jeju as a licensed Korean medicine doctor and currently runs a clinic. Coming back to the island was, for him, a reclamation of his place in life.

His serious engagement with photography began at Gangjeong Village. During the years when Gureombi Rock was blasted and construction of a naval base was forced through, he drove across Hallasan after clinic hours to the protest camps at Gangjeong, treating injured villagers with acupuncture before returning to Jeju City around midnight — a cycle repeated across all four seasons. One night, stopping his car on a mid-mountain plain, he was struck by the silhouettes of the oreum volcanic cones and the distant fishing-boat lights on the night sea, a scene of almost surreal beauty. Having witnessed the landfill of Tapdong and the destruction of Gureombi, he thought: "These landscapes, too, may someday vanish. I must capture them before they disappear."

That was the beginning. Nearly every day since, after clinic hours, he heads into the mid-mountain fields and oreums. From evening into deep night, sometimes through the morning dew, he records the volcanic island''s landscapes. In 2022, he exhibited years of accumulated work for the first time — his debut solo exhibition, Land of the Gods, an initial public statement on the theme of oreums.

He gravitates toward the oreums of eastern Jeju''s mid-mountain area; in the west, resort complexes and golf courses inevitably intrude into the camera frame. In the darkness and silence of uninhabited Jeju at dusk, he walks the island''s fields alone deep into the night, seeking to capture beauty that is vanishing.

His second solo exhibition, By Reaching (2024), sensitively explored the cycle of life and the laws of nature through the four seasons and the life and death of Jeju horses. His gaze, which began with oreums, has deepened to encompass the creatures living upon them and the passage of time through which their lives unfold and fade.

By day he heals people; by night he documents the land. Kim Suo''s photographs are born where those two threads meet. A deep and affectionate gaze toward things beautiful yet disappearing, toward beings living quietly — that is why his photographs move us beyond beautiful scenery to a contemplation of life and nature''s eternal cycles.' WHERE name_ko = '김수오';

-- 황경하
UPDATE artists SET bio_en = 'Test artist' WHERE name_ko = '황경하';

-- 김성은
UPDATE artists SET bio_en = 'Likes sweets' WHERE name_ko = '김성은';

-- 기연희
UPDATE artists SET bio_en = 'Gi Yeonhui, a comic artist' WHERE name_ko = '기연희';

-- 방그레 (두 명 모두 업데이트됨)
UPDATE artists SET bio_en = 'Graduated from the Sculpture Department of Lu Xun Academy of Fine Arts, China; M.A. from the same university''s graduate school. Served as a foreign professor in the Sculpture Department at the College of Art and Design, Dalian University of Technology, China, from 2004 to 2020. Currently active as a sculptor working across sculpture, installation, performance, and drawing.' WHERE name_ko = '방그레';

-- 한복 로베르또
UPDATE artists SET bio_en = 'Key volunteer activities: Traditional heritage preservation, Seoul City Wall, royal palaces, royal tombs, Jongno alleys, Yeolhana neighborhood in front of Changdeokgung Palace. Photography: Siot, Mia Photography Group, citizen documentary photography, Tongil Gongbang (Unification Workshop). Civic organizations: Path to Unification, Candlelight, DMZ Peace Network, Mongyang, Donghaeng. Kkaebittok Cultural Management / Licensed Urban Planner.' WHERE name_ko = '한복 로베르또';

-- 남진현
UPDATE artists SET bio_en = 'Nam Jinhyeon is a Korean contemporary artist with a singular life story. His works are characterized by the sublimation of personal anguish and the wounds of an era into the language of abstraction.

Born in March 1963 in Cheorwon, Gangwon Province, Nam grew up in Seoul. He entered the College of Engineering at Seoul National University in 1981 but dropped out after becoming involved in the student democracy movement.

In October 1990, he was arrested for his activities with Sanomaeng (South Korean Socialist Workers'' Alliance) and sentenced to thirteen years in prison. The roughly eight years he spent incarcerated were the harshest period of his life, yet paradoxically they became the catalyst that made him an artist. After his release on August 15, 1998, he ran a private academy in Daechi-dong to make ends meet; when that venture failed, he began studying art in earnest in 2008. Taking the human face as his motif, he started painting acrylic abstractions — dividing and reconstructing the most human of subjects through geometric lines and color fields, thereby expanding personal experience into universal reflection.

Each of Nam''s works explores the essence of an era through a different narrative. Harsh Times renders the pain and sorrow of prison in blue tones, with "eyes that have lost their focus yet gaze forward emitting a cool light, and coarse hair resembling iron bars." Without a Single Shame addresses self-affirmation and dignity. The World Triptych — Bewildered World, Disjointed World, Absurd World — probes the contradictions of contemporary society. The Human Condition evokes the philosophies of Andre Malraux and Hannah Arendt, revealing that Nam''s art is the product of dialectical thought rather than mere aesthetics.

Film critic Jeon Chanil has observed that Nam''s work "possesses the power to sublimate personal stories into universal contemplation," linking his art to the philosophy of Hannah Arendt and the cinematic world of Bong Joon-ho. Historian Jeon Wooyong has noted that "his paintings contain the artist and his era, wound together; through his works we can grasp the totality of the life he has lived."

Since his first solo exhibition in 2013, Nam has presented his work through seven solo shows by 2025, and has exhibited internationally at Van Der Plas Gallery in New York, Pariskofinearts in New Jersey, and Art NY 2025 in Manhattan. In 2023 he published the essay collection The Revolutionary Who Became a Painter (Binbin Books), comprising thirty paintings and stories that go beyond mere artwork descriptions to convey personal history and the spirit of an age.

Nam Jinhyeon continues to expand his practice beyond personal experience toward social connectedness and universal thought. His art stands as testimony to how individual anguish and reflection can be given form through painting. The human figures within deep color, the collisions and meetings of geometric lines — all reveal the inner world of an individual who has lived through the pain of his time.' WHERE name_ko = '남진현';

-- 안은경
UPDATE artists SET bio_en = 'In my work, the "suitcase" is not merely a tool for carrying luggage — it symbolizes a psychological refuge that contains the anxiety and alienation of modern people while guiding them toward a new sense of self. We live on the track of a repetitive daily life, yet everyone carries at least one empty bag of their own, ready to be packed at any moment for departure. Through the imaginary spaces I construct inside suitcases, I seek to console the hardships of reality and hope that viewers can set down the weight of their everyday lives, even briefly, and experience a restorative journey toward themselves.' WHERE name_ko = '안은경';

-- 최수환
UPDATE artists SET bio_en = 'A rural farmer-painter who paints, writes, and farms. Currently operates a local food direct-sales store run by a cooperative called Farmer''s Market. His primary area of interest is the environment, particularly rivers and river pollution. He also considers the Daegu October Uprising a lifelong subject of his work.' WHERE name_ko = '최수환';

-- 이한복로베르또
UPDATE artists SET bio_en = 'Photography and painting: Citizen Documentary Photography Group "Tongil Gongbang" (Representative; selected as one of SisaIN''s Top 10 Citizen Photographers in 2025), Ddeutdabang Photography Exhibition Group, Siot Photo Cooperative, Mia Photography Group, Wooshin High School Art Club Alumni Exhibition (organized 2003–05), and numerous group exhibitions. Civic organizations: Candlelight, DMZ Peace Network, Mongyang. Volunteer activities: Seoul City Wall guide, royal palace guide, royal tomb guide, Jongno alley guide, Yeolhana neighborhood in front of Changdeokgung Palace. Licensed Urban Planner: served on urban planning, architecture, and urban design committees for Seoul Metropolitan Government, Jongno-gu, and Gangseo-gu; member of the Jongno Health Forum, Daehak-ro Cultural District Committee, and Insa-dong Cultural District Review Committee.' WHERE name_ko = '이한복로베르또';

-- 최인기
UPDATE artists SET bio_en = 'Photographer' WHERE name_ko = '최인기';

-- happypuring
UPDATE artists SET bio_en = 'happy puring
Graduated from the Department of Western Painting, Sungshin Women''s University.

13 solo exhibitions including:
2025 "Memories of Me About Me," Yesuljigu P
2025 Volcano CC Clubhouse "Today, Us, Here"
2025 Jeju Police Agency Pollari "Glittering Island"
2024 Bumi Gallery "Girls of happypuring"
2023 Ini Gallery Invitational "Portrait of Island"
2022 Jeju Culture & Arts Center "Portrait of Island"
2022 Gallery Nut "Dreaming Island"
2022 Studio Dam Gallery Invitational "Glittering Island"
2022 Teddy Palace Gallery Invitational "Dreaming Island"
2022 Irum Gallery Invitational "Dreaming Island"
2021 Jeju Culture & Arts Center "Glittering Island"
2021 Gallery Mille+ Invitational "Glittering Island"
2018 Jeju Culture & Arts Center "The Best Journey"

Numerous group exhibitions.' WHERE name_ko = 'happypuring';

-- 송현정(HYUNN)
UPDATE artists SET bio_en = 'Hello, I am artist Song Hyeonjeong, based in Jeju.' WHERE name_ko = '송현정(HYUNN)';

-- 등작
UPDATE artists SET bio_en = 'Hello! I go by Dungzak. For more about my artistic activities, please visit the website below.
https://dungzak.art/' WHERE name_ko = '등작 燈酌 DUNGZAK CESTLAVIE';

-- 손은영
UPDATE artists SET bio_en = 'Son Eunyeong studied the foundations of painting at the Department of Western Painting, Ewha Womans University. Pursuing her dream as a painter, she entered the graduate program in Photography Design at Hongik University''s College of Industrial Art, and at the boundary between the two disciplines she began forging her own unique visual language. The color sensibility and compositional instincts of painting met the realistic representational power of photography, giving birth to a new aesthetic that belongs to neither medium yet encompasses both.

The Artist''s Life

Son Eunyeong traces the wellspring of her creative philosophy to a childhood spent apart from her family, living with her grandmother, and the longing for family that experience engendered. This primal yearning drives all her creative work and has determined every choice and subject throughout her life.

After marrying and having children, she set aside her dream of painting for twenty years to be a full-time mother. As her children grew, the desire to paint returned. Before that, she had purchased a camera to photograph her children — and it was this that led her onto the path of photography. Initially she used the camera for her children, but as they began avoiding it she started exploring other subjects, ultimately discovering "the house" as her signature theme.

In 2018, she won the artist open call at Seoul City Hall''s Sky Plaza Gallery, marking the beginning of serious recognition. Her debut solo exhibition, The Underground, captured the city''s subterranean and hidden spaces. This was followed by Black Houses (2019), an invitational at Gallery Bresson, for which she visited the sites of homes destroyed by a massive wildfire in Goseong, Gangwon Province, every two weeks over the course of a year. During this period, she began transitioning from photographic realism toward pictorial transformation.

The Houses at Night series, which began in earnest in 2020, led to the 2nd FNK Photography Award in 2021, firmly establishing her stature as a photographer.

The World of Her Work

When we first encounter Son Eunyeong''s work, we recognize it as photography. Yet the longer we look, the more we realize it approaches painterly expression. This is deliberate. Having studied Western painting as an undergraduate and photography in graduate school, she has a thorough command of both media. To capture both photography''s realistic representational power and painting''s expressive freedom, she spends one to one-and-a-half months meticulously retouching each photograph in Photoshop — intentionally emphasizing or flattening textures, tones, and shadows to transform a photograph into a painting.

Even at the shooting stage, she uses both a medium-format digital camera and an infrared camera, then adjusts the resulting layers in Photoshop as though applying brushstrokes. The delicate textures of a tree or the rough surface of a concrete wall are heightened through increased contrast, while walls and roofs are flattened to appear as simple planes. Colors are shifted and forms accentuated, effectively reconstructing the original photograph.

In her most recent work, she has adopted a collage method that advances these techniques further — cutting out photographs taken at different locations, repositioning them, and digitally adjusting color and form. Like a painter wielding a digital brush, she fills the canvas stitch by stitch, cultivating her own garden. This goes beyond documentation to the act of "creating" images; Son Eunyeong''s photographs look real yet contain a world beyond reality.

Black Houses took three years to complete, and Houses of Memory two years, underscoring that retouching demands far more time than shooting. Early on, she spent three months to finish a single image. This investment of time is not merely a pursuit of technical polish — it is part of the intense creative process of embedding her memories and emotions in each image.

The Meaning of House and Memory

Son Eunyeong''s fixation on "the house" does not arise from abstract concepts. It stems from the longing created by a childhood spent apart from her family, and the meaning of motherhood she came to understand while raising her own children. Even on a dark night walk, if one can see light spilling from a window or hear a mother''s voice, that house ceases to be a building and becomes a haven where someone beloved waits.

She perceives the house as "the most important place in daily life," a space where "we spend a great deal of time and create memories," and "the last value that does not disappear." Memory warps with time, and it is impossible to reproduce exactly the old house of one''s memory. Therefore, she travels the country seeking houses and neighborhoods that evoke the feeling of the home she lived in as a child, photographs them, and layers them over her own memories with transformations.

In Black Houses (2019), what emerges is the worn texture of nighttime residential entrance doors and alley walls — repositories of history and accumulated lives. As her work evolved into The Houses at Night (2020–2021), she focused on the mood and palette unique to nighttime — the gritty glass of an old front door, laundry racks glimpsed through low walls, the glow of signage — elements that meet the visual noise perceptible only in night landscapes, rendered in saturated color as if tracing someone''s old memory. One viewer purchased a piece, saying the moon in the work was exactly the one he saw as a child returning home from playing soccer with his brother on a hillside neighborhood in Seoul.

The series continuing through Houses of Memory (2023) and Living in That House (2024) grows increasingly painterly and abstract. Where earlier work emphasized the details and materials of landscape, the focus now rests on the composition of color and plane — the tone of the sky, the texture of walls, the direction of light. All of these formal elements are reorganized by the artist''s hand and sublimated into spaces that feel real yet transcend reality.

Garden, Threshold of Memory

After nearly a decade devoted to "the house," Son Eunyeong has turned her gaze to "the garden." Her June 2024 exhibition Monet''s Garden at Gallery Bresson marked the beginning of this shift. "There was a pond in front of the house where I grew up. Roses bloomed, and my mother used to water the garden. I loved that garden."

The garden belongs to the house yet is not the house — neither indoors nor on the street, but an in-between space, private yet public. For Son Eunyeong, the garden is a "threshold of memory": the moment just before entering a house, or just before leaving it.

Monet''s Garden comprises some twenty photographs — roses climbing beneath a wall, rain-soaked grass, an old wooden chair, colorful tulips, a transparent greenhouse in a forest saturated with green, a tropical garden scene where cacti and agave intersect. All are fragments of a garden, yet they are not mere records of plants and objects but landscapes imbued with emotion.

Too vivid for reality, too concrete for a dream — these landscapes visually maximize the theme of "a garden in memory." The artist has composed not merely the forms of nature but the collisions and reconciliations of color that gardens harbor. Slightly blurred petals, smudges of light behind leaves, the density of darkness at the edges of a photograph — all convey more by not speaking.

As philosopher Choe Jinseok has said, "Desire for sustenance resides in the vegetable patch; desire for beauty resides in the garden." Unlike a vegetable patch planted with edible things, a garden is filled with what cannot be eaten — flowers, fragrance, light, pattern, and art. Son Eunyeong''s garden project is an exploration of the garden as a landscape of desire and a birthplace of art.

Photographer Kim Yeongho remarked of the exhibition: "An artist who has long been devoted to ''the house'' has now turned her gaze to ''the garden,'' thereby expanding her sensibility of home. This exhibition will serve as the momentum heralding that transformation."

Like Repainting, Like Repairing

Son Eunyeong describes her working process: "I travel between Seoul and the provinces photographing houses of various forms, then I apply color as if repainting them, and remake them as if repairing something old." This is not merely a description of technique — it is a philosophy.

The first time she retouched a photograph in Photoshop, she realized that the layering work of composing a frame and emphasizing a subject was exactly the way she used to paint. Even when shooting the same subject from the same spot, what is emphasized changes with the angle, just as a painting is structured around what the artist wishes to highlight.

Son Eunyeong''s photographs move us because they are landscapes we have passed through and, at the same time, landscapes we have never seen. Reality, memory, and imagination are layered upon one another — images that deepen the longer we look. Within that depth, she helps us recover something we all possess but have forgotten. In the garden before the house, handling light like a magician, she creates a world that lies beyond reality, emotions that lie beyond memory. Her practice, expanding from the most private space of the house to the landscape of desire called the garden, poses an unending question and gift to us all.' WHERE name_ko = '손은영';

-- ============================================================
-- 3. history_en backfill (5 artists)
-- ============================================================

-- 윤겸
UPDATE artists SET history_en = 'Education
2014 B.F.A. in Painting, College of Formative Arts, Daegu University

Solo Exhibitions
2025 Invitational, Loha Gallery, "In Search of a Place," Seoul
2025 Invitational, Umoha Gallery, "Blue Afterimage," Yongin
2024 "Nature Balance: Survival Harvest," Art Boda Gallery, Seoul
2023 Invitational, Collabo Collage Gallery, Ulsan
2023 "Undecided Fortress," Informel Gallery, Seoul
2019 "Mang''mang (Endless Boundary)," Artmora Gallery, Seoul
2017 "Asurai," Makeshop Art Space, Paju
2016 "Vertigo: Landscape of Reverie," Gallery Beone, Pangyo
2015 "Vertigo: Dizzying Landscape," Guoldam Gallery, Incheon
2014 "Refined World," New Frontier Art Space, Suseong Artpia, Daegu

Selected Group Exhibitions
2026 SAF 2026, Insa Art Center, Seoul
2025 Keepery Gallery 12-Artist Exhibition, Seoul
2025 Laporium Small Works Exhibition (3rd), Loha Gallery, Seoul
2025 "Exploring Life" Two-Person Exhibition, GG2 Gallery Seongsu, Seoul
2025 Dapsimni Art Lab, E-Land Foundation 16th Open Call Exhibition, Seoul
2024 Chuncheon Art Island 2024, Nami Island Pyeonghwarang Gallery, Chuncheon
2024 Art Record Cheongju, Geu Eotteon Gallery, Cheongju
2024 "The Wonderful Spring," FKI Center, Public Gallery, Seoul
2023 The Collection Art Fair & Exhibition, Hyundai Department Store Ulsan
2023 Mugungmujin Exhibition, Chunghwa Gallery, Seoul
2022 Playground, Sangsangmadang Gallery, Seoul
2022 ART Daejeon "My First Collection," Shinsegae Gallery Daejeon
2021 Art Prize, Gangnam Nonhyeon Furniture Street, Seoul
2021 ART 3.6.9, Platform L, Seoul
2021 Art Gyeonggi × Art Road 77, Camerata Gallery, Paju Heyri
2021 "Ecology of the Mind," Shinsegae Gallery Gwangju
2020 KEAs 2020 Ontact: Nevertheless, Art Dang, Seoul
2020 Young Korean Artist Collaboration Music+Art Design, Seoul Forest Cosociety, Seoul
2020 "The Moment," Artmora Gallery, New Jersey
2020 ASYAAF Asian University & Young Artist ARTISTY Special Exhibition, Hongdae Museum of Contemporary Art, Seoul
2020 A1 Young Artist Exhibition, Geumboseong Art Center, Seoul
2020 "Still Life," Government Complex Gallery, Seoul
2019 ART 3.6.9, Yongsan Craft Center, Seoul
2019 "Bumurim: Erasing Boundaries," Pyeongtaek Art Center, Pyeongtaek
2019 "Nature," Artmora Gallery, New Jersey
2019 "Landscape and Beyond," Shinsegae Gallery Centum City, Busan
2018 Artmora Open Call, Artmora Gallery, Seoul
2018 A1 Art Office Emerging Artist Exhibition, Geumboseong Art Center, Seoul
2018 3rd New Drawing Project, Yangju Municipal Jang Ucchin Museum, Yangju
2018 Art 236, Place Camp, Jeju
2017 "Scene: Seen," Artertain, Seoul
2017 "Refill+ing," Seloart Gallery, Seoul
2017 "Small Gift" Exhibition, Art Eum Gallery, Daegu
2017 "Healing Thoughts" Two-Person Exhibition, Seojeong Art Center, Seoul
2017 Insa Salon, Gallery Misulsegye, Seoul
2016 "Landscape of the Mind," Gallery Kyoung, Daegu
2016 ASYAAF, DDP, Seoul
2016 PROLOGUE 2016, Makeshop Art Space, Paju
2016 13th Emerging Artist Statement Exhibition — Top 5 Finals, Gallery Misulsegye, Seoul
2016 MAKESHOP TOP10 2016, Makeshop Art Space, Paju
2015 13th Emerging Artist Statement Exhibition, Imlip Museum, Gongju
2015 13th Emerging Artist Statement Exhibition, Gallery Misulsegye, Seoul
2015 "I Am an Unknown Artist," Arko Art Center, Seoul
2015 Hidden Track, Beomeo Art Street, Daegu
2015 "Key.ddok." Exhibition, Kidari Gallery, Daegu
2015 "Summer, Beautiful," Tongyeong Art Gallery, Tongyeong
2014 A1 Art Office Emerging Artist Exhibition, Gana Insa Art Center, Seoul
2014 A1 Art Office Window Exhibition, A1 Art Office, Seongnam
2014 "Discovery," Art Center PPlus, Seoul
2014 ASYAAF, Culture Station Seoul 284, Seoul
2014 "Encounter," Tongyeong Art Gallery, Tongyeong
2014 "Aggregation and Convergence," Special Exhibition at the Republic of Korea Southern International Contemporary Art Festival, Daegu Culture & Arts Center, Daegu

Residencies & Awards
2022 5th Incarnation Culture & Arts Foundation Creative Grant
2019 Samsung Bespoke Rendezvous Design Competition, Finalist
2018 2nd Place Camp Jeju ART-236, Bronze Prize, Jeju
2018 3rd New Drawing Project, Selected Artist, Yangju Municipal Jang Ucchin Museum
2016 13th Emerging Artist Statement Exhibition, Excellence Award, Gallery Misulsegye, Seoul
2016 Makeshop Art Space STUDIO M17, Artist-in-Residence, Paju
2016 National University Art Competition, Selected, Seoul
2015 National University Art Competition, Selected, Changwon
2014 National University Art Competition, Selected, Changwon

Collections
Arko Art Center, Makeshop Art Space, Daegu University Industry-Academic Cooperation Foundation, Seoul Culture Headquarters Museum Division

Art Fairs
2025 Singapore Art Fair, Artmora Gallery, Singapore
2024 Jeju Art Fair, Emerging Artist Special Exhibition
2021 Euljiro Art Fair, Seoul
2020 Euljiro Art Fair, Seoul
2020 Art Fair 14C, Artmora Gallery, Jersey
2019 Art Gwangju, Artmora Gallery, Gwangju
2019 Art Busan, Artmora Gallery, Busan
2017 Cheonbyeon Art Fair, Artertain Gallery, Seoul
2015 Gyeongnam International Art Fair, Tongyeong Gallery, Gyeongnam' WHERE name_ko = '윤겸';

-- 김성은
UPDATE artists SET history_en = 'Team leader, Korea Smart Cooperative' WHERE name_ko = '김성은';

-- 림지언
UPDATE artists SET history_en = '2018 Solo exhibition (Seoul)
2025 Group exhibition (Seoul)' WHERE name_ko = '림지언';

-- 남진현
UPDATE artists SET history_en = '7 Solo Exhibitions
2025 7th Solo Exhibition (Gallery Insa Art)
2023 6th Solo Exhibition (Jeju French Film Festival Special Program)
2023 5th Solo Exhibition (Gallery Ssamzian, Invitational)
2022 4th Solo Exhibition (Gallery Boda)
2021 3rd Solo Exhibition (Maru Art Center)
2014 2nd Solo Exhibition (Insa Art Center)
2013 1st Solo Exhibition (Insa Art Center)

Group Exhibitions
2025 Art NY 25 (Manhattan)
2025 Turkiye Bodrum HAPIMAG
2025 Turkiye Adana Originalist Gallery
2025 Pariskofinearts (New Jersey)
2023 K-ART-LONDON (Mall Gallery)
2023 K-ART-MELBOURNE (Brightspace Gallery)
2022 Busan International Gallery Art Fair (BAMA)
2022 Gyeongju Art Fair
2022 K Art Fair
2021 100 Korean Contemporary Paintings (Maru Art Center)
2020 Van Der Plas Gallery (New York)' WHERE name_ko = '남진현';

-- 이호철
UPDATE artists SET history_en = 'Awards
- Grand Prize, Mexico Olympics Commemorative Art Exhibition (1968)
- Grand Prize, JoongAng Ilbo Art Exhibition
- Grand Prize, Monaco Royal Art Exhibition
- Grand Prize, Gongsan Art Festival
- Sun Art Prize, Grand Prize

Collections
Samsung Group, Seoul Museum of Art, Asiana Airlines, Kukdong Group, Gongyeong Construction, Cheonggu Group, Bosung Group, Hanjin Group, Kumho Group, Woobang Construction, Daewoo Group, Dong-A Group, Hanshin Engineering & Construction, Newcore Group, Kukje Group, Punglim Group, Youngchang Piano, Anam Watches, Severance Hospital, Yangju Municipal Museum, Samsung Medical Center, Arario Group, Judicial Research and Training Institute, Daejeon Museum of Art, Gwangju Museum of Art, Jeonnam Provincial Museum of Art, Asan Medical Center, Yeongam Museum, Shilla Hotel, Intercontinental Hotel, Beijing Hotel, Oak Premium Hotel, Hilton Hotel, Swiss Grand Hotel, Orakai Hotel, Sheraton Hotel, and over 100 other venues including overseas hotels and golf courses. Embassy of Mexico, Poland, Hong Kong, Dubai, Nigeria, Spain, Belarus, Abrabe Millette, Belgium, Shanghai, Monaco, Turkiye, Scandinavia, Bolivia, South Africa, Greece, and numerous other international public institutions.' WHERE name_ko = '이호철';

COMMIT;
