import { escapeJsonLdForScript } from '@/lib/constants';

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
