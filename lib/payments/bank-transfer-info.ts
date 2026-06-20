export type BankTransferInfo = {
  bankName: string;
  accountNumber: string;
  holderName: string;
  deadlineHours: number;
};

const DEFAULT_BANK_TRANSFER_INFO: BankTransferInfo = {
  bankName: '기업은행 (IBK)',
  accountNumber: '301-101031-04-095',
  holderName: '한국스마트협동조합',
  deadlineHours: 24,
};

function positiveIntegerOrDefault(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function getBankTransferInfo(env: NodeJS.ProcessEnv = process.env): BankTransferInfo {
  return {
    bankName: env.BANK_TRANSFER_BANK_NAME?.trim() || DEFAULT_BANK_TRANSFER_INFO.bankName,
    accountNumber:
      env.BANK_TRANSFER_ACCOUNT_NUMBER?.trim() || DEFAULT_BANK_TRANSFER_INFO.accountNumber,
    holderName: env.BANK_TRANSFER_HOLDER_NAME?.trim() || DEFAULT_BANK_TRANSFER_INFO.holderName,
    deadlineHours: positiveIntegerOrDefault(
      env.BANK_TRANSFER_DEADLINE_HOURS,
      DEFAULT_BANK_TRANSFER_INFO.deadlineHours
    ),
  };
}

export function formatBankTransferDueDate(date: Date, locale: 'ko' | 'en'): string {
  return locale === 'ko'
    ? date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    : date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
}
