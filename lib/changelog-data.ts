import fs from 'fs';
import path from 'path';
import {
  sanitizeNullableSingleLineTextForRscPayload,
  sanitizeNullableTextForRscPayload,
  sanitizeSingleLineTextForRscPayload,
} from '@/lib/utils/text-sanitizer';
import { getScopeLabel, TYPE_CONFIG, getDisplayTitle } from '@/lib/changelog';
import type { ChangelogEntry } from '@/types';

export type PublicChangelogEntry = {
  date: string;
  type: ChangelogEntry['type'];
  scopeLabel: string | null;
  title: string;
  typeLabel: string;
};

export function loadChangelog(): ChangelogEntry[] {
  try {
    const filePath = path.join(process.cwd(), 'content', 'changelog.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as ChangelogEntry[];
    return parsed.map((entry) => ({
      ...entry,
      hash: sanitizeSingleLineTextForRscPayload(entry.hash),
      scope: sanitizeNullableSingleLineTextForRscPayload(entry.scope),
      subject: sanitizeSingleLineTextForRscPayload(entry.subject),
      summary: sanitizeNullableSingleLineTextForRscPayload(entry.summary),
      body: sanitizeNullableTextForRscPayload(entry.body),
      date: sanitizeSingleLineTextForRscPayload(entry.date),
      author: sanitizeSingleLineTextForRscPayload(entry.author),
    }));
  } catch (error) {
    console.error('[changelog-data] Changelog loading failed:', error);
    return [];
  }
}

export function toPublicEntries(entries: ChangelogEntry[]): PublicChangelogEntry[] {
  return entries.map((entry) => ({
    date: entry.date,
    type: entry.type,
    scopeLabel: getScopeLabel(entry.scope),
    title: getDisplayTitle(entry),
    typeLabel: TYPE_CONFIG[entry.type]?.label ?? entry.type,
  }));
}
