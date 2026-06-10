import {
  getSupabaseArtworksByArtist,
  getAvailableArtworkCategories,
  getSupabaseArtworks,
  getSupabaseStories,
  getSupabaseArtistExternalLinks,
  getSupabaseArtistNoticeByName,
  getPopularArtistNames,
} from '@/lib/supabase-data';
import { extractArtworkIdsFromBody } from '@/lib/markdown-artwork-refs';
import ArtistNotFound from './not-found';
import { resolveActiveNotice } from '@/lib/artist-notice';
import ArtistNoticeBanner from '@/components/features/ArtistNoticeBanner';
import { getArtistExternalLinks } from '@/lib/artist-external-links';
import { getArticleUrlsByArtist, getArticlesByArtist } from '@/content/artist-articles';
import RelatedArticles from '@/components/features/RelatedArticles';
import { CATEGORY_EN_MAP, getCategoryLabel } from '@/lib/artwork-category';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import { SITE_URL } from '@/lib/constants';
import { LOAN_COUNT } from '@/lib/site-stats';
import {
  generateEnhancedArtistSchema,
  createBreadcrumbSchema,
  generateGalleryAggregateOffer,
  generateArtworkListSchema,
} from '@/lib/seo-utils';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { formatArtistName, resolveArtworkImageUrl } from '@/lib/utils';
import { parseArtworkPrice } from '@/lib/schemas/utils';
import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Artwork, ArtworkListItem } from '@/types';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';
import { getArtistSeoOverride } from '@/lib/artist-seo-overrides';
import { getPrimaryStorySlug, pinPrimaryStory } from '@/lib/artist-story-map';
import { getMediumHubSlug, getMediumCommerceHubSlug } from '@/lib/artwork-medium-hub';
import { containsHangul } from '@/lib/search-utils';
import { ArrowRight, Globe, Instagram } from 'lucide-react';
import { Link } from '@/i18n/navigation';

