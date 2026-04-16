type AppLocale = 'ko' | 'en';

const TOAST_TRANSLATIONS: Record<string, string> = {
  '작품을 삭제했습니다.': 'Artwork deleted.',
  '작품이 삭제되었습니다.': 'Artwork deleted.',
  '작품 상태를 변경했습니다.': 'Artwork status updated.',
  '작품을 공개 처리했습니다.': 'Artwork is now visible.',
  '작품을 숨김 처리했습니다.': 'Artwork is now hidden.',
  '선택한 작품 상태를 변경했습니다.': 'Selected artwork statuses updated.',
  '선택한 작품을 공개 처리했습니다.': 'Selected artworks are now visible.',
  '선택한 작품을 숨김 처리했습니다.': 'Selected artworks are now hidden.',
  '선택한 작품을 삭제했습니다.': 'Selected artworks deleted.',
  '작품 삭제 중 오류가 발생했습니다.': 'An error occurred while deleting artwork.',
  '상태 변경 중 오류가 발생했습니다.': 'An error occurred while updating status.',
  '공개 상태 변경 중 오류가 발생했습니다.': 'An error occurred while updating visibility status.',
  '일괄 상태 변경 중 오류가 발생했습니다.': 'An error occurred while updating statuses in batch.',
  '일괄 공개 상태 변경 중 오류가 발생했습니다.':
    'An error occurred while updating visibility in batch.',
  '일괄 삭제 중 오류가 발생했습니다.': 'An error occurred during batch delete.',
  '필터 충돌을 방지하기 위해 권한 필터를 자동 해제했습니다.':
    'Role filter was cleared automatically to prevent conflicts.',
  '연결할 미연결 작가를 선택해 주세요.': 'Please select an unlinked artist to connect.',
  '신청을 거절하고 계정을 정지했습니다.': 'Application rejected and account suspended.',
  '출품자 신청을 승인했습니다.': 'Exhibitor application approved.',
  '작가 신청을 승인했습니다.': 'Artist application approved.',
  '사용자를 다시 활성화했습니다.': 'User has been reactivated.',
  'FAQ를 삭제했습니다.': 'FAQ deleted.',
  'FAQ를 저장했습니다.': 'FAQ saved.',
  'FAQ를 추가했습니다.': 'FAQ added.',
  '뉴스를 삭제했습니다.': 'News item deleted.',
  '뉴스를 저장했습니다.': 'News item saved.',
  '뉴스를 추가했습니다.': 'News item added.',
  '영상을 삭제했습니다.': 'Video deleted.',
  '영상을 저장했습니다.': 'Video saved.',
  '영상을 추가했습니다.': 'Video added.',
  '추천사를 삭제했습니다.': 'Testimonial deleted.',
  '추천사를 저장했습니다.': 'Testimonial saved.',
  '추천사를 추가했습니다.': 'Testimonial added.',
  '메모가 저장되었습니다.': 'Memo saved.',
  '메모 저장 중 오류가 발생했습니다.': 'An error occurred while saving memo.',
  '상태가 변경되었습니다.': 'Status updated.',
  '복구가 완료되었습니다.': 'Restore completed.',
  '구매 링크 누락 작품이 없습니다.': 'No artworks with missing purchase links.',
  '일괄 동기화 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.':
    'An error occurred during batch sync. Please try again shortly.',
  '휴지통 항목을 복원했습니다.': 'Trash item restored.',
  '휴지통 항목을 영구 삭제했습니다.': 'Trash item permanently deleted.',
  '저장 중 오류가 발생했습니다.': 'An error occurred while saving.',
  '이미지 저장 중 오류가 발생했습니다.': 'An error occurred while saving image.',
  '필수 정보를 입력해주세요.': 'Please fill in required fields.',
  '작가 정보가 저장되었습니다.': 'Artist information saved.',
  '작가가 생성되었습니다.': 'Artist created.',
  '작가가 생성되었습니다. 작품 등록 화면으로 돌아갑니다.':
    'Artist created. Returning to artwork registration.',
  '프로필 이미지가 저장되었습니다.': 'Profile image saved.',
  '사용자 연결 중 오류가 발생했습니다.': 'An error occurred while linking user.',
  '사용자 계정 연결이 해제되었습니다.': 'User account link removed.',
  '연결 해제 중 오류가 발생했습니다.': 'An error occurred while unlinking account.',
  '판매 금액을 입력해주세요.': 'Please enter a sale amount.',
  '삭제 중 오류가 발생했습니다.': 'An error occurred while deleting.',
  '삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.':
    'An error occurred while deleting. Please try again shortly.',
  '저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.':
    'An error occurred while saving. Please try again shortly.',
  '이미지 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.':
    'An error occurred while saving image. Please try again shortly.',
  '한정판은 에디션 수량을 입력해주세요.': 'For limited editions, please enter edition quantity.',
};

const ROLE_CHANGE_REGEX = /^권한을\s+(.+?)로\s+변경했습니다\.$/;
const PARTIAL_SUCCESS_REGEX = /^부분 성공:\s*(\d+)건 성공,\s*(\d+)건 롤백되었습니다\.$/;
const EN_ROLE_CHANGE_REGEX = /^Role changed to\s+(.+?)\.$/;
const EN_PARTIAL_SUCCESS_REGEX = /^Partial success:\s*(\d+)\s+succeeded,\s*(\d+)\s+rolled back\.$/;

const REVERSE_TOAST_TRANSLATIONS = Object.fromEntries(
  Object.entries(TOAST_TRANSLATIONS).map(([ko, en]) => [en, ko])
);

export function localizeToastMessage(message: string, locale: AppLocale): string {
  if (locale === 'ko') {
    const reversed = REVERSE_TOAST_TRANSLATIONS[message];
    if (reversed) {
      return reversed;
    }

    const roleMatch = message.match(EN_ROLE_CHANGE_REGEX);
    if (roleMatch) {
      return `권한을 ${roleMatch[1]}로 변경했습니다.`;
    }

    const partialMatch = message.match(EN_PARTIAL_SUCCESS_REGEX);
    if (partialMatch) {
      return `부분 성공: ${partialMatch[1]}건 성공, ${partialMatch[2]}건 롤백되었습니다.`;
    }

    return message;
  }

  const mapped = TOAST_TRANSLATIONS[message];
  if (mapped) {
    return mapped;
  }

  const roleMatch = message.match(ROLE_CHANGE_REGEX);
  if (roleMatch) {
    return `Role changed to ${roleMatch[1]}.`;
  }

  const partialMatch = message.match(PARTIAL_SUCCESS_REGEX);
  if (partialMatch) {
    return `Partial success: ${partialMatch[1]} succeeded, ${partialMatch[2]} rolled back.`;
  }

  return message;
}
