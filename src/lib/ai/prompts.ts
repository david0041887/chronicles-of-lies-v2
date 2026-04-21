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

  // =========================================================
  // UR — Primes (apex mythic beings)
  // =========================================================
  ur_pr_001:
    "primordial shadow entity, formless silhouette made of infinite black void, " +
    "faint golden cracks of first light breaking through its edges, cosmic backdrop of unborn stars, " +
    "reality bending inward towards it, overwhelming void aura",
  ur_pr_002:
    "colossal primordial mother goddess rising from flooded primordial waters, " +
    "nebula inside her body, cosmic pregnancy aura, waves crashing around her, " +
    "emerging continents beneath, divine twilight",
  ur_pr_003:
    "tricky mesmerizing figure wreathed in a fractured mirror cloak, pointing finger towards viewer, " +
    "reality tearing along its hands, overlapping silhouettes of dozens of faces behind, " +
    "cave paintings flickering in recognition, eerie purple glow",

  ur_me_001:
    "Enki Sumerian god of wisdom, bearded man in blue-green water scales, flowing rivers from shoulders, " +
    "holding a jar overflowing with water of life, ziggurat and Mesopotamian sky behind, divine calm",
  ur_me_002:
    "Tiamat the primordial chaos dragon goddess, enormous serpentine body with five heads, " +
    "iridescent scales, cosmic storm and primal chaos swirling around her, " +
    "Mesopotamian heavens shattering, divine terror",
  ur_me_003:
    "Anu the Sumerian sky father god, regal figure in gold and lapis horned crown, " +
    "seated on starry throne above clouds, scepter of authority, Mesopotamian zodiac behind",

  ur_eg_001:
    "Osiris Egyptian god of the afterlife, green-skinned king with atef crown, " +
    "wrapped in white mummy linens, holding crook and flail, rising from sarcophagus, " +
    "nile reeds and underworld glow, divine resurrection aura",
  ur_eg_002:
    "Thoth Egyptian god of writing, ibis-headed man in gold and blue regalia, " +
    "holding a reed pen and infinite scroll of hieroglyphs, stars and moon motifs, " +
    "library of eternity behind him",
  ur_eg_003:
    "Amun-Ra hidden-sun king of gods, double crown with sun disc, rams horns, " +
    "radiant solar halo, throne of gold between colossal pillars, " +
    "Karnak temple at blinding noon, ultimate divine authority",

  ur_gr_001:
    "Zeus king of Olympian gods, muscular bearded titan hurling lightning bolts, " +
    "storm clouds breaking open, eagle companion, white marble palace of Olympus, " +
    "divine wrath and awe",
  ur_gr_002:
    "Kronos titan of time devouring a star, enormous old man with sickle, " +
    "swallowing cosmos itself, hourglasses shattered around him, " +
    "Greek myth dark atmosphere, tragic grandeur",
  ur_gr_003:
    "Hades Greek god of the underworld, dark-haired stern king in black robes edged with ghostfire, " +
    "holding bident, seated on obsidian throne, Cerberus at his feet, " +
    "river Styx behind him, somber underworld grandeur",

  ur_ha_001:
    "Nüwa Chinese creator goddess, serpent lower body with human upper body, " +
    "holding a shining gem patching a colored sky-crack, colorful nebula background, " +
    "mythic Chinese artwork, life-giving aura",
  ur_ha_002:
    "Fuxi Chinese primordial sage-king, serpent lower body paired with Nüwa motif, " +
    "holding a carpenter's square and the Bagua trigram circle glowing in air, " +
    "ancient sky observatory, calligraphic aura",
  ur_ha_003:
    "Pangu the primordial cosmic giant cleaving heaven and earth with an axe, " +
    "colossal muscular figure, his body becoming mountains and rivers, " +
    "cosmic explosion of form from chaos, Chinese mythic scale",

  ur_no_001:
    "Ymir the primordial frost giant, colossal blue-white skinned being, " +
    "ice crystals for beard, seas of molten cosmos flowing from his wounds, " +
    "Norse cosmic creation scene, sublime horror",
  ur_no_002:
    "Ragnarok personified, dark armored rider atop Fenrir, sky cracking with lightning, " +
    "burning Yggdrasil and falling stars, serpent coiling around Midgard, " +
    "apocalyptic Norse mythic end-times",
  ur_no_003:
    "Mimir's severed head floating above a well of glowing dark water, " +
    "ancient bearded sage with closed eyes speaking prophecy, " +
    "runic ribbons of words emitting from mouth, Norse twilight mystery",

  ur_md_001:
    "Lucifer fallen morning star, beautiful angelic figure with black feathered wings on fire, " +
    "crown of light, holding a broken sword, cathedral ruins and blood moon behind, " +
    "majestic tragic rebellion",
  ur_md_002:
    "Holy Grail chalice, ornate golden cup emitting radiant divine light, " +
    "cathedral altar, angels' wings manifesting around it, ancient texts floating, " +
    "baroque miracle aura",
  ur_md_003:
    "King Arthur in full Excalibur armor, lifting the glowing silver-blue sword aloft, " +
    "heraldic crown, lake of Avalon and floating mists, knights in formation behind, " +
    "epic medieval sovereign",

  ur_se_001:
    "Amaterasu Japanese sun goddess emerging from cave, radiant golden-white hair, " +
    "flowing silk robes of silver and gold, eight-bead magatama necklace, " +
    "sacred mirror, shrine torii in distance, divine dawn",
  ur_se_002:
    "Susano-o Japanese storm god in black armor, wild dark hair, " +
    "holding Kusanagi sword slashing through the eight-headed Yamata-no-Orochi dragon, " +
    "storm clouds and rain of sparks, heroic wrath",
  ur_se_003:
    "Great Tengu mountain king, tall red-faced long-nosed entity with black wings, " +
    "yamabushi ascetic robe, feathered fan, mountain temple on moonlit cliff, " +
    "arcane martial mastery",

  ur_mg_001:
    "Formless Taoist supreme being, silhouette dissolving into mist and calligraphy strokes, " +
    "yin-yang at center of the void, mountains and constellations coexisting inside him, " +
    "pure Daoist abstraction",
  ur_mg_002:
    "Eastern Peak Emperor Dongyue, stern deity in black imperial robes with red trim, " +
    "holding ledger of life and death, Mount Tai behind him shrouded in clouds, " +
    "ghostly attendants carrying scrolls",
  ur_mg_003:
    "Taibai Venus star lord, elderly sage in flowing white-gold robes, " +
    "riding a celestial crane, Venus star gleaming above his head, " +
    "diplomatic gentle expression, Chinese heavenly palace",

  ur_mo_001:
    "The Primordial Lie manifesting as a luminous spoken sentence, " +
    "floating golden Chinese characters 「這裡有光」 in midair breaking through black void, " +
    "entire universe unfolding from the words, divine cosmic abstraction",
  ur_mo_002:
    "The Eye of the Veil, massive cosmic eye opening in the sky above modern city, " +
    "iris composed of swirling galaxy, buildings bending reality, " +
    "surveillance horror, cinematic scale",
  ur_mo_003:
    "Collective Unconscious entity, thousands of human faces merging into one dream-being, " +
    "starry body like a nebula, tendrils of shared imagery flowing, " +
    "surreal modern subconscious dreamscape",
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
