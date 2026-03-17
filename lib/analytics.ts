import { track } from '@vercel/analytics';

export function trackConversion(
  event: 'purchase_click' | 'external_link_click' | 'share_click',
  properties?: Record<string, string | number>
) {
  try {
    track(event, properties);
  } catch {
    // Silently fail if analytics is not loaded
  }
}
