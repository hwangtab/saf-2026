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

/** 행사 일정(표시용). i18n 메시지가 아닌 구조 데이터 — 라벨은 메시지에서. */
export const OH_YOON_MEMORIAL_SCHEDULE = [
  { time: '09:30', key: 'depart' },
  { time: '11:00', key: 'ceremony' },
  { time: '12:00', key: 'end' },
  { time: '13:30', key: 'lunch' },
] as const;

/** 행사일 ISO(KST). */
export const OH_YOON_MEMORIAL_DATE = '2026-07-05' as const;
