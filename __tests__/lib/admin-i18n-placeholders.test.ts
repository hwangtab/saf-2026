import enAdminMessages from '@/messages/en.admin.json';
import koAdminMessages from '@/messages/ko.admin.json';

type AdminArtworkMessages = typeof koAdminMessages.admin.artworks;

const render = (
  messages: AdminArtworkMessages,
  key: keyof AdminArtworkMessages,
  values: Record<string, string | number>
) => {
  let output = '';
  let quoted = false;
  const message = messages[key];

  for (let i = 0; i < message.length; i += 1) {
    const char = message[i];
    if (char === "'") {
      quoted = !quoted;
      continue;
    }

    if (!quoted && char === '{') {
      const end = message.indexOf('}', i);
      if (end !== -1) {
        const placeholder = message.slice(i + 1, end).trim();
        if (placeholder in values) {
          output += String(values[placeholder]);
          i = end;
          continue;
        }
      }
    }

    output += char;
  }

  return output;
};

describe('admin artwork confirmation i18n placeholders', () => {
  it('renders the Korean artwork delete title instead of a literal placeholder', () => {
    const rendered = render(koAdminMessages.admin.artworks, 'deleteConfirmDescription', {
      title: '푸른 산책',
    });

    expect(rendered).toContain('푸른 산책');
    expect(rendered).not.toContain('{title}');
  });

  it('renders the English artwork delete title instead of a literal placeholder', () => {
    const rendered = render(enAdminMessages.admin.artworks, 'deleteConfirmDescription', {
      title: 'Blue Walk',
    });

    expect(rendered).toContain('Blue Walk');
    expect(rendered).not.toContain('{title}');
  });

  it('renders Korean tag and status confirmation placeholders', () => {
    expect(
      render(koAdminMessages.admin.artworks, 'archiveAdminTagDescription', {
        tag: '전시 후보',
      })
    ).toContain('전시 후보');
    expect(
      render(koAdminMessages.admin.artworks, 'deleteAdminTagDescription', {
        tag: '전시 후보',
      })
    ).toContain('전시 후보');
    expect(
      render(koAdminMessages.admin.artworks, 'batchStatusDescription', {
        count: 2,
        status: '판매완료',
      })
    ).toContain('판매완료');
  });

  it('renders English tag and status confirmation placeholders', () => {
    expect(
      render(enAdminMessages.admin.artworks, 'archiveAdminTagDescription', {
        tag: 'Featured',
      })
    ).toContain('Featured');
    expect(
      render(enAdminMessages.admin.artworks, 'deleteAdminTagDescription', {
        tag: 'Featured',
      })
    ).toContain('Featured');
    expect(
      render(enAdminMessages.admin.artworks, 'batchStatusDescription', {
        count: 2,
        status: 'Sold',
      })
    ).toContain('Sold');
  });
});