import SafeImage from '@/components/common/SafeImage';
import ArtworkGalleryWithSort from '@/components/features/ArtworkGalleryWithSort';
import GalleryCampaignBanner from '@/components/features/GalleryCampaignBanner';
import SalesArtworkSpotlight from '@/components/features/SalesArtworkSpotlight';
import MinJoungkiFeature, {
  buildMinJoungkiMetadata,
} from '@/components/special/master-artists/MinJoungkiFeature';
import LeeCheolsooFeature, {
  buildLeeCheolsooMetadata,
} from '@/components/special/master-artists/LeeCheolsooFeature';
import ParkBuldongFeature, {
  buildParkBuldongMetadata,
} from '@/components/special/master-artists/ParkBuldongFeature';
import ShinHakchulFeature, {
  buildShinHakchulMetadata,
} from '@/components/special/master-artists/ShinHakchulFeature';
import ParkJaedongFeature, {
  buildParkJaedongMetadata,
} from '@/components/special/master-artists/ParkJaedongFeature';
import RyuYeonbokFeature, {
  buildRyuYeonbokMetadata,
} from '@/components/special/master-artists/RyuYeonbokFeature';
import KimJungwonFeature, {
  buildKimJungwonMetadata,
} from '@/components/special/master-artists/KimJungwonFeature';
import ChoeByeongsuFeature, {
  buildChoeByeongsuMetadata,
} from '@/components/special/master-artists/ChoeByeongsuFeature';
import JoMunhoFeature, {
  buildJoMunhoMetadata,
} from '@/components/special/master-artists/JoMunhoFeature';
import JuJaehwanFeature, {
  buildJuJaehwanMetadata,
} from '@/components/special/master-artists/JuJaehwanFeature';
import SonEunyeongFeature, {
  buildSonEunyeongMetadata,
} from '@/components/special/master-artists/SonEunyeongFeature';
import KimReisiFeature, {
  buildKimReisiMetadata,
} from '@/components/special/master-artists/KimReisiFeature';
import JeongMijeongFeature, {
  buildJeongMijeongMetadata,
} from '@/components/special/master-artists/JeongMijeongFeature';
import ParkSeongwanFeature, {
  buildParkSeongwanMetadata,
} from '@/components/special/master-artists/ParkSeongwanFeature';
import LeeIktaeFeature, {
  buildLeeIktaeMetadata,
} from '@/components/special/master-artists/LeeIktaeFeature';
import LeeHocheolFeature, {
  buildLeeHocheolMetadata,
} from '@/components/special/master-artists/LeeHocheolFeature';
import KangSeoktaeFeature, {
  buildKangSeoktaeMetadata,
} from '@/components/special/master-artists/KangSeoktaeFeature';
import MinJeongSeeFeature, {
  buildMinJeongSeeMetadata,
} from '@/components/special/master-artists/MinJeongSeeFeature';
import HongJinhuiFeature, {
  buildHongJinhuiMetadata,
} from '@/components/special/master-artists/HongJinhuiFeature';
import KimSeongtaeFeature, {
  buildKimSeongtaeMetadata,
} from '@/components/special/master-artists/KimSeongtaeFeature';
import YoonGyeomFeature, {
  buildYoonGyeomMetadata,
} from '@/components/special/master-artists/YoonGyeomFeature';
import LeeYeolFeature, {
  buildLeeYeolMetadata,
} from '@/components/special/master-artists/LeeYeolFeature';
import JoSinukFeature, {
  buildJoSinukMetadata,
} from '@/components/special/master-artists/JoSinukFeature';
import ChoiJaeranFeature, {
  buildChoiJaeranMetadata,
} from '@/components/special/master-artists/ChoiJaeranFeature';
import LeeSucheolFeature, {
  buildLeeSucheolMetadata,
} from '@/components/special/master-artists/LeeSucheolFeature';
import NamJinhyunFeature, {
  buildNamJinhyunMetadata,
} from '@/components/special/master-artists/NamJinhyunFeature';
import LeeHyeonjeongFeature, {
  buildLeeHyeonjeongMetadata,
} from '@/components/special/master-artists/LeeHyeonjeongFeature';
import SimMobyFeature, {
  buildSimMobyMetadata,
} from '@/components/special/master-artists/SimMobyFeature';
import ChoeYunjeongFeature, {
  buildChoeYunjeongMetadata,
} from '@/components/special/master-artists/ChoeYunjeongFeature';
import CheonJisuFeature, {
  buildCheonJisuMetadata,
} from '@/components/special/master-artists/CheonJisuFeature';
import AnEungyeongFeature, {
  buildAnEungyeongMetadata,
} from '@/components/special/master-artists/AnEungyeongFeature';
import KimJonghwanFeature, {
  buildKimJonghwanMetadata,
} from '@/components/special/master-artists/KimJonghwanFeature';
import SongGwangyeonFeature, {
  buildSongGwangyeonMetadata,
} from '@/components/special/master-artists/SongGwangyeonFeature';
import JeongSeoonFeature, {
  buildJeongSeoonMetadata,
} from '@/components/special/master-artists/JeongSeoonFeature';
import LeeYujiFeature, {
  buildLeeYujiMetadata,
} from '@/components/special/master-artists/LeeYujiFeature';
import SeoGeumjaengFeature, {
  buildSeoGeumjaengMetadata,
} from '@/components/special/master-artists/SeoGeumjaengFeature';
import LeeJieunFeature, {
  buildLeeJieunMetadata,
} from '@/components/special/master-artists/LeeJieunFeature';
import SalnusFeature, {
  buildSalnusMetadata,
} from '@/components/special/master-artists/SalnusFeature';
import LeeYunyeopFeature, {
  buildLeeYunyeopMetadata,
} from '@/components/special/master-artists/LeeYunyeopFeature';
import SinGeonwuFeature, {
  buildSinGeonwuMetadata,
} from '@/components/special/master-artists/SinGeonwuFeature';
import ChoeHyesuFeature, {
  buildChoeHyesuMetadata,
} from '@/components/special/master-artists/ChoeHyesuFeature';
import SimHyeonhuiFeature, {
  buildSimHyeonhuiMetadata,
} from '@/components/special/master-artists/SimHyeonhuiFeature';
import UYongminFeature, {
  buildUYongminMetadata,
} from '@/components/special/master-artists/UYongminFeature';
import KimGyuhakFeature, {
  buildKimGyuhakMetadata,
} from '@/components/special/master-artists/KimGyuhakFeature';
import AnSohyeonFeature, {
  buildAnSohyeonMetadata,
} from '@/components/special/master-artists/AnSohyeonFeature';
import ParkJihyeFeature, {
  buildParkJihyeMetadata,
} from '@/components/special/master-artists/ParkJihyeFeature';
import GoJayeongFeature, {
  buildGoJayeongMetadata,
} from '@/components/special/master-artists/GoJayeongFeature';
import ParkSohyeongFeature, {
  buildParkSohyeongMetadata,
} from '@/components/special/master-artists/ParkSohyeongFeature';
import KimJuhoFeature, {
  buildKimJuhoMetadata,
} from '@/components/special/master-artists/KimJuhoFeature';
import KimSuohFeature, {
  buildKimSuohMetadata,
} from '@/components/special/master-artists/KimSuohFeature';
import JeongChaehuiFeature, {
  buildJeongChaehuiMetadata,
} from '@/components/special/master-artists/JeongChaehuiFeature';
import LeeEunhwaFeature, {
  buildLeeEunhwaMetadata,
} from '@/components/special/master-artists/LeeEunhwaFeature';
import KimDongseokFeature, {
  buildKimDongseokMetadata,
} from '@/components/special/master-artists/KimDongseokFeature';
import JeongYeongsinFeature, {
  buildJeongYeongsinMetadata,
} from '@/components/special/master-artists/JeongYeongsinFeature';
import RaInseokFeature, {
  buildRaInseokMetadata,
} from '@/components/special/master-artists/RaInseokFeature';
import KimHoseongFeature, {
  buildKimHoseongMetadata,
} from '@/components/special/master-artists/KimHoseongFeature';
import KimTaegyunFeature, {
  buildKimTaegyunMetadata,
} from '@/components/special/master-artists/KimTaegyunFeature';
import LeeIncheolFeature, {
  buildLeeIncheolMetadata,
} from '@/components/special/master-artists/LeeIncheolFeature';
import YemikimFeature, {
  buildYemikimMetadata,
} from '@/components/special/master-artists/YemikimFeature';
import KimSangguFeature, {
  buildKimSangguMetadata,
} from '@/components/special/master-artists/KimSangguFeature';
import YangUncheolFeature, {
  buildYangUncheolMetadata,
} from '@/components/special/master-artists/YangUncheolFeature';
import LeeHongwonFeature, {
  buildLeeHongwonMetadata,
} from '@/components/special/master-artists/LeeHongwonFeature';
import ChilmoeKimGuFeature, {
  buildChilmoeKimGuMetadata,
} from '@/components/special/master-artists/ChilmoeKimGuFeature';
import RyuJunhwaFeature, {
  buildRyuJunhwaMetadata,
} from '@/components/special/master-artists/RyuJunhwaFeature';
import AteumanduFeature, {
  buildAteumanduMetadata,
} from '@/components/special/master-artists/AteumanduFeature';
import ParkSujiFeature, {
  buildParkSujiMetadata,
} from '@/components/special/master-artists/ParkSujiFeature';
import ParkYeongseonFeature, {
  buildParkYeongseonMetadata,
} from '@/components/special/master-artists/ParkYeongseonFeature';
import LeeJaejeongFeature, {
  buildLeeJaejeongMetadata,
} from '@/components/special/master-artists/LeeJaejeongFeature';
import SinYeonjinFeature, {
  buildSinYeonjinMetadata,
} from '@/components/special/master-artists/SinYeonjinFeature';
import HanAegyuFeature, {
  buildHanAegyuMetadata,
} from '@/components/special/master-artists/HanAegyuFeature';
import LeeChaewonFeature, {
  buildLeeChaewonMetadata,
} from '@/components/special/master-artists/LeeChaewonFeature';
import JoIrakFeature, {
  buildJoIrakMetadata,
} from '@/components/special/master-artists/JoIrakFeature';
import ParkEunseonFeature, {
  buildParkEunseonMetadata,
} from '@/components/special/master-artists/ParkEunseonFeature';
import JeongGeumhuiFeature, {
  buildJeongGeumhuiMetadata,
} from '@/components/special/master-artists/JeongGeumhuiFeature';
import SonJangseopFeature, {
  buildSonJangseopMetadata,
} from '@/components/special/master-artists/SonJangseopFeature';
import LeeGwangsuFeature, {
  buildLeeGwangsuMetadata,
} from '@/components/special/master-artists/LeeGwangsuFeature';
import SinYeriFeature, {
  buildSinYeriMetadata,
} from '@/components/special/master-artists/SinYeriFeature';
import LeeMunhyeongFeature, {
  buildLeeMunhyeongMetadata,
} from '@/components/special/master-artists/LeeMunhyeongFeature';
import ByeonGyeonghuiFeature, {
  buildByeonGyeonghuiMetadata,
} from '@/components/special/master-artists/ByeonGyeonghuiFeature';
import KimHyeoncheolFeature, {
  buildKimHyeoncheolMetadata,
} from '@/components/special/master-artists/KimHyeoncheolFeature';
import GoHyeonjuFeature, {
  buildGoHyeonjuMetadata,
} from '@/components/special/master-artists/GoHyeonjuFeature';
import RihoFeature, { buildRihoMetadata } from '@/components/special/master-artists/RihoFeature';
import KimUjuFeature, {
  buildKimUjuMetadata,
} from '@/components/special/master-artists/KimUjuFeature';
import KangReaFeature, {
  buildKangReaMetadata,
} from '@/components/special/master-artists/KangReaFeature';
import YangSunyeolFeature, {
  buildYangSunyeolMetadata,
} from '@/components/special/master-artists/YangSunyeolFeature';
import LeeHyeseonFeature, {
  buildLeeHyeseonMetadata,
} from '@/components/special/master-artists/LeeHyeseonFeature';
import OaFeature, { buildOaMetadata } from '@/components/special/master-artists/OaFeature';
import KimYeongseoFeature, {
  buildKimYeongseoMetadata,
} from '@/components/special/master-artists/KimYeongseoFeature';
import JangGyeonghoFeature, {
  buildJangGyeonghoMetadata,
} from '@/components/special/master-artists/JangGyeonghoFeature';
import KimJuhuiFeature, {
  buildKimJuhuiMetadata,
} from '@/components/special/master-artists/KimJuhuiFeature';
import ChoeGyeongseonFeature, {
  buildChoeGyeongseonMetadata,
} from '@/components/special/master-artists/ChoeGyeongseonFeature';
import HanMiyeongFeature, {
  buildHanMiyeongMetadata,
} from '@/components/special/master-artists/HanMiyeongFeature';
import JeongYeonsuFeature, {
  buildJeongYeonsuMetadata,
} from '@/components/special/master-artists/JeongYeonsuFeature';
import LimJieonFeature, {
  buildLimJieonMetadata,
} from '@/components/special/master-artists/LimJieonFeature';
import KimNamjinFeature, {
  buildKimNamjinMetadata,
} from '@/components/special/master-artists/KimNamjinFeature';
import SeoGongimFeature, {
  buildSeoGongimMetadata,
} from '@/components/special/master-artists/SeoGongimFeature';
import JangHuijinFeature, {
  buildJangHuijinMetadata,
} from '@/components/special/master-artists/JangHuijinFeature';
import ChoeYeontaekFeature, {
  buildChoeYeontaekMetadata,
} from '@/components/special/master-artists/ChoeYeontaekFeature';
import RyuHosikFeature, {
  buildRyuHosikMetadata,
} from '@/components/special/master-artists/RyuHosikFeature';

