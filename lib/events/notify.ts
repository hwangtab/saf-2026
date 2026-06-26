import React from 'react';
import { render } from '@react-email/render';
import { sendSolapiAlimTalk, sendSolapiSms, type KakaoButton } from '@/lib/sms/solapi';
import { normalizeKoreanMobile } from '@/lib/sms/phone';
import { resendFetch } from '@/lib/notify';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import EventPaymentConfirmedEmail from '@/emails/event-payment-confirmed';
import EventWaitlistEmail from '@/emails/event-waitlist';
import EventWaitlistPaymentEmail from '@/emails/event-waitlist-payment';
import EventRefundedEmail from '@/emails/event-refunded';
import EventDepositPendingEmail from '@/emails/event-deposit-pending';
import {
  OH_YOON_MEMORIAL_BANK,
  OH_YOON_MEMORIAL_BANK_ACCOUNT,
  OH_YOON_MEMORIAL_BANK_HOLDER,
} from '@/content/events/oh-yoon-memorial';
import {
  EVENT_ALIMTALK_TEMPLATE_ENV,
  buildEventAlimTalkVariables,
  won,
  type EventNotifyType,
  type EventNotifyData,
} from './format';

export type { EventNotifyType, EventNotifyData };
export { EVENT_ALIMTALK_TEMPLATE_ENV, buildEventAlimTalkVariables };

function eventTemplateId(type: EventNotifyType): string {
  return process.env[EVENT_ALIMTALK_TEMPLATE_ENV[type]] ?? '';
}

/** 알림톡 실패 시 자동대체될 SMS 본문(템플릿 미승인 기간 fallback). 카카오 템플릿과 동일 톤. */
function buildEventSmsText(type: EventNotifyType, d: EventNotifyData): string {
  switch (type) {
    case 'payment_confirmed':
      return `[씨앗페] ${d.name}님, 오윤 40주기 추도식 신청이 완료되었습니다. (인원 ${d.partySize}명 / 회비 ${won(d.amount)}원 결제완료) 7월 5일(일) 09:30 인사동 수운회관 옆 출발.`;
    case 'waitlist':
      return `[씨앗페] ${d.name}님, 오윤 40주기 추도식 대기 신청이 접수되었습니다. 자리가 나면 순서대로 결제 안내를 드립니다.`;
    case 'waitlist_payment':
      return `[씨앗페] ${d.name}님, 추도식에 자리가 생겼습니다. (인원 ${d.partySize}명 / 회비 ${won(d.amount)}원) ${d.deadline ?? ''}까지 결제하시면 확정됩니다: ${d.paymentUrl ?? ''}`;
    case 'refunded':
      return `[씨앗페] ${d.name}님, 오윤 40주기 추도식 회비(${won(d.amount)}원)가 전액 환불 처리되었습니다. 자리가 마감되어 결제하신 금액을 돌려드립니다. 너른 양해 부탁드립니다.`;
    case 'deposit_pending':
      return `[씨앗페] ${d.name}님, 오윤 40주기 추도식 신청이 접수되었습니다. 아래 계좌로 회비 ${won(d.amount)}원(${d.partySize}명)을 입금해 주세요. ${OH_YOON_MEMORIAL_BANK} ${OH_YOON_MEMORIAL_BANK_ACCOUNT} (예금주 ${OH_YOON_MEMORIAL_BANK_HOLDER}). 입금자명은 신청자명과 동일하게. 입금 확인 후 확정됩니다.`;
  }
}

