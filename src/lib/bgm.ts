/**
 * Background music registry.
 *
 * Sources: Kevin MacLeod — incompetech.com (CC BY 4.0). Credit line shown
 * in /settings when a track is playing. Replace with your own files in
 * /public/audio/ any time (absolute URLs or relative paths both work).
 */

export interface BgmTrack {
  /** audio src (absolute URL or /relative path) */
  src: string;
  /** 0.0-1.0 track-specific gain (multiplied by user volume) */
  gain?: number;
  /** display label */
  title?: string;
  /** creator attribution */
  credit?: string;
}

const BASE = "https://incompetech.com/music/royalty-free/mp3-royaltyfree";

const TRACKS: Record<string, BgmTrack> = {
  main: {
    src: `${BASE}/Virtutes%20Vocis.mp3`,
    title: "Virtutes Vocis",
    credit: "Kevin MacLeod / incompetech (CC-BY)",
    gain: 0.85,
  },
  desert: {
    src: `${BASE}/Exotic%20Battle.mp3`,
    title: "Exotic Battle",
    credit: "Kevin MacLeod / incompetech (CC-BY)",
    gain: 0.8,
  },
  east: {
    src: `${BASE}/Chee%20Zee%20Cave.mp3`,
    title: "Chee Zee Cave",
    credit: "Kevin MacLeod / incompetech (CC-BY)",
    gain: 0.85,
  },
  gothic: {
    src: `${BASE}/Dark%20Fog.mp3`,
    title: "Dark Fog",
    credit: "Kevin MacLeod / incompetech (CC-BY)",
    gain: 0.9,
  },
  primal: {
    src: `${BASE}/Shamanistic.mp3`,
    title: "Shamanistic",
    credit: "Kevin MacLeod / incompetech (CC-BY)",
    gain: 0.9,
  },
  stoic: {
    src: `${BASE}/Evening%20Melodrama.mp3`,
    title: "Evening Melodrama",
    credit: "Kevin MacLeod / incompetech (CC-BY)",
    gain: 0.85,
  },
  cyber: {
    src: `${BASE}/Crypto.mp3`,
    title: "Crypto",
    credit: "Kevin MacLeod / incompetech (CC-BY)",
    gain: 0.85,
  },
  ritual: {
    src: `${BASE}/Ossuary%201%20-%20A%20Beginning.mp3`,
    title: "Ossuary 1 — A Beginning",
    credit: "Kevin MacLeod / incompetech (CC-BY)",
    gain: 0.9,
  },
};

/**
 * Resolve a route path to a track. Returns null for pages with no BGM.
 */
export function trackForPath(path: string): BgmTrack | null {
  if (path.startsWith("/era/egypt") || path.startsWith("/era/mesopotamia")) return TRACKS.desert;
  if (path.startsWith("/era/ming") || path.startsWith("/era/han") || path.startsWith("/era/sengoku")) return TRACKS.east;
  if (path.startsWith("/era/medieval")) return TRACKS.gothic;
  if (path.startsWith("/era/primitive") || path.startsWith("/era/norse")) return TRACKS.primal;
  if (path.startsWith("/era/greek")) return TRACKS.stoic;
  if (path.startsWith("/era/modern")) return TRACKS.cyber;
  if (path.startsWith("/welcome")) return TRACKS.ritual;
  if (
    path === "/" ||
    path.startsWith("/home") ||
    path.startsWith("/world") ||
    path.startsWith("/gacha") ||
    path.startsWith("/collection") ||
    path.startsWith("/deck") ||
    path.startsWith("/settings")
  ) {
    return TRACKS.main;
  }
  return null;
}
