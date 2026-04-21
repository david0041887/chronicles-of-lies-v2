import type { Rarity } from "@prisma/client";

export const STYLE_PREFIX =
  "dark baroque oil painting, ornate art nouveau golden frame, " +
  "dramatic chiaroscuro lighting, hyper-detailed, trading card game art, " +
  "Magic the Gathering illustration style, cinematic composition, volumetric light";

export const NEGATIVE =
  "low quality, blurry, text, watermark, signature, letters, logo, frame text";

const ERA_PROMPT: Record<string, string> = {
  egypt:
    "ancient Egyptian mysticism, golden regalia and lapis lazuli ornaments, " +
    "hieroglyphs floating around, desert pyramid background at sunset, " +
    "ornate gold leaf frame with hieroglyph border",
  medieval:
    "medieval European dark fantasy, gothic cathedral interior, " +
    "stained glass windows with bloody hues, candle wax, heavy velvet cloaks, " +
    "ornate silver frame with latin inscriptions, Rembrandt inspired lighting",
  ming:
    "Ming dynasty Chinese mysticism, ink wash painting aesthetic, " +
    "jade and cinnabar ornaments, silk embroidery, red lantern ambient light, " +
    "flying autumn leaves, bamboo forest silhouette, " +
    "ornate vermilion frame with chinese calligraphy border",
  modern:
    "modern urban occult, neon cyberpunk atmosphere, CRT scanlines, " +
    "chromatic aberration, digital glitch effects, hooded figure in smoggy Tokyo street, " +
    "holographic symbols, ornate frame made of circuit boards and copper wire",
};

const RARITY_EMPHASIS: Record<Rarity, string> = {
  R: "atmospheric, subtle",
  SR: "intricate details, strong focal character",
  SSR: "epic, majestic, radiant aura",
  UR: "legendary, reality-bending, overwhelming aura, rainbow highlights",
};

// Per-card overrides for special characters
const CARD_HOOKS: Record<string, string> = {
  ssr_eg_001:
    "tall majestic Anubis god with obsidian black jackal head and golden eyes, " +
    "muscular body adorned with gold and lapis lazuli, holding a golden ankh and scale of judgement, " +
    "feathers falling around, standing before a giant pyramid at blood red sunset",
  ssr_eg_002:
    "goddess Isis with outstretched wings of gold feathers, protective motherly pose, " +
    "crown with solar disc between horns, flowing linen robes, standing on a hieroglyph-carved obelisk",
  ssr_md_001:
    "Count Dracula in dark velvet cape lined with blood red silk, piercing crimson eyes, " +
    "standing on a rain-drenched balcony of a Transylvanian castle under a blood moon",
  ssr_md_002:
    "elder wizard Merlin with long silver beard and star-covered robes, " +
    "holding a runic staff emitting ethereal blue light, surrounded by floating spellbooks",
  ssr_mg_001:
    "ethereal white snake woman in flowing white silk hanfu, jade hairpin, " +
    "standing on a misty broken bridge in the rain, cherry blossoms falling",
  ssr_mg_002:
    "elderly Taoist master Zhang Sanfeng in flowing robe, fluid Tai Chi pose, " +
    "wuxia style, mountain temple background, soft qi energy visible around hands",
  ssr_mo_001:
    "sinister humanoid AI entity with glitching digital face showing 666 in binary, " +
    "body composed of flowing code and fractured mirrors, floating in a dark server room " +
    "with endless racks of blinking red LEDs, reality distortion around figure",
  ssr_mo_002:
    "silhouettes of sinister suited figures in smoke-filled backroom, " +
    "redacted documents floating around, single overhead incandescent lamp, " +
    "noir shadow play, conspiratorial atmosphere",
};

interface Card {
  id: string;
  name: string;
  nameEn?: string | null;
  eraId: string;
  rarity: Rarity;
  type: string;
  flavor?: string | null;
}

export function buildPrompt(card: Card): string {
  const eraPart = ERA_PROMPT[card.eraId] ?? "";
  const hook =
    CARD_HOOKS[card.id] ??
    `${card.nameEn ?? card.name} character, thematic to ${card.eraId}`;
  return [hook, eraPart, RARITY_EMPHASIS[card.rarity], STYLE_PREFIX]
    .filter(Boolean)
    .join(", ");
}
