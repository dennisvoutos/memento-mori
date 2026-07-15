/** Google AdSense publisher ID from the VITE_ADSENSE_CLIENT env var.
 *  Empty string means AdSense is not configured — ads will not render.
 *  Set VITE_ADSENSE_CLIENT=ca-pub-5558539741480181 in your deploy environment. */
export const ADSENSE_CLIENT: string =
  import.meta.env.VITE_ADSENSE_CLIENT ?? '';

/** Returns true when a valid AdSense publisher ID is configured. */
export function isAdSenseConfigured(): boolean {
  return ADSENSE_CLIENT.length > 0;
}

// ── Ad slot IDs ──
// Replace these with real slot IDs from your AdSense dashboard once approved.
// Each placement gets its own slot so you can track performance per page/position.

export const SLOT_LANDING_HERO = '0000000001';
export const SLOT_LANDING_CONTENT = '0000000002';
export const SLOT_BROWSE_TOP = '0000000003';
export const SLOT_SEARCH_TOP = '0000000004';
export const SLOT_MEMORIAL_SIDEBAR = '0000000005';