/** 행사 알림톡(우선) → 미승인/미설정 시 SMS 자동대체. never throw. */
export async function sendEventSms(
  phone: string | null | undefined,
  type: EventNotifyType,
  data: EventNotifyData,
  orderNo?: string
): Promise<{ ok: boolean; skipped: boolean }> {
  try {
    const to = normalizeKoreanMobile(phone);
    if (!to) return { ok: false, skipped: true };

    const text = buildEventSmsText(type, data);
    const templateId = eventTemplateId(type);
    const useAlimTalk = templateId.length > 0 && Boolean(process.env.SOLAPI_KAKAO_PF_ID);

    let buttons: KakaoButton[] | undefined;
    if (type === 'waitlist_payment' && data.paymentUrl) {
      buttons = [
        {
          buttonType: 'WL',
          buttonName: '결제하기',
          linkMo: data.paymentUrl,
          linkPc: data.paymentUrl,
        },
      ];
    }

    const result = useAlimTalk
      ? await sendSolapiAlimTalk({
          to,
          text,
          templateId,
          variables: buildEventAlimTalkVariables(type, data),
          buttons,
        })
      : await sendSolapiSms({ to, text });

    try {
      const admin = createSupabaseAdminClient();
      await admin.from('sms_logs').insert({
        order_no: orderNo ?? null,
        to_phone: to,
        type: `event_${type}`,
        provider: useAlimTalk ? 'kakao' : 'solapi',
        provider_message_id: result.messageId ?? null,
        status: result.ok ? 'sent' : 'failed',
        segment: result.segment ?? null,
        error: result.ok ? null : (result.error ?? 'unknown'),
      });
    } catch (logErr) {
      console.error(`[event-sms:${type}] log insert failed:`, logErr);
    }

    return { ok: result.ok, skipped: false };
  } catch (err) {
    console.error(`[event-sms:${type}] failed:`, err);
    return { ok: false, skipped: false };
  }
}

const EVENT_EMAIL_SUBJECTS: Record<EventNotifyType, string> = {
  payment_confirmed: '[씨앗페] 오윤 40주기 추도식 신청이 완료되었습니다',
  waitlist: '[씨앗페] 오윤 40주기 추도식 대기 신청 접수',
  waitlist_payment: '[씨앗페] 오윤 40주기 추도식 좌석 안내',
  refunded: '[씨앗페] 오윤 40주기 추도식 회비 환불 안내',
  deposit_pending: '[씨앗페] 오윤 40주기 추도식 입금 안내',
};

/** 행사 이메일(이메일 입력 시에만). never throw. */
export async function sendEventEmail(
  to: string | null | undefined,
  type: EventNotifyType,
  data: EventNotifyData
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !to) return;

  try {
    let el: React.ReactElement;
    if (type === 'payment_confirmed') {
      el = React.createElement(EventPaymentConfirmedEmail, {
        name: data.name,
        partySize: data.partySize,
        amount: data.amount,
        orderNo: data.orderNo,
      });
    } else if (type === 'waitlist') {
      el = React.createElement(EventWaitlistEmail, {
        name: data.name,
        partySize: data.partySize,
        amount: data.amount,
      });
    } else if (type === 'refunded') {
      el = React.createElement(EventRefundedEmail, {
        name: data.name,
        partySize: data.partySize,
        amount: data.amount,
        orderNo: data.orderNo,
      });
    } else if (type === 'deposit_pending') {
      el = React.createElement(EventDepositPendingEmail, {
        name: data.name,
        partySize: data.partySize,
        amount: data.amount,
        orderNo: data.orderNo,
      });
    } else {
      el = React.createElement(EventWaitlistPaymentEmail, {
        name: data.name,
        partySize: data.partySize,
        amount: data.amount,
        deadline: data.deadline,
        paymentUrl: data.paymentUrl,
      });
    }

    const html = await render(el);
    // 다른 발송기와 동일하게 5초 타임아웃 + 429/5xx·네트워크 1회 재시도로 통일.
    // bare fetch는 after() 안에서 타임아웃 없이 멈춰 같은 배치의 SMS/관리자 알림 예산까지 잠식한다.
    await resendFetch(
      { apiKey, from, to, subject: EVENT_EMAIL_SUBJECTS[type], html },
      `[event-email:${type}]`
    );
  } catch (err) {
    console.error(`[event-email:${type}] failed:`, err);
  }
}
