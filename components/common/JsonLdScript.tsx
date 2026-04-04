import { escapeJsonLdForScript } from '@/lib/seo-utils';

interface JsonLdScriptProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function JsonLdScript({ data }: JsonLdScriptProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: escapeJsonLdForScript(JSON.stringify(data)),
      }}
    />
  );
}
