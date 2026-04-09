import {
  createBreadcrumbSchema,
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateFAQSchema,
  generateVideoSchema,
  generateExhibitionSchema,
  generateCampaignSchema,
  generateSpeakableSchema,
  generateArtworkJsonLd,
  escapeJsonLdForScript,
  generateClaimReviewSchema,
  generateSAFClaimReviews,
  generateHowToSchema,
  generateArtworkMetadata,
  generateArtworkPurchaseHowTo,
  generateArtworkPurchaseFAQ,
  generateMemberJoinHowTo,
  generateQAPageSchema,
  generateSAFCoreQA,
} from '@/lib/schemas';

describe('createBreadcrumbSchema', () => {
  it('should produce a BreadcrumbList with correct @type', () => {
    const schema = createBreadcrumbSchema([{ name: '홈', url: 'https://www.saf2026.com' }]);
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('BreadcrumbList');
  });

  it('should assign 1-based positions to each item', () => {
    const schema = createBreadcrumbSchema([
      { name: '홈', url: 'https://www.saf2026.com' },
      { name: '출품작', url: 'https://www.saf2026.com/artworks' },
      { name: '작품 상세', url: 'https://www.saf2026.com/artworks/1' },
    ]);
    const items = schema.itemListElement;
    expect(items).toHaveLength(3);
    expect(items[0].position).toBe(1);
    expect(items[1].position).toBe(2);
    expect(items[2].position).toBe(3);
  });

  it('should set correct name and item URL for each ListItem', () => {
    const schema = createBreadcrumbSchema([
      { name: '홈', url: 'https://www.saf2026.com' },
      { name: '뉴스', url: 'https://www.saf2026.com/news' },
    ]);
    expect(schema.itemListElement[0]['@type']).toBe('ListItem');
    expect(schema.itemListElement[0].name).toBe('홈');
    expect(schema.itemListElement[0].item).toBe('https://www.saf2026.com');
    expect(schema.itemListElement[1].name).toBe('뉴스');
    expect(schema.itemListElement[1].item).toBe('https://www.saf2026.com/news');
  });

  it('should return an empty itemListElement for no items', () => {
    const schema = createBreadcrumbSchema([]);
    expect(schema.itemListElement).toEqual([]);
  });

  it('should normalize relative URLs to absolute URLs', () => {
    const schema = createBreadcrumbSchema([
      { name: '홈', url: '/' },
      { name: '출품작', url: '/artworks' },
      { name: '카테고리', url: 'artworks/category/회화' },
    ]);

    expect(schema.itemListElement[0].item).toBe('https://www.saf2026.com');
    expect(schema.itemListElement[1].item).toBe('https://www.saf2026.com/artworks');
    expect(schema.itemListElement[2].item).toBe(
      'https://www.saf2026.com/artworks/category/%ED%9A%8C%ED%99%94'
    );
  });
});

