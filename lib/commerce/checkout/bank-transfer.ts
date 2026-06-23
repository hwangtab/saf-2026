import { formatBankTransferDueDate, getBankTransferInfo } from '@/lib/payments/bank-transfer-info';
import {
  asOrderMetadataRecord,
  getBuyerLocaleFromOrderMetadata,
} from '@/lib/commerce/order-metadata';

export type BankTransferDisplay = {
  bankName: string;
  accountNumber: string;
  holderName: string;
  dueDate: string;
};

export function buildBankTransferDisplay(
  metadata: unknown,
  createdAt: string | null | undefined
): BankTransferDisplay {
  const meta = asOrderMetadataRecord(metadata);
  const bankTransfer =
    meta.bank_transfer &&
    typeof meta.bank_transfer === 'object' &&
    !Array.isArray(meta.bank_transfer)
      ? (meta.bank_transfer as Record<string, unknown>)
      : {};
  const fallback = getBankTransferInfo();
  const baseTime = createdAt ? new Date(createdAt).getTime() : NaN;
  const base = Number.isFinite(baseTime) ? baseTime : Date.now();
  const fallbackDueDate = formatBankTransferDueDate(
    new Date(base + fallback.deadlineHours * 60 * 60 * 1000),
    getBuyerLocaleFromOrderMetadata(metadata)
  );

  return {
    bankName:
      typeof bankTransfer.bankName === 'string' && bankTransfer.bankName.trim()
        ? bankTransfer.bankName
        : fallback.bankName,
    accountNumber:
      typeof bankTransfer.accountNumber === 'string' && bankTransfer.accountNumber.trim()
        ? bankTransfer.accountNumber
        : fallback.accountNumber,
    holderName:
      typeof bankTransfer.holderName === 'string' && bankTransfer.holderName.trim()
        ? bankTransfer.holderName
        : fallback.holderName,
    dueDate:
      typeof bankTransfer.dueDate === 'string' && bankTransfer.dueDate.trim()
        ? bankTransfer.dueDate
        : fallbackDueDate,
  };
}
