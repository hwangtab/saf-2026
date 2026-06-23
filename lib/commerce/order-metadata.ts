export type CommerceLocale = 'ko' | 'en';

export function asOrderMetadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

export function getBuyerLocaleFromOrderMetadata(metadata: unknown): CommerceLocale {
  return asOrderMetadataRecord(metadata).locale === 'en' ? 'en' : 'ko';
}

export function isManualBankTransferMetadata(metadata: unknown): boolean {
  return asOrderMetadataRecord(metadata).payment_provider === 'manual_bank_transfer';
}