describe('generateOrganizationSchema', () => {
  it('should have @type Organization', () => {
    const schema = generateOrganizationSchema();
    expect(schema['@type']).toBe('Organization');
    expect(schema['@context']).toBe('https://schema.org');
  });

  it('should include required fields: name, url, logo, contactPoint', () => {
    const schema = generateOrganizationSchema();
    expect(schema.name).toBeTruthy();
    expect(schema.url).toBeTruthy();
    expect(schema.logo).toMatch(/^https?:\/\//);
    expect(schema.contactPoint).toBeDefined();
    expect(schema.contactPoint['@type']).toBe('ContactPoint');
    expect(schema.contactPoint.email).toBeTruthy();
    expect(schema.contactPoint.telephone).toBeTruthy();
  });

  it('should include sameAs social links as an array', () => {
    const schema = generateOrganizationSchema();
    expect(Array.isArray(schema.sameAs)).toBe(true);
    expect(schema.sameAs.length).toBeGreaterThan(0);
  });

  it('should use Korean description for ko locale', () => {
    const schema = generateOrganizationSchema('ko');
    expect(schema.description).toMatch(/한국/);
  });

  it('should use English description for en locale', () => {
    const schema = generateOrganizationSchema('en');
    expect(schema.description).toMatch(/Korean artists/i);
  });
});

describe('generateWebsiteSchema', () => {
  it('should have @type WebSite', () => {
    const schema = generateWebsiteSchema();
    expect(schema['@type']).toBe('WebSite');
    expect(schema['@context']).toBe('https://schema.org');
  });

  it('should set inLanguage to ko-KR for Korean locale', () => {
    const schema = generateWebsiteSchema('ko');
    expect(schema.inLanguage).toBe('ko-KR');
  });

  it('should set inLanguage to en-US for English locale', () => {
    const schema = generateWebsiteSchema('en');
    expect(schema.inLanguage).toBe('en-US');
  });

  it('should include url and publisher', () => {
    const schema = generateWebsiteSchema();
    expect(schema.url).toBeTruthy();
    expect(schema.publisher).toBeDefined();
    expect(schema.publisher['@type']).toBe('Organization');
  });
});

describe('generateFAQSchema', () => {
  const koreanFaqs = [
    { question: '씨앗페란 무엇인가요?', answer: '예술인 상호부조 기금 마련 캠페인입니다.' },
    { question: '어떻게 참여하나요?', answer: '작품을 구매하여 참여할 수 있습니다.' },
  ];

  it('should produce FAQPage with correct number of questions', () => {
    const schema = generateFAQSchema(koreanFaqs, 'ko');
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(2);
  });

  it('should preserve Korean content for ko locale', () => {
    const schema = generateFAQSchema(koreanFaqs, 'ko');
    expect(schema.mainEntity[0].name).toBe('씨앗페란 무엇인가요?');
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe(
      '예술인 상호부조 기금 마련 캠페인입니다.'
    );
  });

  it('should use each entry as a Question with an Answer', () => {
    const schema = generateFAQSchema(koreanFaqs, 'ko');
    schema.mainEntity.forEach((entry: { '@type': string; acceptedAnswer: { '@type': string } }) => {
      expect(entry['@type']).toBe('Question');
      expect(entry.acceptedAnswer['@type']).toBe('Answer');
    });
  });

  it('should fallback question text for English locale with Hangul content', () => {
    const schema = generateFAQSchema(koreanFaqs, 'en');
    expect(schema.mainEntity[0].name).toBe('FAQ 1');
    expect(schema.mainEntity[1].name).toBe('FAQ 2');
  });

  it('should fallback answer text for English locale with Hangul content', () => {
    const schema = generateFAQSchema(koreanFaqs, 'en');
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe(
      'This answer is currently available in Korean.'
    );
  });

  it('should keep English content as-is for English locale', () => {
    const englishFaqs = [
      { question: 'What is SAF?', answer: 'A mutual aid fund campaign for artists.' },
    ];
    const schema = generateFAQSchema(englishFaqs, 'en');
    expect(schema.mainEntity[0].name).toBe('What is SAF?');
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe(
      'A mutual aid fund campaign for artists.'
    );
  });
});

describe('generateExhibitionSchema', () => {
  it('should have @type ExhibitionEvent', () => {
    const schema = generateExhibitionSchema();
    expect(schema['@type']).toBe('ExhibitionEvent');
    expect(schema['@context']).toBe('https://schema.org');
  });

  it('should include startDate and endDate', () => {
    const schema = generateExhibitionSchema();
    expect(schema.startDate).toBeTruthy();
    expect(schema.endDate).toBeTruthy();
  });

  it('should compute eventStatus as EventCompleted since exhibition dates have passed', () => {
    // Exhibition: 2026-01-14 to 2026-01-26, current date is 2026-03-19
    const schema = generateExhibitionSchema();
    expect(schema.eventStatus).toBe('https://schema.org/EventCompleted');
  });

  it('should include valid location schema for current event phase', () => {
    const schema = generateExhibitionSchema();
    expect(['Place', 'VirtualLocation']).toContain(schema.location['@type']);

    if (schema.location['@type'] === 'VirtualLocation') {
      expect(schema.location.url).toBeTruthy();
    } else {
      expect(schema.location.address).toBeDefined();
      expect(schema.location.geo).toBeDefined();
    }
  });

  it('should include organizer and offers', () => {
    const schema = generateExhibitionSchema();
    expect(schema.organizer['@type']).toBe('Organization');
    expect(schema.offers['@type']).toBe('Offer');
    expect(schema.offers.price).toBe('0');
  });

  it('should not include aggregateRating when no reviews provided', () => {
    const schema = generateExhibitionSchema([]);
    expect(schema).not.toHaveProperty('aggregateRating');
    expect(schema).not.toHaveProperty('review');
  });

  it('should include aggregateRating when reviews are provided', () => {
    const reviews = [
      { author: '홍길동', rating: 5, comment: '좋았습니다', date: '2026-01-20' },
      { author: '김철수', rating: 4, comment: '인상적이었습니다', date: '2026-01-21' },
    ];
    const schema = generateExhibitionSchema(reviews);
    expect(schema.aggregateRating).toBeDefined();
    expect(schema.aggregateRating['@type']).toBe('AggregateRating');
    expect(schema.aggregateRating.ratingValue).toBe(4.5);
    expect(schema.aggregateRating.reviewCount).toBe(2);
    expect(schema.review).toHaveLength(2);
  });

  it('should keep eventStatus and attendance mode consistent before exhibition start', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-01-10T00:00:00+09:00'));
    const schema = generateExhibitionSchema();
    nowSpy.mockRestore();

    expect(schema.eventStatus).toBe('https://schema.org/EventScheduled');
    expect(schema.eventAttendanceMode).toBe('https://schema.org/MixedEventAttendanceMode');
    expect(schema.location['@type']).toBe('Place');
  });

  it('should keep eventStatus and attendance mode consistent after exhibition end', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-02-10T00:00:00+09:00'));
    const schema = generateExhibitionSchema();
    nowSpy.mockRestore();

    expect(schema.eventStatus).toBe('https://schema.org/EventCompleted');
    expect(schema.eventAttendanceMode).toBe('https://schema.org/OnlineEventAttendanceMode');
    expect(schema.location['@type']).toBe('VirtualLocation');
  });
});