// 거장 작가는 작가 페이지(/artworks/artist/<이름>) URL에서 큐레이션 feature를 렌더한다.
// 일반 작가 페이지 로직 대신 거장 전용 컴포넌트로 분기 — 사용자는 작품 필터에서 작가 이름을
// 클릭하면 거장답게 큐레이션된 화면을 보게 된다. /special/<slug>는 308 redirect로 이 URL로 정리됨.
const MASTER_ARTIST_FEATURES = {
  민정기: { Component: MinJoungkiFeature, buildMetadata: buildMinJoungkiMetadata },
  이철수: { Component: LeeCheolsooFeature, buildMetadata: buildLeeCheolsooMetadata },
  박불똥: { Component: ParkBuldongFeature, buildMetadata: buildParkBuldongMetadata },
  신학철: { Component: ShinHakchulFeature, buildMetadata: buildShinHakchulMetadata },
  박재동: { Component: ParkJaedongFeature, buildMetadata: buildParkJaedongMetadata },
  류연복: { Component: RyuYeonbokFeature, buildMetadata: buildRyuYeonbokMetadata },
  김준권: { Component: KimJungwonFeature, buildMetadata: buildKimJungwonMetadata },
  최병수: { Component: ChoeByeongsuFeature, buildMetadata: buildChoeByeongsuMetadata },
  조문호: { Component: JoMunhoFeature, buildMetadata: buildJoMunhoMetadata },
  주재환: { Component: JuJaehwanFeature, buildMetadata: buildJuJaehwanMetadata },
  손은영: { Component: SonEunyeongFeature, buildMetadata: buildSonEunyeongMetadata },
  김레이시: { Component: KimReisiFeature, buildMetadata: buildKimReisiMetadata },
  정미정: { Component: JeongMijeongFeature, buildMetadata: buildJeongMijeongMetadata },
  박성완: { Component: ParkSeongwanFeature, buildMetadata: buildParkSeongwanMetadata },
  이익태: { Component: LeeIktaeFeature, buildMetadata: buildLeeIktaeMetadata },
  이호철: { Component: LeeHocheolFeature, buildMetadata: buildLeeHocheolMetadata },
  강석태: { Component: KangSeoktaeFeature, buildMetadata: buildKangSeoktaeMetadata },
  민정See: { Component: MinJeongSeeFeature, buildMetadata: buildMinJeongSeeMetadata },
  홍진희: { Component: HongJinhuiFeature, buildMetadata: buildHongJinhuiMetadata },
  '장천 김성태': { Component: KimSeongtaeFeature, buildMetadata: buildKimSeongtaeMetadata },
  윤겸: { Component: YoonGyeomFeature, buildMetadata: buildYoonGyeomMetadata },
  이열: { Component: LeeYeolFeature, buildMetadata: buildLeeYeolMetadata },
  조신욱: { Component: JoSinukFeature, buildMetadata: buildJoSinukMetadata },
  최재란: { Component: ChoiJaeranFeature, buildMetadata: buildChoiJaeranMetadata },
  이수철: { Component: LeeSucheolFeature, buildMetadata: buildLeeSucheolMetadata },
  남진현: { Component: NamJinhyunFeature, buildMetadata: buildNamJinhyunMetadata },
  이현정: { Component: LeeHyeonjeongFeature, buildMetadata: buildLeeHyeonjeongMetadata },
  심모비: { Component: SimMobyFeature, buildMetadata: buildSimMobyMetadata },
  최윤정: { Component: ChoeYunjeongFeature, buildMetadata: buildChoeYunjeongMetadata },
  천지수: { Component: CheonJisuFeature, buildMetadata: buildCheonJisuMetadata },
  안은경: { Component: AnEungyeongFeature, buildMetadata: buildAnEungyeongMetadata },
  김종환: { Component: KimJonghwanFeature, buildMetadata: buildKimJonghwanMetadata },
  송광연: { Component: SongGwangyeonFeature, buildMetadata: buildSongGwangyeonMetadata },
  정서온: { Component: JeongSeoonFeature, buildMetadata: buildJeongSeoonMetadata },
  이유지: { Component: LeeYujiFeature, buildMetadata: buildLeeYujiMetadata },
  서금앵: { Component: SeoGeumjaengFeature, buildMetadata: buildSeoGeumjaengMetadata },
  이지은: { Component: LeeJieunFeature, buildMetadata: buildLeeJieunMetadata },
  Salnus: { Component: SalnusFeature, buildMetadata: buildSalnusMetadata },
  이윤엽: { Component: LeeYunyeopFeature, buildMetadata: buildLeeYunyeopMetadata },
  신건우: { Component: SinGeonwuFeature, buildMetadata: buildSinGeonwuMetadata },
  최혜수: { Component: ChoeHyesuFeature, buildMetadata: buildChoeHyesuMetadata },
  심현희: { Component: SimHyeonhuiFeature, buildMetadata: buildSimHyeonhuiMetadata },
  우용민: { Component: UYongminFeature, buildMetadata: buildUYongminMetadata },
  김규학: { Component: KimGyuhakFeature, buildMetadata: buildKimGyuhakMetadata },
  안소현: { Component: AnSohyeonFeature, buildMetadata: buildAnSohyeonMetadata },
  박지혜: { Component: ParkJihyeFeature, buildMetadata: buildParkJihyeMetadata },
  고자영: { Component: GoJayeongFeature, buildMetadata: buildGoJayeongMetadata },
  박소형: { Component: ParkSohyeongFeature, buildMetadata: buildParkSohyeongMetadata },
  김주호: { Component: KimJuhoFeature, buildMetadata: buildKimJuhoMetadata },
  김수오: { Component: KimSuohFeature, buildMetadata: buildKimSuohMetadata },
  정채희: { Component: JeongChaehuiFeature, buildMetadata: buildJeongChaehuiMetadata },
  이은화: { Component: LeeEunhwaFeature, buildMetadata: buildLeeEunhwaMetadata },
  김동석: { Component: KimDongseokFeature, buildMetadata: buildKimDongseokMetadata },
  정영신: { Component: JeongYeongsinFeature, buildMetadata: buildJeongYeongsinMetadata },
  라인석: { Component: RaInseokFeature, buildMetadata: buildRaInseokMetadata },
  김호성: { Component: KimHoseongFeature, buildMetadata: buildKimHoseongMetadata },
  김태균: { Component: KimTaegyunFeature, buildMetadata: buildKimTaegyunMetadata },
  이인철: { Component: LeeIncheolFeature, buildMetadata: buildLeeIncheolMetadata },
  예미킴: { Component: YemikimFeature, buildMetadata: buildYemikimMetadata },
  김상구: { Component: KimSangguFeature, buildMetadata: buildKimSangguMetadata },
  양운철: { Component: YangUncheolFeature, buildMetadata: buildYangUncheolMetadata },
  이홍원: { Component: LeeHongwonFeature, buildMetadata: buildLeeHongwonMetadata },
  '칡뫼 김구': { Component: ChilmoeKimGuFeature, buildMetadata: buildChilmoeKimGuMetadata },
  류준화: { Component: RyuJunhwaFeature, buildMetadata: buildRyuJunhwaMetadata },
  아트만두: { Component: AteumanduFeature, buildMetadata: buildAteumanduMetadata },
  박수지: { Component: ParkSujiFeature, buildMetadata: buildParkSujiMetadata },
  박영선: { Component: ParkYeongseonFeature, buildMetadata: buildParkYeongseonMetadata },
  이재정: { Component: LeeJaejeongFeature, buildMetadata: buildLeeJaejeongMetadata },
  신연진: { Component: SinYeonjinFeature, buildMetadata: buildSinYeonjinMetadata },
  한애규: { Component: HanAegyuFeature, buildMetadata: buildHanAegyuMetadata },
  이채원: { Component: LeeChaewonFeature, buildMetadata: buildLeeChaewonMetadata },
  조이락: { Component: JoIrakFeature, buildMetadata: buildJoIrakMetadata },
  박은선: { Component: ParkEunseonFeature, buildMetadata: buildParkEunseonMetadata },
  정금희: { Component: JeongGeumhuiFeature, buildMetadata: buildJeongGeumhuiMetadata },
  손장섭: { Component: SonJangseopFeature, buildMetadata: buildSonJangseopMetadata },
  이광수: { Component: LeeGwangsuFeature, buildMetadata: buildLeeGwangsuMetadata },
  신예리: { Component: SinYeriFeature, buildMetadata: buildSinYeriMetadata },
  이문형: { Component: LeeMunhyeongFeature, buildMetadata: buildLeeMunhyeongMetadata },
  변경희: { Component: ByeonGyeonghuiFeature, buildMetadata: buildByeonGyeonghuiMetadata },
  김현철: { Component: KimHyeoncheolFeature, buildMetadata: buildKimHyeoncheolMetadata },
  고현주: { Component: GoHyeonjuFeature, buildMetadata: buildGoHyeonjuMetadata },
  리호: { Component: RihoFeature, buildMetadata: buildRihoMetadata },
  김우주: { Component: KimUjuFeature, buildMetadata: buildKimUjuMetadata },
  강레아: { Component: KangReaFeature, buildMetadata: buildKangReaMetadata },
  양순열: { Component: YangSunyeolFeature, buildMetadata: buildYangSunyeolMetadata },
  이혜선: { Component: LeeHyeseonFeature, buildMetadata: buildLeeHyeseonMetadata },
  오아: { Component: OaFeature, buildMetadata: buildOaMetadata },
  김영서: { Component: KimYeongseoFeature, buildMetadata: buildKimYeongseoMetadata },
  장경호: { Component: JangGyeonghoFeature, buildMetadata: buildJangGyeonghoMetadata },
  김주희: { Component: KimJuhuiFeature, buildMetadata: buildKimJuhuiMetadata },
  최경선: { Component: ChoeGyeongseonFeature, buildMetadata: buildChoeGyeongseonMetadata },
  한미영: { Component: HanMiyeongFeature, buildMetadata: buildHanMiyeongMetadata },
  정연수: { Component: JeongYeonsuFeature, buildMetadata: buildJeongYeonsuMetadata },
  림지언: { Component: LimJieonFeature, buildMetadata: buildLimJieonMetadata },
  김남진: { Component: KimNamjinFeature, buildMetadata: buildKimNamjinMetadata },
  서공임: { Component: SeoGongimFeature, buildMetadata: buildSeoGongimMetadata },
  장희진: { Component: JangHuijinFeature, buildMetadata: buildJangHuijinMetadata },
  최연택: { Component: ChoeYeontaekFeature, buildMetadata: buildChoeYeontaekMetadata },
  류호식: { Component: RyuHosikFeature, buildMetadata: buildRyuHosikMetadata },
} as const;

