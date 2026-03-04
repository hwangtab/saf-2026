import { type LegalDocument } from '@/lib/legal-documents';

type LegalDocumentContentProps = {
  document: LegalDocument;
};

export function LegalDocumentContent({ document }: LegalDocumentContentProps) {
  return (
    <article className="space-y-4 text-xs leading-6 text-gray-700">
      <header className="space-y-1 border-b border-gray-200 pb-3">
        <h3 className="text-sm font-semibold text-gray-900">{document.title}</h3>
        <p className="text-gray-500">시행일: {document.effectiveDate}</p>
        {document.version && <p className="text-gray-500">약관 버전: {document.version}</p>}
      </header>

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
        </section>
      ))}
    </article>
  );
}
