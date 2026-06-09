import {
  htmlToEmailText,
  legacyBodyMdToRichEmail,
  personalizeRichEmailHtml,
  sanitizeRichEmailHtml,
} from '@/lib/email/rich-content';

describe('rich email content', () => {
  it('converts legacy paragraph text into html and text bodies', () => {
    const result = legacyBodyMdToRichEmail('안녕하세요 {{name}}\n\n두 번째 문단입니다.');

    expect(result.bodyHtml).toContain('>안녕하세요 {{name}}</p>');
    expect(result.bodyHtml).toContain('>두 번째 문단입니다.</p>');
    expect(result.bodyText).toBe('안녕하세요 {{name}}\n\n두 번째 문단입니다.');
  });

  it('removes unsafe tags, handlers, and URL schemes', () => {
    const result = sanitizeRichEmailHtml(
      '<p onclick="alert(1)">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a><iframe src="https://example.com"></iframe>'
    );

    expect(result).toContain('<p');
    expect(result).toContain('Hi');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('<iframe');
  });

  it('keeps email-safe table, layout, and uploaded image markup', () => {
    const result = sanitizeRichEmailHtml(`
      <div data-layout="columns"><p style="text-align:center">A</p><p>B</p></div>
      <table><tbody><tr><td style="width:50%">One</td><td>Two</td></tr></tbody></table>
      <img src="https://example.supabase.co/storage/v1/object/public/assets/email-broadcasts/a/x.png" alt="작품" width="640" onerror="x" />
    `);

    expect(result).toContain('data-layout="columns"');
    expect(result).toContain('<table');
    expect(result).toContain('<td');
    expect(result).toContain('<img');
    expect(result).toContain('alt="작품"');
    expect(result).toContain('width="640"');
    expect(result).not.toContain('onerror');
  });

  it('personalizes tokens inside rich html and plain text', () => {
    expect(personalizeRichEmailHtml('<p>{{name}}님, 안녕하세요</p>', '김작가')).toContain(
      '김작가님'
    );
    expect(personalizeRichEmailHtml('<p>{{name}}</p>', null)).toContain('회원');
  });

  it('extracts a useful text body from rich html', () => {
    expect(htmlToEmailText('<h2>제목</h2><p>첫 문단</p><ul><li>항목</li></ul>')).toBe(
      '제목\n\n첫 문단\n\n항목'
    );
  });
});
