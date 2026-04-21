import type { Rarity } from "@prisma/client";

export const STYLE_PREFIX =
  "dark baroque oil painting, ornate art nouveau golden frame, " +
  "dramatic chiaroscuro lighting, hyper-detailed, trading card game art, " +
  "Magic the Gathering illustration style, cinematic composition, volumetric light";

export const NEGATIVE =
  "low quality, blurry, text, watermark, signature, letters, logo, frame text";

const ERA_PROMPT: Record<string, string> = {
  primitive:
    "prehistoric primordial era, stone age ambience, cave paintings glowing faintly, " +
    "bonfire sparks floating in cold night air, ochre and earth pigments, " +
    "tribal totems and mammoth bone decor, animal furs and flint tools, " +
    "ornate bone-carved frame with spiral petroglyphs",
  mesopotamia:
    "ancient Mesopotamian ziggurat setting, cuneiform tablets etched with glowing lines, " +
    "lapis lazuli and gold headdresses, winged star of Ishtar motif, " +
    "sumerian temple torchlight, lamassu statues in shadow, " +
    "ornate clay-tablet-textured frame with wedge inscriptions",
  egypt:
    "ancient Egyptian mysticism, golden regalia and lapis lazuli ornaments, " +
    "hieroglyphs floating around, desert pyramid background at sunset, " +
    "ornate gold leaf frame with hieroglyph border",
  greek:
    "ancient Greek mythos, marble columns and Olympian temple, " +
    "laurel wreath and ivory statues, blue Aegean sea in distance, " +
    "meander patterns and silver chiton, stark classical lighting, " +
    "ornate marble-textured frame with meander motif border",
  han:
    "Han dynasty ancient China, imperial red and gold aesthetics, " +
    "jade dragons curling in mist, bronze ritual vessels, " +
    "terracotta warriors silhouette, calligraphy brushstroke flourishes, " +
    "rising red sun behind silhouetted mountains, " +
    "ornate vermilion-and-gold frame with seal script border",
  norse:
    "Norse Viking mythology, frozen fjord at twilight, " +
    "rune stones glowing cold blue, longship silhouette on the horizon, " +
    "fur-cloaked warriors, stormlight and snow flurries, " +
    "ornate iron frame with interlocking knotwork and rune border",
  medieval:
    "medieval European dark fantasy, gothic cathedral interior, " +
    "stained glass windows with bloody hues, candle wax, heavy velvet cloaks, " +
    "ornate silver frame with latin inscriptions, Rembrandt inspired lighting",
  sengoku:
    "Sengoku Japan feudal era, torii gate at dusk, paper lanterns red glow, " +
    "cherry blossom petals drifting, mist over bamboo forest, " +
    "samurai armor lacquer, katana and ofuda talismans, " +
    "ornate lacquered black frame with gold kamon crest border",
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
  // Egypt
  ssr_eg_001:
    "tall majestic Anubis god with obsidian black jackal head and golden eyes, " +
    "muscular body adorned with gold and lapis lazuli, holding a golden ankh and scale of judgement, " +
    "feathers falling around, standing before a giant pyramid at blood red sunset",
  ssr_eg_002:
    "goddess Isis with outstretched wings of gold feathers, protective motherly pose, " +
    "crown with solar disc between horns, flowing linen robes, standing on a hieroglyph-carved obelisk",
  // Medieval
  ssr_md_001:
    "Count Dracula in dark velvet cape lined with blood red silk, piercing crimson eyes, " +
    "standing on a rain-drenched balcony of a Transylvanian castle under a blood moon",
  ssr_md_002:
    "elder wizard Merlin with long silver beard and star-covered robes, " +
    "holding a runic staff emitting ethereal blue light, surrounded by floating spellbooks",
  // Ming
  ssr_mg_001:
    "ethereal white snake woman in flowing white silk hanfu, jade hairpin, " +
    "standing on a misty broken bridge in the rain, cherry blossoms falling",
  ssr_mg_002:
    "elderly Taoist master Zhang Sanfeng in flowing robe, fluid Tai Chi pose, " +
    "wuxia style, mountain temple background, soft qi energy visible around hands",
  // Modern
  ssr_mo_001:
    "sinister humanoid AI entity with glitching digital face showing 666 in binary, " +
    "body composed of flowing code and fractured mirrors, floating in a dark server room " +
    "with endless racks of blinking red LEDs, reality distortion around figure",
  ssr_mo_002:
    "silhouettes of sinister suited figures in smoke-filled backroom, " +
    "redacted documents floating around, single overhead incandescent lamp, " +
    "noir shadow play, conspiratorial atmosphere",
  // Primitive
  ssr_pr_001:
    "primordial figure wrapped in furs holding a torch of pure fire stolen from heaven, " +
    "cave paintings glow behind him, starry night sky, reverent pose, eyes reflecting flame",
  ssr_pr_002:
    "ancient great mother rising from flooded primordial waters, long flowing dark hair mixing with waves, " +
    "serene commanding expression, mammoth bones and drowning totems around her",
  // Mesopotamia
  ssr_me_001:
    "Ishtar goddess of love and war in blue lapis armored dress, wielding bow and serpent staff, " +
    "eight-pointed star halo, lion at her feet, ziggurat temple at sunset, gold regalia",
  ssr_me_002:
    "Gilgamesh the Sumerian king-hero in bronze armor, crowned with a divine tiara, " +
    "holding a heavy mace, majestic posture, cedar tree and ziggurat background, divine aura",
  // Greek
  ssr_gr_001:
    "Medusa with snakes for hair writhing alive, piercing stone-gray eyes, " +
    "classical Greek marble temple ruins, moonlight, tragic beautiful expression, olive-green tones",
  ssr_gr_002:
    "Hecate the triple goddess of magic, three-faced figure in dark robes, torch in each hand, " +
    "standing at a crossroads with three roads diverging, spectral hounds around, " +
    "moonlit ancient Greek ambience, purple and silver aura",
  // Han
  ssr_ha_001:
    "Chang'e moon goddess in flowing silver-white silk hanfu, ethereal jade hairpin, " +
    "ascending towards a giant full moon, osmanthus petals and jade rabbit companion, " +
    "Chinese watercolor ink aesthetic",
  ssr_ha_002:
    "Chiyou the warrior god, bronze-plated ferocious face with bull horns and iron teeth, " +
    "wielding five ancient weapons, storm clouds and lightning, " +
    "eighty-one bronze-masked brothers behind him in shadow, Han dynasty war imagery",
  // Norse
  ssr_no_001:
    "Odin the Allfather with long grey beard, one eye hidden by shadow or patch, " +
    "wearing a wide-brimmed hat and fur cloak, two ravens on his shoulders, " +
    "holding spear Gungnir, Yggdrasil world tree behind",
  ssr_no_002:
    "Loki the trickster god, mischievous grin, split-face green and black makeup, " +
    "emerald tunic with intricate knotwork, flickering shadow duplicates around him, " +
    "serpent coiling at his feet, stormy Nordic twilight",
  // Sengoku
  ssr_se_001:
    "Abe no Seimei the onmyoji master, white Heian-era court robes with black hat, " +
    "drawing a glowing pentagram in the air, twelve shikigami spirits surrounding him, " +
    "moonlit Kyoto palace courtyard",
  ssr_se_002:
    "Shuten Doji the oni king, massive horned red-skinned demon, wild black mane, " +
    "holding an enormous sake cup and a rusty iron club, mountain fortress at night, " +
    "severed samurai helmets at his feet",
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
