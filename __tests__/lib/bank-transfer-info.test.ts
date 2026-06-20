import { formatBankTransferDueDate, getBankTransferInfo } from '@/lib/payments/bank-transfer-info';

describe('bank transfer info', () => {
  it('returns the current SAF default account when env is absent', () => {
    expect(getBankTransferInfo({} as NodeJS.ProcessEnv)).toEqual({
      bankName: '기업은행 (IBK)',
      accountNumber: '301-101031-04-095',
      holderName: '한국스마트협동조합',
      deadlineHours: 24,
    });
  });

  it('allows production env to override account info from one source', () => {
    expect(
      getBankTransferInfo({
        BANK_TRANSFER_BANK_NAME: '신한은행',
        BANK_TRANSFER_ACCOUNT_NUMBER: '110-000-000000',
        BANK_TRANSFER_HOLDER_NAME: '씨앗페',
        BANK_TRANSFER_DEADLINE_HOURS: '48',
      } as NodeJS.ProcessEnv)
    ).toEqual({
      bankName: '신한은행',
      accountNumber: '110-000-000000',
      holderName: '씨앗페',
      deadlineHours: 48,
    });
  });

  it('formats due date in KST for Korean and English messages', () => {
    const date = new Date('2026-06-20T05:00:00.000Z');

    expect(formatBankTransferDueDate(date, 'ko')).toContain('2026');
    expect(formatBankTransferDueDate(date, 'en')).toContain('2026');
  });
});