type MasterArtistName = keyof typeof MASTER_ARTIST_FEATURES;

const isMasterArtist = (name: string): name is MasterArtistName => name in MASTER_ARTIST_FEATURES;
const OH_YOON_SALES_PRIORITY = [
  '45dac49b-e8f2-4aea-8b86-8452dba853c0',
  'e637bb45-e888-443b-8f2e-8911c79d9ba7',
  'd17d1423-20f7-4bf6-9611-89a3688280f8',
  '1cb51984-cc53-49e2-bf93-1eb4e00f780a',
  '4c920878-32dd-4727-ab03-6eda996597d5',
] as const;

// force-dynamic 영구 유지 — force-static 환경에서만 발생하는 production-only throw 회귀
// (류연복·천지윤·송광호·이문호 등). dev mode는 200 정상 응답, force-dynamic도 200, 오직
// SSG/ISR 빌드 prerender 시점에만 'TypeError: Invalid character' throw하고 그게 ISR에 stale
// 500으로 박힘. force-static 복원 시도(27d33770) 후 동일 회귀 재발 확인. throw origin은
// Vercel build 환경에서만 재현되어 trace 캡처 어려움.
// Trade-off: 매 요청 lambda(~200~500ms TTFB 증가) vs CDN 캐시 성능. 작가 페이지는 트래픽
// 1% 미만이라 cost 영향 작음. SEO는 영향 없음 (Googlebot 첫 hit 시 SSR로 정상 200).
// 근본 origin 파악되면 force-static 재시도 가능.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
  params: Promise<{
    locale: string;
    artist: string;
  }>;
}

// Generate metadata for Artist Page
export async function generateMetadata(props: Props): Promise<Metadata> {
  // generateMetadata 단계에서 throw해도 페이지 전체 500으로 응답되던 회귀 차단.
  // throw 시 안전한 noindex metadata 반환 → body try/catch가 ArtistNotFound 렌더 담당.
  try {
    return await buildArtistMetadata(props);
  } catch (err) {
    console.error(`[artist-page] metadata build failed:`, err instanceof Error ? err.stack : err);
    return {
      title: 'Artist',
      robots: { index: false, follow: true },
    };
  }
}

