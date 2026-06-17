/** 오윤 40주기 추도식 행사 정보 단일 출처. 페이지·알림톡·이메일·admin이 공통 참조. */

export const OH_YOON_MEMORIAL_SLUG = 'oh-yoon-memorial' as const;

/** 공개 페이지 경로(locale 미포함). 토스 successUrl/failUrl·revalidatePath에 사용. */
export const OH_YOON_MEMORIAL_PATH = '/event/oh-yoon-memorial' as const;

/** admin 경로. */
export const OH_YOON_MEMORIAL_ADMIN_PATH = '/admin/event/oh-yoon-memorial' as const;

/** 1인 회비(원). 금액은 항상 서버에서 fee × party_size로 계산. */
export const OH_YOON_MEMORIAL_FEE = 30_000 as const;

/** 기본 정원(운전석 제외). admin에서 events.capacity로 조정 가능 — 이 값은 시드 초기값. */
export const OH_YOON_MEMORIAL_DEFAULT_CAPACITY = 44 as const;

/** pending(결제대기) 좌석 hold 유지 시간(분). */
export const OH_YOON_MEMORIAL_HOLD_MINUTES = 15 as const;

/**
 * 무통장입금(계좌이체) 안내 계좌. 작품 구매와 동일 계좌(한국스마트협동조합).
 * 신청 안내 화면·SMS·이메일이 공통 참조.
 */
export const OH_YOON_MEMORIAL_BANK = '기업은행 (IBK)' as const;
export const OH_YOON_MEMORIAL_BANK_ACCOUNT = '301-101031-04-095' as const;
export const OH_YOON_MEMORIAL_BANK_HOLDER = '한국스마트협동조합' as const;

/** 행사 일정(표시용). i18n 메시지가 아닌 구조 데이터 — 라벨은 메시지에서. */
export const OH_YOON_MEMORIAL_SCHEDULE = [
  { time: '09:30', key: 'depart' },
  { time: '11:00', key: 'ceremony' },
  { time: '12:00', key: 'end' },
  { time: '13:30', key: 'lunch' },
] as const;

/** 행사일 ISO(KST). */
export const OH_YOON_MEMORIAL_DATE = '2026-07-05' as const;

/**
 * 본인 자가환불 마감 — 행사 3일 전(7/2) 자정까지. 이후엔 사무국 문의.
 * 버스·식사 예약 사정상 임박 취소는 환불 어려움.
 */
export const OH_YOON_MEMORIAL_REFUND_DEADLINE = '2026-07-02T23:59:59+09:00' as const;
/** 환불 마감 표시용 라벨 (메시지 변수로 주입). */
export const OH_YOON_MEMORIAL_REFUND_DEADLINE_LABEL = '7월 2일' as const;
