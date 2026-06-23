import { buildBankTransferDisplay } from '@/lib/commerce/checkout/bank-transfer';
import {
  asOrderMetadataRecord,
  getBuyerLocaleFromOrderMetadata,
  isManualBankTransferMetadata,
} from '@/lib/commerce/order-metadata';

const ENV_KEYS = [
  'BANK_TRANSFER_BANK_NAME',
  'BANK_TRANSFER_ACCOUNT_NUMBER',
  'BANK_TRANSFER_HOLDER_NAME',
  'BANK_TRANSFER_DEADLINE_HOURS',
] as const;

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.BANK_TRANSFER_BANK_NAME = '테스트은행';
  process.env.BANK_TRANSFER_ACCOUNT_NUMBER = '123-456';
  process.env.BANK_TRANSFER_HOLDER_NAME = '테스트예금주';
  process.env.BANK_TRANSFER_DEADLINE_HOURS = '24';
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  process.env = originalEnv;
});

describe('order metadata helpers', () => {
  it('normalizes unknown metadata and detects locale/payment provider', () => {
    expect(asOrderMetadataRecord(null)).toEqual({});
    expect(asOrderMetadataRecord(['bad'])).toEqual({});
    expect(getBuyerLocaleFromOrderMetadata({ locale: 'en' })).toBe('en');
    expect(getBuyerLocaleFromOrderMetadata({ locale: 'ko' })).toBe('ko');
    expect(getBuyerLocaleFromOrderMetadata({ locale: 'ja' })).toBe('ko');
    expect(isManualBankTransferMetadata({ payment_provider: 'manual_bank_transfer' })).toBe(true);
    expect(isManualBankTransferMetadata({ payment_provider: 'domestic' })).toBe(false);
  });
});

describe('buildBankTransferDisplay', () => {
  it('prefers metadata bank transfer fields when present', () => {
    expect(
      buildBankTransferDisplay(
        {
          locale: 'ko',
          bank_transfer: {
            bankName: '메타은행',
            accountNumber: '999-999',
            holderName: '메타예금주',
            dueDate: '2026년 6월 24일 10:00까지',
          },
        },
        '2026-06-23T00:00:00.000Z'
      )
    ).toEqual({
      bankName: '메타은행',
      accountNumber: '999-999',
      holderName: '메타예금주',
      dueDate: '2026년 6월 24일 10:00까지',
    });
  });

  it('falls back to configured account values and computed due date', () => {
    const display = buildBankTransferDisplay(
      { locale: 'en', payment_provider: 'manual_bank_transfer' },
      '2026-06-23T00:00:00.000Z'
    );

    expect(display.bankName).toBe('테스트은행');
    expect(display.accountNumber).toBe('123-456');
    expect(display.holderName).toBe('테스트예금주');
    expect(display.dueDate).toMatch(/2026/);
  });
});