async function buildArtistMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, artist } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const artistName = decodeURIComponent(artist);

  // 거장 작가는 큐레이션 feature의 metadata를 그대로 사용.
  if (isMasterArtist(artistName)) {
    return MASTER_ARTIST_FEATURES[artistName].buildMetadata({ params });
  }

  const artistArtworks = await getSupabaseArtworksByArtist(artistName);
  const t = await getTranslations({ locale, namespace: 'artistPage' });

  if (artistArtworks.length === 0) {
    // force-static + notFound() 조합이 Vercel에서 500을 던지는 회귀가 있어 inline 렌더로
    // 처리. metadata도 명시 noindex로 검색 색인 제외.
    return {
      title: t('notFound'),
      robots: { index: false, follow: true },
    };
  }

  // Sprint 71: representativeArtwork·seoImageUrl·imageUrl 변수 제거 — Next.js 컨벤션 파일이 자동 emit.
  const artistPath = `/artworks/artist/${encodeURIComponent(artistName)}`;
  const pageUrl = buildLocaleUrl(artistPath, locale);

  const displayArtistName =
    locale === 'en' && artistArtworks[0]?.artist_en ? artistArtworks[0].artist_en : artistName;
  const formattedName = formatArtistName(displayArtistName, locale !== 'en');
  const availableCount = artistArtworks.filter((a) => !a.sold).length;
  const availabilityText =
    availableCount > 0
      ? t('availabilityAvailable', { count: availableCount })
      : t('availabilitySoldOut');

  // Find the most common category as the primary one
  const categoryCounts = artistArtworks.reduce<Record<string, number>>((acc, a) => {
    if (a.category) acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {});
  const primaryCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const displayCategory = primaryCategory
    ? locale === 'en'
      ? CATEGORY_EN_MAP[primaryCategory] || primaryCategory
      : primaryCategory
    : undefined;

  const prices = artistArtworks
    .map((a) => parseArtworkPrice(a.price))
    .filter((p): p is number => p !== null && p > 0);
  const formatKrw = (n: number) => n.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR');
  let priceRange: string | undefined;
  if (prices.length === 1) {
    priceRange = t('priceRangeSingle', { price: formatKrw(prices[0]) });
  } else if (prices.length > 1) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    priceRange =
      min === max
        ? t('priceRangeSingle', { price: formatKrw(min) })
        : t('priceRangeSpan', { min: formatKrw(min), max: formatKrw(max) });
  }

  const count = artistArtworks.length;
  // Artist SEO override (caching·청원 등 특별 컨텍스트 있는 작가는 generic title 대신 SERP CTR 직격
  // 워딩 사용). 매핑 없으면 generic fallback. description은 generic 유지(가격대·재고 동적 정보가
  // user intent 매칭에 더 강하므로).
  const artistOverride = getArtistSeoOverride(artistName);
  const overrideTitle = locale === 'en' ? artistOverride?.titleEn : artistOverride?.titleKo;
  const metaTitle =
    overrideTitle ??
    (displayCategory
      ? t('metaTitleWithCategory', { artist: formattedName, count, category: displayCategory })
      : t('metaTitleWithoutCategory', { artist: formattedName, count }));

  const categoryForDesc = displayCategory ?? '';
  const seoDescription = priceRange
    ? t('metaDescriptionWithPrice', {
        artist: formattedName,
        count,
        category: categoryForDesc,
        priceRange,
        availability: availabilityText,
        loanCount: LOAN_COUNT,
      })
    : t('metaDescriptionNoPrice', {
        artist: formattedName,
        count,
        category: categoryForDesc,
        availability: availabilityText,
      });

  return {
    title: metaTitle,
    description: seoDescription.substring(0, 160),
    keywords: (locale === 'en'
      ? [artistName, 'SAF Online', 'Korean artist', primaryCategory || null]
      : [artistName, '씨앗페', primaryCategory || null]
    ).filter((k): k is string => Boolean(k)),
    alternates: createLocaleAlternates(artistPath, locale, true),
    openGraph: {
      title: metaTitle,
      description: seoDescription.substring(0, 200),
      url: pageUrl,
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'ko_KR',
      siteName: locale === 'en' ? 'SAF Online' : '씨앗페 온라인',
      // images 미명시 — Next.js 컨벤션 파일(opengraph-image.tsx)이 자동 emit.
      // 작가 이름 + 작품 수 + 가격 범위 + 대표 카테고리 + 대표 작품 이미지 + SAF 브랜딩이 그려진
      // 1200x630 ImageResponse가 raw 작품 thumbnail보다 SNS 공유에서 작가 entity 명확히 노출.
      images: undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: seoDescription.substring(0, 200),
      // twitter-image.tsx 컨벤션 부재 시 Next.js가 opengraph-image.tsx로 자동 fallback.
      images: undefined,
    },
    // 영어 아티스트 페이지는 한국어 콘텐츠만 있어 thin content — 색인 제외
    ...(locale === 'en' ? { robots: { index: false, follow: true } } : {}),
  };
}

// 빌드 시 인기 작가 TOP 20 × 2 locale = 40 페이지 prerender. 작가당 ~3-4 Supabase 쿼리라
// 빌드 부하 안전. 나머지 작가는 첫 요청 시 SSG (그 후 캐시).
export async function generateStaticParams() {
  const names = await getPopularArtistNames(20);
  return names.flatMap((artist) => ['ko', 'en'].map((locale) => ({ locale, artist })));
}

export default async function ArtistPage(props: Props) {
  // schema 빌더 외에도 작가 페이지 body 일부 흐름(SafeImage·RelatedMagazineCard 등)이
  // 'TypeError: Invalid character' throw하는 케이스가 관측됨 — generateStaticParams로
  // prerender된 인기 작가(이철수·오윤 등)는 same throw에서도 200 응답하지만 그 외 작가는
  // 첫 hit SSG 단계에서 throw → 500. outer try/catch로 안전망 + console.error로 stack
  // 보존 (logs에서 정확한 origin 추적용). catch 시 ArtistNotFound 렌더 + 200 응답.
  try {
    return await renderArtistPage(props);
  } catch (err) {
    const { artist } = await props.params;
    console.error(
      `[artist-page] body render failed for "${decodeURIComponent(artist)}":`,
      err instanceof Error ? err.stack : err
    );
    return <ArtistNotFound />;
  }
}

