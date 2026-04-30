/**
 * Static deck-page constants. Lives in a separate file (not actions.ts)
 * because Next.js's "use server" directive forbids non-async exports —
 * MAX_DECK_SLOTS is a plain `const`, so it lives here instead and gets
 * imported by both the server actions and the page/UI layers.
 */

/** Total deck slots a player can keep saved at once. */
export const MAX_DECK_SLOTS = 3;

export const SLOT_LABEL: Record<number, string> = {
  1: "主牌組",
  2: "副牌組",
  3: "備用牌組",
};

export function defaultSlotName(slot: number): string {
  return SLOT_LABEL[slot] ?? `牌組 ${slot}`;
}
