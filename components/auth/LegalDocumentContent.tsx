'use client';

import { usePathname } from 'next/navigation';
import { type LegalDocument } from '@/lib/legal-documents';
import { resolveClientLocale } from '@/lib/client-locale';
import { formatEffectiveDateForLocale } from '@/lib/utils';

type LegalDocumentContentProps = {
  document: LegalDocument;
};

const titleMapForEnglish: Record<string, string> = {
  이용약관: 'Terms of Service',
  개인정보처리방침: 'Privacy Policy',
  '출품자 전시위탁 계약서': 'Exhibitor Consignment Agreement',
  '온라인전시 및 판매위탁 계약서': 'Online Exhibition and Sales Consignment Agreement',
};

const hasKoreanText = (text: string) => /[가-힣]/.test(text);

const isDocumentKoreanHeavy = (document: LegalDocument) => {
  if (hasKoreanText(document.title) || hasKoreanText(document.effectiveDate)) return true;
  if (document.version && hasKoreanText(document.version)) return true;
  if (document.preamble?.some((line) => hasKoreanText(line))) return true;
  if (document.appendix?.some((line) => hasKoreanText(line))) return true;

  return document.sections.some((section) => {
    if (hasKoreanText(section.title)) return true;
    if (section.paragraphs?.some((paragraph) => hasKoreanText(paragraph))) return true;
    if (section.bullets?.some((bullet) => hasKoreanText(bullet))) return true;
    if (
      section.subsections?.some(
        (sub) => hasKoreanText(sub.text) || sub.bullets?.some((b) => hasKoreanText(b))
      )
    ) {
      return true;
    }
    if (section.table) {
      if (section.table.headers.some((header) => hasKoreanText(header))) return true;
      if (section.table.rows.some((row) => row.some((cell) => hasKoreanText(cell)))) return true;
    }
    return false;
  });
};

export function LegalDocumentContent({ document }: LegalDocumentContentProps) {
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const effectiveDateDisplay = formatEffectiveDateForLocale(document.effectiveDate, locale);
  const copy =
    locale === 'en'
      ? {
          effectiveDate: 'Effective date',
          version: 'Version',
          appendix: 'Appendix',
        }
      : {
          effectiveDate: '시행일',
          version: '버전',
          appendix: '부칙',
        };

  const isKoreanOnlyInEnglish = locale === 'en' && isDocumentKoreanHeavy(document);

  if (isKoreanOnlyInEnglish) {
    return (
      <article className="space-y-4 text-xs leading-6 text-gray-700">
        <header className="space-y-1 border-b border-gray-200 pb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            {titleMapForEnglish[document.title] || 'Legal Document'}
          </h3>
          <p className="text-gray-500">
            {copy.effectiveDate}: {effectiveDateDisplay}
          </p>
          {document.version && (
            <p className="text-gray-500">
              {copy.version}: {document.version}
            </p>
          )}
        </header>
        <div className="space-y-2 rounded-md bg-amber-50 p-3 text-amber-900">
          <p>
            This document is currently available in Korean only. Please review the Korean original
            text before agreeing.
          </p>
          <p>
            If you need assistance, contact support and we will help guide you through the Korean
            version.
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="space-y-4 text-xs leading-6 text-gray-700">
      <header className="space-y-1 border-b border-gray-200 pb-3">
        <h3 className="text-sm font-semibold text-gray-900">{document.title}</h3>
        <p className="text-gray-500">
          {copy.effectiveDate}: {effectiveDateDisplay}
        </p>
        {document.version && (
          <p className="text-gray-500">
            {copy.version}: {document.version}
          </p>
        )}
      </header>

      {document.preamble && (
        <div className="space-y-2 rounded-md bg-gray-50 p-3 text-gray-600">
          {document.preamble.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}

      {document.sections.map((section) => (
        <section key={section.title} className="space-y-2">
          <h4 className="font-semibold text-gray-900">{section.title}</h4>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.bullets && (
            <ul className="list-disc space-y-1 pl-4">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
          {section.subsections?.map((sub, idx) => (
            <div key={idx} className="pl-4">
              <p>{sub.text}</p>
              {sub.bullets && (
                <ul className="list-disc space-y-1 pl-4">
                  {sub.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {section.table && (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {section.table.headers.map((header) => (
                      <th
                        key={header}
                        className="border border-gray-200 px-2 py-1.5 text-left font-semibold text-gray-700"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="even:bg-gray-50">
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="border border-gray-200 px-2 py-1.5 text-gray-600"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      {document.appendix && (
        <section className="space-y-1 border-t border-gray-200 pt-3">
          <h4 className="font-semibold text-gray-900">{copy.appendix}</h4>
          {document.appendix.map((line) => (
            <p key={line} className="text-gray-600">
              {line}
            </p>
          ))}
        </section>
      )}
    </article>
  );
}