describe('generateVideoSchema', () => {
  it('should normalize YYYY-MM-DD uploadDate into timezone-aware ISO datetime', () => {
    const schema = generateVideoSchema({
      title: 'Video',
      description: 'Desc',
      youtubeId: 'abc123',
      uploadDate: '2026-01-15',
    });

    expect(schema.uploadDate).toBe('2026-01-15T00:00:00+09:00');
    expect(schema.dateModified).toBe('2026-01-15T00:00:00+09:00');
  });

  it('should fallback to default datetime when uploadDate is invalid', () => {
    const schema = generateVideoSchema({
      title: 'Video',
      description: 'Desc',
      youtubeId: 'abc123',
      uploadDate: 'not-a-date',
    });

    expect(schema.uploadDate).toBe('2023-03-26T00:00:00+09:00');
    expect(schema.dateModified).toBe('2023-03-26T00:00:00+09:00');
  });
});

describe('generateArtworkJsonLd', () => {
  const baseArtwork = {
    id: '9999',
    artist: '테스트 작가',
    title: '테스트 작품',
    description: '설명',
    size: '40x40cm',
    material: '캔버스에 유채',
    year: '2026',
    edition: '원화',
    price: '확인 중',
    images: ['/images/test.png'],
  };

  it('should emit VisualArtwork only and omit offers for inquiry-priced artworks', () => {
    const { productSchema } = generateArtworkJsonLd(baseArtwork, '', true, 'ko');

    expect(productSchema['@type']).toBe('VisualArtwork');
    expect(productSchema).not.toHaveProperty('offers');
  });
});

describe('generateArtworkMetadata', () => {
  const baseArtwork = {
    id: '9999',
    artist: '테스트 작가',
    title: '테스트 작품',
    description: '설명',
    size: '40x40cm',
    material: '캔버스에 유채',
    year: '2026',
    edition: '원화',
    price: '확인 중',
    images: ['/images/test.png'],
  };

  it('should avoid product-specific meta tags for inquiry-priced artworks', () => {
    const metadata = generateArtworkMetadata(baseArtwork, 'ko');

    expect(metadata.other?.['og:type']).toBe('website');
    expect(metadata.other).not.toHaveProperty('product:price:amount');
    expect(metadata.other).not.toHaveProperty('product:price:currency');
    expect(metadata.other).not.toHaveProperty('product:availability');
  });
});