async function renderArtistPage({ params }: Props) {
  const { locale: rawLocale, artist } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const artistName = decodeURIComponent(artist);

  // 거장 작가는 큐레이션 feature를 통째로 렌더 — hero·약력·갤러리·schema 자체 발행.
  if (isMasterArtist(artistName)) {
    const { Component } = MASTER_ARTIST_FEATURES[artistName];
    return <Component params={params} />;
  }

  const isEnglish = locale === 'en';
  // 병렬 fetch — 이전 getSupabaseArtworks() (전체 330개) → 카테고리 문자열 배열만으로 축소
  const [artistArtworks, availableCategories] = await Promise.all([
    getSupabaseArtworksByArtist(artistName),
    getAvailableArtworkCategories(),
  ]);
  const listArtworks: ArtworkListItem[] = artistArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const t = await getTranslations({ locale, namespace: 'artistPage' });

  if (artistArtworks.length === 0) {
    // force-static + notFound() 조합이 Vercel에서 500 status를 던지는 회귀가 측정됨
    // (신학철·천지윤·작가 없음 케이스). not-found.tsx와 동일한 ArtistNotFound 컴포넌트를
    // 직접 렌더해 200 + noindex 메타로 응답. force-dynamic 환경 회귀 주석은 force-static
    // 전환 후 무효.
    return <ArtistNotFound />;
  }

  // Use the first artwork's image as the hero background
  const representativeArtwork = artistArtworks[0];
  const resolvedImageUrl = resolveArtworkImageUrl(representativeArtwork.images[0] ?? '');
  const heroBackgroundImage = resolvedImageUrl;

  // Description Logic: Profile > History (CV) > Description (Note) > Default
  // Find valid profile, history, or note from any of the artist's artworks
  const artistProfile = artistArtworks.find((a) => a.profile)?.profile;
  const artistProfileEn = artistArtworks.find((a) => a.profile_en)?.profile_en;
  const artistHistoryHero = artistArtworks.find((a) => a.history)?.history;
  const artistHistoryHeroEn = artistArtworks.find((a) => a.history_en)?.history_en;
  const artistNote = artistArtworks.find((a) => a.description)?.description;

  const displayArtistName =
    locale === 'en' && artistArtworks[0]?.artist_en ? artistArtworks[0].artist_en : artistName;
  const formattedName = formatArtistName(displayArtistName, locale !== 'en');
  const rawDescription =
    locale === 'en'
      ? artistProfileEn ||
        artistProfile ||
        artistHistoryHeroEn ||
        artistHistoryHero ||
        artistNote ||
        t('defaultDescription', { artist: formattedName })
      : artistProfile ||
        artistHistoryHero ||
        artistNote ||
        t('defaultDescription', { artist: formattedName });
  const localizedDescription =
    locale === 'en' && containsHangul(rawDescription)
      ? t('originalKoreanDescription')
      : rawDescription;

  // Truncate to 100 characters for visual balance
  const isTruncated = localizedDescription.length > 100;
  const heroDescription = isTruncated
    ? `${localizedDescription.substring(0, 100)}...`
    : localizedDescription;

  const pageUrl = buildLocaleUrl(`/artworks/artist/${encodeURIComponent(artistName)}`, locale);
  const availableArtworks = listArtworks.filter((artwork) => !artwork.sold && !artwork.reserved);
  const priorityMap = new Map<string, number>(
    OH_YOON_SALES_PRIORITY.map((id, index) => [id, index])
  );
  const featuredSalesArtworks =
    artistName === '오윤'
      ? availableArtworks
          .filter((artwork) => priorityMap.has(artwork.id))
          .sort((a, b) => (priorityMap.get(a.id) ?? 99) - (priorityMap.get(b.id) ?? 99))
      : [...availableArtworks]
          .sort(
            (a, b) =>
              (parseArtworkPrice(a.price) ?? Infinity) - (parseArtworkPrice(b.price) ?? Infinity)
          )
          .slice(0, 5);
  const bodyPrices = availableArtworks
    .map((artwork) => parseArtworkPrice(artwork.price))
    .filter((price): price is number => price !== null && price > 0);
  const bodyPriceRange =
    bodyPrices.length > 0
      ? {
          min: Math.min(...bodyPrices),
          max: Math.max(...bodyPrices),
        }
      : null;
  const formattedBodyPriceRange = bodyPriceRange
    ? bodyPriceRange.min === bodyPriceRange.max
      ? `${bodyPriceRange.min.toLocaleString(isEnglish ? 'en-US' : 'ko-KR')} KRW`
      : `${bodyPriceRange.min.toLocaleString(isEnglish ? 'en-US' : 'ko-KR')}–${bodyPriceRange.max.toLocaleString(isEnglish ? 'en-US' : 'ko-KR')} KRW`
    : null;

  // Person JSON-LD Schema for SEO (enhanced with credentials, expertise, work samples)
  const artistHistory = artistArtworks.find((a) => a.history)?.history;
  const artistHistoryEn = artistArtworks.find((a) => a.history_en)?.history_en;
  const schemaProfile = locale === 'en' ? artistProfileEn || artistProfile : artistProfile;
  const schemaDescription =
    locale === 'en' && schemaProfile && containsHangul(schemaProfile)
      ? t('originalKoreanDescription')
      : schemaProfile || artistNote || undefined;
  const effectiveHistory = locale === 'en' ? artistHistoryEn || artistHistory : artistHistory;
  const schemaHistory =
    locale === 'en' && effectiveHistory && containsHangul(effectiveHistory)
      ? undefined
      : effectiveHistory;
  // 본문 bio 섹션용 — schema와 동일 로직이나 artistNote fallback 제외 (profile만).
  const bioProfile: string | undefined =
    locale === 'en'
      ? artistProfileEn && !containsHangul(artistProfileEn)
        ? artistProfileEn
        : undefined
      : artistProfile || undefined;
  const bioHistory: string | undefined = schemaHistory;
  // sameAs 외부 권위 링크 — Knowledge Graph entity 연결 강화 시그널.
  // 출처 3개 합침:
  // 1) artist-articles.ts (사용자가 사전 큐레이션한 매체/MMCA/Wikipedia/달진닷컴 등 386 URL)
  // 2) lib/artist-external-links.ts (거장 정적 매핑)
  // 3) Supabase artists.homepage / artists.instagram (작가 본인 SNS)
  // GSC Performance상 작가 검색 노출은 다수인데 page 2~3에 머무는 페이지들 다수 — 이를 page 1로 끌어올리는 레버.
  const [artistMeta, noticeRecord] = await Promise.all([
    getSupabaseArtistExternalLinks(artistName),
    getSupabaseArtistNoticeByName(artistName),
  ]);
  const notice = resolveActiveNotice(noticeRecord, locale === 'en' ? 'en' : 'ko');
  const sameAs: string[] = [
    ...getArticleUrlsByArtist(artistName),
    ...getArtistExternalLinks(artistName),
    ...(artistMeta?.homepage ? [artistMeta.homepage] : []),
    ...(artistMeta?.instagram ? [artistMeta.instagram] : []),
  ];

  // personSchema는 relatedStories hydrate된 이후 생성하도록 아래로 이동.

  // Related magazine stories — 두 경로 모두 매칭:
  //   (1) tags에 작가명이 포함된 글 (작가-인터뷰 시리즈, 거장 단독 글 등)
  //   (2) 본문에 이 작가의 작품(/artworks/{uuid})이 인용된 글 (큐레이션·가이드 시리즈)
  // 두 번째 경로 덕분에 매거진 작성 시 tags에 작가명을 넣지 않아도 본문 인용만으로
  // 작가 페이지에 자동으로 backlink가 생성됨 — 양방향 entity 그래프.
  const [allStories, allArtworks] = await Promise.all([
    getSupabaseStories(),
    getSupabaseArtworks(),
  ]);
  const thisArtistArtworkIds = new Set(
    allArtworks.filter((a) => a.artist === artistName).map((a) => a.id)
  );
  const matchedStories = allStories.filter((s) => {
    const taggedMatch = s.tags?.some((tag) => tag === artistName || tag === displayArtistName);
    if (taggedMatch) return true;
    // 본문에 이 작가의 작품 id가 하나라도 인용되면 매칭. body·body_en 양쪽 모두 검사.
    const referencedIds = [
      ...extractArtworkIdsFromBody(s.body),
      ...extractArtworkIdsFromBody(s.body_en),
    ];
    return referencedIds.some((id) => thisArtistArtworkIds.has(id));
  });
  // 정전 스토리를 맨 앞에 고정 후 매체 hub 결정론 삽입(2번 슬롯) — 작가 + 매체 entity 양쪽 강화.
  const pinnedStories = pinPrimaryStory(artistName, matchedStories);
  const dominantCategoryEntry = Object.entries(
    artistArtworks.reduce<Record<string, number>>((acc, a) => {
      if (a.category) acc[a.category] = (acc[a.category] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0];
  const dominantCategory = dominantCategoryEntry?.[0] ?? null;
  const mediumHubSlug = getMediumHubSlug(dominantCategory);
  const mediumHubStory =
    mediumHubSlug && !pinnedStories.some((s) => s.slug === mediumHubSlug)
      ? (allStories.find((s) => s.slug === mediumHubSlug) ?? null)
      : null;
  // 매체 commerce hub(buying-guide) — knowledge hub와 별개로 가격/구매 의도 funnel link.
  const commerceHubSlug = getMediumCommerceHubSlug(dominantCategory);
  const commerceHubStory =
    commerceHubSlug &&
    commerceHubSlug !== mediumHubSlug &&
    !pinnedStories.some((s) => s.slug === commerceHubSlug)
      ? (allStories.find((s) => s.slug === commerceHubSlug) ?? null)
      : null;
  const hubInserts = [mediumHubStory, commerceHubStory].filter((s): s is NonNullable<typeof s> =>
    Boolean(s)
  );
  const relatedStories = (
    pinnedStories.length > 0
      ? [pinnedStories[0], ...hubInserts, ...pinnedStories.slice(1)]
      : hubInserts
  )
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .slice(0, 3);
  // bio 섹션 문맥 링크용 — gallery page bio block(outbound 링크 0)에 정전 스토리 above-the-fold 링크 추가.
  const primaryStorySlug = getPrimaryStorySlug(artistName);
  const primaryStory = primaryStorySlug
    ? (allStories.find((s) => s.slug === primaryStorySlug) ?? null)
    : null;

  // 작가 외부 권위 자료 (한겨레·MMCA·달진닷컴·Wikipedia·namu.wiki 등 큐레이션 386 URL).
  // 작품 detail에서만 visible이었던 RelatedArticles를 작가 페이지에도 노출 — entity 신뢰도 +
  // 사용자 dwell time 향상. 거장 작가(오윤·박재동·박불똥 등) 페이지가 풍부해져 page 1 진입 가속.
  const relatedArticles = getArticlesByArtist(artistName);

  // 일부 작가 페이지(류연복·송광호·이문호 등)가 schema 빌딩 단계에서 'TypeError: Invalid
  // character' throw → 페이지 전체 500이 되던 회귀 우회. 각 빌더를 안전하게 감싸 throw 시
  // null + stack 로깅 → 페이지는 정상 렌더, schema만 누락(추후 logs에서 정확한 origin 추적).
  const safeBuild = <T,>(label: string, fn: () => T): T | null => {
    try {
      return fn();
    } catch (err) {
      console.error(
        `[artist-page] ${label} schema build failed for "${artistName}":`,
        err instanceof Error ? err.stack : err
      );
      return null;
    }
  };

  // Person schema 생성 — relatedStories hydrate 이후라 subjectOf 필드를 정확한 매거진 글로 채움.
  // 매거진 → 작가(BlogPosting.mentions)가 양방향으로 작가 → 매거진(Person.subjectOf)으로 발행되어
  // entity 그래프 양방향화. AI Overview·Knowledge Graph entity 매칭에 직접 시그널.
  const personSchema = safeBuild('person', () =>
    generateEnhancedArtistSchema({
      name: displayArtistName,
      description: schemaDescription,
      image: representativeArtwork.images[0] ?? '',
      url: pageUrl,
      jobTitle: 'Artist',
      history: schemaHistory,
      sameAs,
      artworks: artistArtworks.map((a) => ({
        id: a.id,
        title: locale === 'en' && a.title_en ? a.title_en : a.title,
        image: a.images[0] ?? '',
      })),
      relatedStories: relatedStories.map((s) => ({
        url: buildLocaleUrl(`/stories/${s.slug}`, locale),
        name: locale === 'en' && s.title_en ? s.title_en : s.title,
        datePublished: s.published_at,
      })),
      // 작가의 dominant medium — Person.knowsAbout에 매체 hub CreativeWork entity 추가.
      dominantCategory,
      // 같은 매체의 정전 작가(ARTIST_PRIMARY_STORY 등재) sister — Person.colleague entity.
      // dominantCategory가 같은 작가 중 자기 자신 제외, 정전 등재만, 최대 5명.
      sisterCanonicalArtists: dominantCategory
        ? [
            ...new Set(
              allArtworks
                .filter(
                  (a) =>
                    a.category === dominantCategory &&
                    a.artist !== artistName &&
                    getPrimaryStorySlug(a.artist)
                )
                .map((a) => a.artist)
            ),
          ]
            .slice(0, 5)
            .map((name) => ({
              name,
              url: buildLocaleUrl(`/artworks/artist/${encodeURIComponent(name)}`, locale),
            }))
        : [],
    })
  );

  // Breadcrumb Schema: Home > Artworks > [Medium Category] > Artist Name
  // dominantCategory가 있으면 매체 카테고리 단계를 끼움 — 작가↔매체 hub 양방향 link equity.
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });
  const categoryBreadcrumbItem = dominantCategory
    ? {
        name:
          locale === 'en'
            ? CATEGORY_EN_MAP[dominantCategory] || dominantCategory
            : dominantCategory,
        url: buildLocaleUrl(`/artworks/category/${encodeURIComponent(dominantCategory)}`, locale),
      }
    : null;
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    ...(categoryBreadcrumbItem ? [categoryBreadcrumbItem] : []),
    { name: formattedName, url: pageUrl },
  ];
  const breadcrumbSchema = safeBuild('breadcrumb', () => createBreadcrumbSchema(breadcrumbItems));

  const artistPageUrl = buildLocaleUrl(
    `/artworks/artist/${encodeURIComponent(artistName)}`,
    locale
  );
  // AggregateOffer: 작가명 검색 시 가격 범위를 리치 스니펫에 노출
  const aggregateOfferSchema = safeBuild('aggregateOffer', () =>
    generateGalleryAggregateOffer(artistArtworks, locale, artistPageUrl)
  );
  const itemListSchema = safeBuild('itemList', () =>
    generateArtworkListSchema(artistArtworks, locale, artistArtworks.length, artistPageUrl)
  );
  const collectionPageSchema = safeBuild('collectionPage', () => ({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${artistPageUrl}#webpage`,
    name:
      locale === 'en'
        ? `${formattedName} — Artworks at SAF Online`
        : `${formattedName} 작가 — 씨앗페 온라인`,
    url: artistPageUrl,
    isPartOf: { '@id': `${SITE_URL}#website` },
    inLanguage: locale === 'en' ? 'en-US' : 'ko-KR',
    author: { '@id': `${SITE_URL}#organization` },
    audience: {
      '@type': 'PeopleAudience',
      audienceType:
        locale === 'en'
          ? `Collectors interested in ${formattedName}, gallery curators`
          : `${formattedName} 작가에 관심 있는 컬렉터·갤러리 큐레이터`,
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '#artist-bio'],
    },
  }));

  // LCP preload는 PageHero가 자동 발행 — customBackgroundImage 받으면 lib/hero-image
  // 단일 출처로 mobile/desktop 1x/2x 모두 정확히 매칭된 preload 생성.

  return (
    <div className="min-h-screen">
      {personSchema && <JsonLdScript data={personSchema} />}
      {breadcrumbSchema && <JsonLdScript data={breadcrumbSchema} />}
      {collectionPageSchema && <JsonLdScript data={collectionPageSchema} />}
      {aggregateOfferSchema && <JsonLdScript data={aggregateOfferSchema} />}
      {itemListSchema && <JsonLdScript data={itemListSchema} />}
      <PageHero
        title={formattedName}
        description={heroDescription}
        customBackgroundImage={heroBackgroundImage}
        breadcrumbItems={breadcrumbItems}
      >
        <ShareButtonsWrapper
          url={pageUrl}
          title={t('shareTitle', { artist: formattedName, count: artistArtworks.length })}
          description={t('shareDescription', { artist: formattedName })}
        />
        {/* 작가 외부 권위 링크 — homepage·instagram이 schema sameAs에는 들어가지만
            UI에서도 가시화하면 (1) 사용자 trust ↑ (2) 외부 링크 트래픽 (3) Google entity 확신 강화.
            Wikipedia·MMCA 같은 권위 article은 별도 RelatedArticles 컴포넌트가 페이지 하단에 노출. */}
        {(artistMeta?.homepage || artistMeta?.instagram) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {artistMeta.homepage && (
              <a
                href={artistMeta.homepage}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                aria-label={
                  isEnglish
                    ? `Visit ${formattedName}'s official homepage (opens in new tab)`
                    : `${formattedName} 작가 공식 홈페이지 (새 탭)`
                }
              >
                <Globe aria-hidden="true" className="h-3.5 w-3.5" />
                {isEnglish ? 'Homepage' : '작가 홈페이지'}
              </a>
            )}
            {artistMeta.instagram && (
              <a
                href={artistMeta.instagram}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                aria-label={
                  isEnglish
                    ? `Visit ${formattedName} on Instagram (opens in new tab)`
                    : `${formattedName} 작가 Instagram (새 탭)`
                }
              >
                <Instagram aria-hidden="true" className="h-3.5 w-3.5" />
                Instagram
              </a>
            )}
          </div>
        )}
      </PageHero>

      {notice && (
        <Section variant="white" prevVariant="white" className="pt-8 pb-4 md:pt-10 md:pb-6">
          <div className="container-max">
            <ArtistNoticeBanner type={notice.type} message={notice.message} locale={locale} />
          </div>
        </Section>
      )}

      {featuredSalesArtworks.length > 0 && (
        <Section variant="canvas" prevVariant="white" className="pt-10 pb-12 md:pt-12 md:pb-16">
          <div className="container-max">
            <SalesArtworkSpotlight
              artworks={featuredSalesArtworks}
              eyebrow={
                isEnglish
                  ? `${availableArtworks.length} available works`
                  : `구매 가능 작품 ${availableArtworks.length}점`
              }
              title={
                isEnglish
                  ? `Available works by ${formattedName}`
                  : `${formattedName} 작가의 구매 가능한 작품`
              }
              description={
                formattedBodyPriceRange
                  ? isEnglish
                    ? `Browse available works before the full gallery. Current listed price range: ${formattedBodyPriceRange}.`
                    : `전체 목록을 보기 전, 구매 가능한 작품을 먼저 확인하세요. 현재 가격대는 ${formattedBodyPriceRange}입니다.`
                  : isEnglish
                    ? 'Browse available works before the full gallery.'
                    : '전체 목록을 보기 전, 구매 가능한 작품을 먼저 확인하세요.'
              }
              ctaLabel={isEnglish ? 'Browse full artist gallery' : '작가 작품 전체 보기'}
              allHref={`/artworks/artist/${encodeURIComponent(artistName)}`}
              source={`artist-page-sales-${artistName}`}
            />
          </div>
        </Section>
      )}

      {/* 작가 소개 본문 — hero는 100자 truncate라 Google이 충분한 텍스트를 읽지 못함.
          풀 profile + history(약력)를 server-rendered로 노출해 page weight 확보. */}
      {(bioProfile || bioHistory) && (
        <Section variant="white" prevVariant="white" className="pt-12 md:pt-16 pb-8">
          <div className="container-max max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-charcoal-deep mb-6">
              {isEnglish ? `About ${formattedName}` : `${formattedName} 작가 소개`}
            </h2>
            {bioProfile && (
              <p className="whitespace-pre-wrap text-charcoal leading-relaxed">{bioProfile}</p>
            )}
            {primaryStory && (
              <p className="mt-6">
                <Link
                  href={`/stories/${primaryStory.slug}`}
                  className="text-sm font-medium text-primary hover:text-primary-strong transition-colors"
                >
                  {isEnglish
                    ? `Read ${formattedName}'s full story →`
                    : `${formattedName} 작가의 이야기 더 읽기 →`}
                </Link>
              </p>
            )}
            {bioHistory && (
              <details className="mt-8">
                <summary className="cursor-pointer text-sm font-medium text-primary hover:text-primary-strong">
                  {isEnglish ? 'View biography & exhibitions' : '약력 및 전시 이력 보기'}
                </summary>
                <div className="mt-4 whitespace-pre-wrap text-sm text-charcoal-muted leading-relaxed">
                  {bioHistory}
                </div>
              </details>
            )}
          </div>
        </Section>
      )}

      {/* Gallery Section */}
      <Section variant="primary-surface" prevVariant="white">
        <div className="container-max">
          <ArtworkGalleryWithSort artworks={listArtworks} initialArtist={artistName} />
        </div>
      </Section>

      {/* 카테고리 바로가기 — 작가 페이지에서 카테고리 페이지로 내부 링크 연결 */}
      {(() => {
        const primaryCategory = artistArtworks[0]?.category;
        const categoryLinks = Object.keys(CATEGORY_EN_MAP)
          .map((cat) => ({
            cat,
            displayName: getCategoryLabel(cat, locale),
            path: `/artworks/category/${encodeURIComponent(cat)}`,
            isPrimary: cat === primaryCategory,
          }))
          .filter((c) => availableCategories.includes(c.cat));
        if (categoryLinks.length === 0) return null;
        return (
          <Section variant="white" prevVariant="primary-surface" className="pb-8">
            <div className="container-max">
              <p className="text-sm font-medium text-charcoal-soft mb-3">
                {isEnglish ? 'Browse by category' : '카테고리별 작품 보기'}
              </p>
              <div className="flex flex-wrap gap-2">
                {categoryLinks.map(({ cat, displayName, path, isPrimary }) => (
                  <Link
                    key={cat}
                    href={path}
                    className={`px-3 md:px-4 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                      isPrimary
                        ? 'border-primary bg-primary-surface text-primary-strong hover:bg-primary-surface'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {displayName}
                  </Link>
                ))}
              </div>
            </div>
          </Section>
        );
      })()}

      {/* 외부 보도/인터뷰 — 한겨례, MMCA, 달진닷컴, namu.wiki, Wikipedia 등 큐레이션된 자료.
          거장 작가(오윤·박재동·박불똥 등) 페이지에서 entity 신뢰도 + 사용자 dwell time 향상. */}
      {relatedArticles.length > 0 && (
        <Section variant="white" prevVariant="white" className="pb-8">
          <div className="container-max">
            <RelatedArticles articles={relatedArticles} locale={locale} />
          </div>
        </Section>
      )}

      {/* 관련 매거진 */}
      {relatedStories.length > 0 && (
        <Section
          variant="canvas"
          prevVariant={relatedArticles.length > 0 ? 'white' : 'white'}
          className="pb-8"
        >
          <div className="container-max">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-bold text-charcoal">
                {isEnglish ? 'Magazine' : '관련 매거진'}
              </h2>
              <Link
                href="/stories"
                className="text-sm font-medium text-primary hover:text-primary-strong transition-colors"
              >
                <span className="inline-flex items-center gap-1">
                  {isEnglish ? 'View all' : '전체 보기'}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {relatedStories.map((s, i) => {
                const storyTitle = isEnglish && s.title_en ? s.title_en : s.title;
                const storyExcerpt = isEnglish && s.excerpt_en ? s.excerpt_en : s.excerpt;
                return (
                  <Link
                    key={s.id}
                    href={`/stories/${s.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-gallery-hover motion-safe:opacity-0 motion-safe:animate-fade-in-up"
                    style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'forwards' }}
                  >
                    {s.thumbnail && (
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <SafeImage
                          src={s.thumbnail}
                          alt={storyTitle}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-sm font-bold text-charcoal line-clamp-2 group-hover:text-primary transition-colors duration-300">
                        {storyTitle}
                      </h3>
                      {storyExcerpt && (
                        <p className="text-xs text-charcoal-muted mt-2 line-clamp-2 leading-relaxed">
                          {storyExcerpt}
                        </p>
                      )}
                      <span className="text-xs text-charcoal-muted/60 mt-3 block">
                        {s.published_at}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </Section>
      )}

      {/* Campaign Banner */}
      <Section
        variant="white"
        prevVariant={relatedStories.length > 0 ? 'canvas-soft' : 'white'}
        className="pb-24 md:pb-32"
      >
        <GalleryCampaignBanner />
      </Section>
    </div>
  );
}
