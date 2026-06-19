export function getRevenueFocusScopeLabel({
  evidenceLabel,
  periodLabel,
  compareBaseLabel,
}: {
  evidenceLabel: string | null | undefined;
  periodLabel: string;
  compareBaseLabel: string;
}) {
  const normalizedEvidenceLabel = evidenceLabel?.trim();
  if (normalizedEvidenceLabel) return normalizedEvidenceLabel;
  return `${periodLabel} ${compareBaseLabel}`;
}