describe('generateCampaignSchema', () => {
  it('should have @type FundingScheme', () => {
    const schema = generateCampaignSchema();
    expect(schema['@type']).toBe('FundingScheme');
    expect(schema['@context']).toBe('https://schema.org');
  });

  it('should include funder as an Organization', () => {
    const schema = generateCampaignSchema();
    expect(schema.funder['@type']).toBe('Organization');
    expect(schema.funder.name).toBeTruthy();
  });

  it('should include audience', () => {
    const schema = generateCampaignSchema();
    expect(schema.audience['@type']).toBe('Audience');
    expect(schema.audience.audienceType).toBeTruthy();
  });

  it('should use Korean text for ko locale', () => {
    const schema = generateCampaignSchema('ko');
    expect(schema.name).toMatch(/예술인/);
  });

  it('should use English text for en locale', () => {
    const schema = generateCampaignSchema('en');
    expect(schema.name).toMatch(/Artist Mutual Aid/i);
  });
});

describe('generateSpeakableSchema', () => {
  it('should have @type SpeakableSpecification', () => {
    const schema = generateSpeakableSchema(['h1', 'p']);
    expect(schema['@type']).toBe('SpeakableSpecification');
    expect(schema['@context']).toBe('https://schema.org');
  });

  it('should output the provided cssSelector array', () => {
    const selectors = ['h1', 'article h3', 'article p'];
    const schema = generateSpeakableSchema(selectors);
    expect(schema.cssSelector).toEqual(selectors);
  });

  it('should handle a single selector', () => {
    const schema = generateSpeakableSchema(['h1']);
    expect(schema.cssSelector).toEqual(['h1']);
  });
});

describe('escapeJsonLdForScript', () => {
  it('should escape < characters to \\u003c', () => {
    const input = '<script>alert("xss")</script>';
    const result = escapeJsonLdForScript(input);
    expect(result).not.toContain('<');
    expect(result).toContain('\\u003c');
  });

  it('should escape multiple < characters', () => {
    const input = '{"name":"<b>test</b>"}';
    const result = escapeJsonLdForScript(input);
    expect(result).toBe('{"name":"\\u003cb\\u003etest\\u003c/b\\u003e"}');
  });

  it('should return the same string when no < characters present', () => {
    const input = '{"name":"safe text"}';
    const result = escapeJsonLdForScript(input);
    expect(result).toBe(input);
  });
});

// ── AEO/GEO Schemas ──

describe('generateClaimReviewSchema', () => {
  it('should have @type ClaimReview with required fields', () => {
    const schema = generateClaimReviewSchema({
      claimText: '84.9% of artists are excluded',
      url: 'https://www.saf2026.com/our-reality',
      truthRating: 5,
      ratingLabel: 'Verified',
      evidenceSource: '2025 Report',
      datePublished: '2025-11-05',
    });
    expect(schema['@type']).toBe('ClaimReview');
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema.claimReviewed).toBe('84.9% of artists are excluded');
    expect(schema.reviewRating.ratingValue).toBe(5);
    expect(schema.reviewRating.bestRating).toBe(5);
    expect(schema.reviewRating.worstRating).toBe(1);
  });

  it('should include author as Organization', () => {
    const schema = generateClaimReviewSchema({
      claimText: 'Test claim',
      url: 'https://example.com',
      truthRating: 4,
      ratingLabel: 'Mostly True',
      evidenceSource: 'Test source',
      datePublished: '2025-01-01',
    });
    expect(schema.author['@type']).toBe('Organization');
    expect(schema.author.name).toBeTruthy();
  });

  it('should include itemReviewed with Claim type', () => {
    const schema = generateClaimReviewSchema({
      claimText: 'Test claim',
      url: 'https://example.com',
      truthRating: 3,
      ratingLabel: 'Half True',
      evidenceSource: 'Some report',
      datePublished: '2025-01-01',
    });
    expect(schema.itemReviewed['@type']).toBe('Claim');
    expect(schema.itemReviewed.appearance['@type']).toBe('CreativeWork');
  });
});

describe('generateSAFClaimReviews', () => {
  it('should return 4 claim reviews for ko locale', () => {
    const reviews = generateSAFClaimReviews('ko');
    expect(reviews).toHaveLength(4);
    reviews.forEach((r) => {
      expect(r['@type']).toBe('ClaimReview');
    });
  });

  it('should return 4 claim reviews for en locale with English text', () => {
    const reviews = generateSAFClaimReviews('en');
    expect(reviews).toHaveLength(4);
    expect(reviews[0].claimReviewed).toMatch(/84\.9%/);
    expect(reviews[0].url).toContain('/en/our-reality');
  });

  it('should use Korean URLs for ko locale', () => {
    const reviews = generateSAFClaimReviews('ko');
    expect(reviews[0].url).not.toContain('/en/');
    expect(reviews[0].url).toContain('/our-reality');
  });
});

