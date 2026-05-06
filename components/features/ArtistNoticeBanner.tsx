import { getTranslations } from 'next-intl/server';
import ArtistNoticeCard from './ArtistNoticeCard';
import type { NoticeType } from '@/lib/artist-notice';

type Props = {
  type: NoticeType;
  message: string;
  className?: string;
};

/**
 * 작가 페이지·작품 상세 페이지의 server-side notice wrapper.
 * next-intl로 type 라벨을 fetch한 뒤 ArtistNoticeCard에 위임.
 * 관리자 미리보기 등 client-side에서는 ArtistNoticeCard를 직접 사용할 것.
 */
export default async function ArtistNoticeBanner({ type, message, className }: Props) {
  const t = await getTranslations('artistPage.notice');
  return <ArtistNoticeCard type={type} message={message} label={t(type)} className={className} />;
}
