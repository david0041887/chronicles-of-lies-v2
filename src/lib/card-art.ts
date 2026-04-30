/**
 * Resolve the URL to render for a card's art. Prefers an externally-hosted
 * image (Replicate URL stored in `imageUrl`) when present; otherwise falls
 * back to the internal `/api/cards/[id]/art` blob endpoint, which serves
 * the user's own generated art with ETag revalidation.
 *
 * Returns `null` when neither source is available — callers fall back to
 * the SVG `CardArt` component.
 *
 * Centralised here so we have one place to evolve the URL shape (e.g.
 * append a `?v=` cache-buster, route through a CDN, etc.) without
 * combing every caller again.
 */
export function cardArtUrl(card: {
  id: string;
  imageUrl?: string | null;
  hasImage?: boolean;
}): string | null {
  if (card.imageUrl) return card.imageUrl;
  if (card.hasImage) return `/api/cards/${card.id}/art`;
  return null;
}