describe('generateHowToSchema', () => {
  it('should have @type HowTo with steps', () => {
    const schema = generateHowToSchema({
      name: 'Test HowTo',
      description: 'Test description',
      steps: [
        { name: 'Step 1', text: 'Do this' },
        { name: 'Step 2', text: 'Do that' },
      ],
    });
    expect(schema['@type']).toBe('HowTo');
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema.step).toHaveLength(2);
    expect(schema.step[0].position).toBe(1);
    expect(schema.step[1].position).toBe(2);
  });

  it('should include optional fields when provided', () => {
    const schema = generateHowToSchema({
      name: 'Test',
      description: 'Test',
      totalTime: 'PT10M',
      estimatedCost: { currency: 'KRW', value: '1000000' },
      url: 'https://example.com',
      steps: [{ name: 'Step', text: 'Do it' }],
    });
    expect(schema.totalTime).toBe('PT10M');
    expect(schema.estimatedCost.currency).toBe('KRW');
    expect(schema.url).toBe('https://example.com');
  });
});

describe('generateArtworkPurchaseHowTo', () => {
  it('should have 4 steps for ko locale', () => {
    const schema = generateArtworkPurchaseHowTo('ko');
    expect(schema.step).toHaveLength(4);
    expect(schema.name).toMatch(/SAF Online/);
  });

  it('should have 4 steps for en locale with English content', () => {
    const schema = generateArtworkPurchaseHowTo('en');
    expect(schema.step).toHaveLength(4);
    expect(schema.step[0].name).toMatch(/Browse/i);
  });
});

describe('generateArtworkPurchaseFAQ', () => {
  it('should delegate to FAQPage structure with Question/Answer entities', () => {
    const schema = generateArtworkPurchaseFAQ('ko');
    expect(schema['@type']).toBe('FAQPage');
    expect(Array.isArray(schema.mainEntity)).toBe(true);
    expect(schema.mainEntity.length).toBeGreaterThan(0);
    expect(schema.mainEntity[0]['@type']).toBe('Question');
    expect(schema.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
  });
});

describe('generateMemberJoinHowTo', () => {
  it('should have 3 steps', () => {
    const schema = generateMemberJoinHowTo('ko');
    expect(schema.step).toHaveLength(3);
  });
});

describe('generateQAPageSchema', () => {
  it('should have @type QAPage with a single main question', () => {
    const schema = generateQAPageSchema(
      [
        { question: 'What is SAF?', answer: 'An art exhibition.' },
        { question: 'How to participate?', answer: 'Buy artwork.' },
      ],
      'https://www.saf2026.com'
    );
    expect(schema['@type']).toBe('QAPage');
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema.mainEntity['@type']).toBe('Question');
    expect(schema.mainEntity.acceptedAnswer['@type']).toBe('Answer');
    expect(schema.mainEntity).toHaveProperty('text');
    expect(schema.mainEntity).toHaveProperty('datePublished');
    expect(schema.mainEntity.acceptedAnswer).toHaveProperty('upvoteCount');
    expect(schema.hasPart).toHaveLength(1);
  });

  it('should include author Organization in answers', () => {
    const schema = generateQAPageSchema(
      [{ question: 'Q?', answer: 'A.' }],
      'https://www.saf2026.com'
    );
    expect(schema.mainEntity.acceptedAnswer.author['@type']).toBe('Organization');
  });
});

describe('generateSAFCoreQA', () => {
  it('should return one main question and related questions for ko locale', () => {
    const schema = generateSAFCoreQA('ko');
    expect(schema.mainEntity.name).toMatch(/씨앗페/);
    expect(Array.isArray(schema.hasPart)).toBe(true);
    expect(schema.hasPart.length).toBeGreaterThanOrEqual(4);
  });

  it('should return one main question and related questions for en locale', () => {
    const schema = generateSAFCoreQA('en');
    expect(schema.mainEntity.name).toMatch(/SAF/);
    expect(Array.isArray(schema.hasPart)).toBe(true);
    expect(schema.hasPart.length).toBeGreaterThanOrEqual(4);
  });
});
