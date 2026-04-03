/**
 * SEO utilities - re-exports from modular schema files.
 *
 * All schema generators now live in lib/schemas/*.ts
 * This file is kept for backward compatibility with existing imports.
 */
export {
  // Utils
  escapeJsonLdForScript,
  sanitizeForLocale,
  parseArtworkPrice,
  // Breadcrumb
  createBreadcrumbSchema,
  // Artwork
  generateArtworkMetadata,
  generateArtworkJsonLd,
  generateArtworkListSchema,
  generateGalleryAggregateOffer,
  // Artist
  generateArtistSchema,
  generateEnhancedArtistSchema,
  // Organization
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateLocalBusinessSchema,
  generateCampaignSchema,
  // Event
  generateExhibitionSchema,
  isExhibitionCompleted,
  // Content
  generateFAQSchema,
  generateVideoSchema,
  generateNewsArticleSchema,
  generateSpeakableSchema,
  // AEO/GEO — ClaimReview, HowTo, QAPage
  generateClaimReviewSchema,
  generateSAFClaimReviews,
  generateHowToSchema,
  generateArtworkPurchaseHowTo,
  generateMemberJoinHowTo,
  generateQAPageSchema,
  generateSAFCoreQA,
} from './schemas';

export type {
  ArtistSchemaInput,
  EnhancedArtistSchemaInput,
  FAQItem,
  VideoSchemaInput,
  NewsArticleSchemaInput,
  ClaimReviewInput,
  HowToStep,
  HowToInput,
  QAItem,
} from './schemas';
