/**
 * TossPayments v2 API request/response types.
 * Reference: https://docs.tosspayments.com/reference
 */

export interface TossConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export type TossPaymentStatus =
  | 'READY'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_DEPOSIT'
  | 'DONE'
  | 'CANCELED'
  | 'PARTIAL_CANCELED'
  | 'ABORTED'
  | 'EXPIRED';

export interface TossVirtualAccount {
  accountNumber: string;
  bankCode: string;
  bankName: string;
  dueDate: string;
  expired: boolean;
  settlementStatus: string;
  accountType: string;
  secret?: string;
}

export interface TossCard {
  number: string;
  installmentPlanMonths: number;
  isInterestFree: boolean;
  approveNo: string;
  useCardPoint: boolean;
  cardType: string;
  ownerType: string;
  acquireStatus: string;
}

export interface TossConfirmResponse {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: TossPaymentStatus;
  method: string;
  totalAmount: number;
  balanceAmount: number;
  currency: string;
  approvedAt: string;
  requestedAt: string;
  receipt?: { url: string };
  card?: TossCard;
  virtualAccount?: TossVirtualAccount;
  transfer?: {
    bankCode: string;
    settlementStatus: string;
  };
  mobilePhone?: {
    customerMobilePhone: string;
    settlementStatus: string;
  };
  [key: string]: unknown;
}

export interface TossErrorResponse {
  code: string;
  message: string;
}

export interface TossWebhookPaymentStatusChanged {
  eventType: 'PAYMENT_STATUS_CHANGED';
  createdAt: string;
  data: {
    paymentKey: string;
    orderId: string;
    status: string;
    approvedAt?: string;
  };
}

export interface TossWebhookDepositCallback {
  eventType: 'DEPOSIT_CALLBACK';
  createdAt: string;
  data: {
    paymentKey: string;
    orderId: string;
    paymentStatus: 'WAITING_FOR_DEPOSIT' | 'DONE' | 'CANCELED';
    secret: string;
    virtualAccountInfo?: {
      accountNumber: string;
      bankCode: string;
      dueDate: string;
    };
  };
}

export type TossWebhookPayload = TossWebhookPaymentStatusChanged | TossWebhookDepositCallback;

export interface TossCancelRequest {
  cancelReason: string;
  cancelAmount?: number;
  refundReceiveAccount?: {
    bank: string;
    accountNumber: string;
    holderName: string;
  };
  taxFreeAmount?: number;
  taxExemptionAmount?: number;
}

export interface TossCancelResponse {
  paymentKey: string;
  orderId: string;
  status: TossPaymentStatus;
  totalAmount: number;
  balanceAmount: number;
  cancelAmount?: number;
  cancels?: Array<{
    cancelAmount: number;
    cancelReason: string;
    canceledAt: string;
    transactionKey: string;
    refundableAmount: number;
    refundStatus: string;
  }>;
  [key: string]: unknown;
}

export type CancelResult =
  | { success: true; data: TossCancelResponse }
  | { success: false; error: TossErrorResponse };

export type OrderStatus =
  | 'pending_payment'
  | 'awaiting_deposit'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refund_requested'
  | 'refunded';
