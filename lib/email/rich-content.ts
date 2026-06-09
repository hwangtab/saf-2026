import sanitizeHtml from 'sanitize-html';

const PERSONALIZATION_TOKEN = /\{\{\s*name\s*\}\}/g;

const ALLOWED_TAGS = [
  'p',
  'h2',
  'h3',
  'strong',
  'em',
  'u',
  'a',
  'ul',
  'ol',
  'li',
  'hr',
  'table',
  'tbody',
  'tr',
  'td',
  'th',
  'img',
  'br',
  'div',
  'span',
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeText(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

function addEmailStyles(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      '*': ['style', 'data-layout'],
      a: ['href', 'target', 'rel', 'style'],
      img: ['src', 'alt', 'width', 'height', 'style'],
      td: ['colspan', 'rowspan', 'width', 'style'],
      th: ['colspan', 'rowspan', 'width', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    allowedStyles: {
      '*': {
        'text-align': [/^(left|right|center)$/],
        width: [/^\d{1,4}(px|%)$/],
        margin: [/^[\d\s.]+(px|em|rem|%)?( [\d\s.]+(px|em|rem|%)?){0,3}$/],
        padding: [/^[\d\s.]+(px|em|rem|%)?( [\d\s.]+(px|em|rem|%)?){0,3}$/],
        'font-size': [/^\d{1,3}px$/],
        'font-weight': [/^\d{3}$/],
        'line-height': [/^\d(\.\d+)?$/],
        color: [/^#[0-9A-Fa-f]{6}$/],
        background: [/^#[0-9A-Fa-f]{6}$/],
        border: [/^\dpx solid #[0-9A-Fa-f]{6}$/],
        'border-collapse': [/^collapse$/],
        'border-radius': [/^\d{1,2}px$/],
        display: [/^(block|inline-block|table)$/],
        'max-width': [/^\d{1,3}%$/],
        height: [/^(auto|\d{1,4}px)$/],
        'table-layout': [/^fixed$/],
        'text-decoration': [/^underline$/],
      },
    },
    transformTags: {
      p: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          style: attribs.style || 'margin:0 0 14px;font-size:14px;line-height:1.7;color:#555E67;',
        },
      }),
      h2: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          style: attribs.style || 'margin:0 0 14px;font-size:22px;line-height:1.35;color:#1F2428;',
        },
      }),
      h3: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          style: attribs.style || 'margin:0 0 12px;font-size:17px;line-height:1.4;color:#1F2428;',
        },
      }),
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
          style: 'color:#2176FF;text-decoration:underline;',
        },
      }),
      table: sanitizeHtml.simpleTransform('table', {
        style: 'width:100%;border-collapse:collapse;margin:18px 0;border:1px solid #E5E7EB;',
      }),
      td: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          style:
            attribs.style ||
            'padding:10px;border:1px solid #E5E7EB;font-size:14px;line-height:1.6;color:#555E67;',
        },
      }),
      th: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          style:
            attribs.style ||
            'padding:10px;border:1px solid #E5E7EB;font-size:14px;line-height:1.6;color:#1F2428;font-weight:600;',
        },
      }),
      img: (tagName, attribs) => {
        const nextAttribs: Record<string, string> = {
          src: attribs.src,
          alt: attribs.alt ?? '',
          style: 'display:block;max-width:100%;height:auto;margin:16px auto;',
        };
        if (attribs.width) nextAttribs.width = attribs.width;
        if (attribs.height) nextAttribs.height = attribs.height;
        return { tagName, attribs: nextAttribs };
      },
      div: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...(attribs['data-layout'] ? { 'data-layout': attribs['data-layout'] } : {}),
          style:
            attribs['data-layout'] === 'columns'
              ? 'display:table;width:100%;table-layout:fixed;margin:16px 0;'
              : 'margin:0 0 14px;',
        },
      }),
    },
  });
}

export function sanitizeRichEmailHtml(html: string): string {
  const sanitized = addEmailStyles(html);
  return sanitized.replace(/<p([^>]*)><\/p>/gi, '<p$1>&nbsp;</p>').trim();
}

export function htmlToEmailText(html: string): string {
  const withBreaks = sanitizeHtml(html, {
    allowedTags: ['h2', 'h3', 'p', 'li', 'tr', 'br', 'td', 'th'],
    allowedAttributes: {},
  });

  return withBreaks
    .replace(/<\/(h2|h3|p|li|tr)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function legacyBodyMdToRichEmail(bodyMd: string): {
  bodyHtml: string;
  bodyText: string;
} {
  const bodyText = normalizeText(bodyMd);
  const bodyHtml = sanitizeRichEmailHtml(
    bodyText
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
      .join('')
  );

  return { bodyHtml, bodyText };
}

export function personalizeRichEmailHtml(html: string, name: string | null): string {
  return html.replace(PERSONALIZATION_TOKEN, escapeHtml(name?.trim() || '회원'));
}

export function personalizeRichEmailText(text: string, name: string | null): string {
  return text.replace(PERSONALIZATION_TOKEN, name?.trim() || '회원');
}

export function hasMeaningfulRichEmailBody(html: string, text?: string): boolean {
  const plainText = (text ?? htmlToEmailText(html)).replace(/\s+/g, ' ').trim();
  return plainText.length > 0 || /<img\s/i.test(html);
}

export function prepareRichEmailContent(input: { bodyHtml: string; bodyText?: string | null }): {
  bodyHtml: string;
  bodyText: string;
} {
  const bodyHtml = sanitizeRichEmailHtml(input.bodyHtml);
  const bodyText = normalizeText(input.bodyText ?? htmlToEmailText(bodyHtml));
  return { bodyHtml, bodyText };
}

export function validateAssetImageUrl(url: string, siteUrl?: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (!parsed.pathname.includes('/storage/v1/object/public/assets/email-broadcasts/')) {
      return false;
    }
    if (!siteUrl) return true;
    const siteHost = new URL(siteUrl).host;
    return parsed.host === siteHost || parsed.host.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

export const EMAIL_IMAGE_UPLOAD = {
  maxBytes: 2 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
} as const;
