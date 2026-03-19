/**
 * Schema.org structured data generators for SEO/AEO/GEO
 *
 * Organized by domain:
 * - utils: shared helpers (escapeJsonLdForScript, sanitizeForLocale, etc.)
 * - breadcrumb: BreadcrumbList schema
 * - artwork: VisualArtwork/Product, ItemList, AggregateOffer schemas
 * - artist: Person schema (basic + enhanced with credentials)
 * - organization: Organization, WebSite, ArtGallery, FundingScheme schemas
 * - event: ExhibitionEvent schema
 * - content: FAQPage, VideoObject, NewsArticle, Speakable schemas
 * - claim-review: ClaimReview schemas for verified statistical claims (AEO/GEO)
 * - howto: HowTo schemas for step-by-step guides (AEO/GEO)
 * - qa-page: QAPage schemas for AI-friendly Q&A content (AEO/GEO)
 */

// Utils
export { escapeJsonLdForScript, sanitizeForLocale, parseArtworkPrice } from './utils';

// Breadcrumb
export { createBreadcrumbSchema } from './breadcrumb';

// Artwork
export {
  generateArtworkMetadata,
  generateArtworkJsonLd,
  generateArtworkListSchema,
  generateGalleryAggregateOffer,
} from './artwork';

// Artist
export type { ArtistSchemaInput, EnhancedArtistSchemaInput } from './artist';
export { generateArtistSchema, generateEnhancedArtistSchema } from './artist';

// Organization
export {
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateLocalBusinessSchema,
  generateCampaignSchema,
} from './organization';

// Event
export { generateExhibitionSchema } from './event';

// Content
export type { FAQItem, VideoSchemaInput, NewsArticleSchemaInput } from './content';
export {
  generateFAQSchema,
  generateVideoSchema,
  generateNewsArticleSchema,
  generateSpeakableSchema,
} from './content';

// ClaimReview (AEO/GEO)
export type { ClaimReviewInput } from './claim-review';
export { generateClaimReviewSchema, generateSAFClaimReviews } from './claim-review';

// HowTo (AEO/GEO)
export type { HowToStep, HowToInput } from './howto';
export {
  generateHowToSchema,
  generateArtworkPurchaseHowTo,
  generateMemberJoinHowTo,
} from './howto';

// QAPage (AEO/GEO)
export type { QAItem } from './qa-page';
export { generateQAPageSchema, generateSAFCoreQA } from './qa-page';
