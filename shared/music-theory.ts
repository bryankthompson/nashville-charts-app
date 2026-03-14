/**
 * Music theory utilities for Nashville Number System charts.
 * Ported from nashville-charts/validate_keys.py and CLAUDE.md reference.
 */

/** All chromatic notes in order (using sharps) */
export const CHROMATIC_SHARPS = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

/** All chromatic notes in order (using flats) */
export const CHROMATIC_FLATS = [
  "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B",
] as const;

/** Enharmonic equivalents (normalize to sharp notation) */
export const ENHARMONIC: Record<string, string> = {
  Db: "C#", Eb: "D#", Fb: "E", Gb: "F#",
  Ab: "G#", Bb: "A#", Cb: "B",
  Dbm: "C#m", Ebm: "D#m", Fbm: "Em", Gbm: "F#m",
  Abm: "G#m", Bbm: "A#m", Cbm: "Bm",
};

/** Relative major -> minor pairs */
export const RELATIVE_PAIRS: Record<string, string> = {
  C: "Am", "C#": "A#m", D: "Bm", "D#": "Cm",
  E: "C#m", F: "Dm", "F#": "D#m", G: "Em",
  "G#": "Fm", A: "F#m", "A#": "Gm", B: "G#m",
};

/** Reverse: minor -> major */
export const RELATIVE_PAIRS_REV: Record<string, string> = Object.fromEntries(
  Object.entries(RELATIVE_PAIRS).map(([k, v]) => [v, k])
);

/** Key families — keys that share the same notes */
export const KEY_FAMILIES: { major: string; minor: string; notes: string[] }[] = [
  { major: "C", minor: "Am", notes: ["C", "D", "E", "F", "G", "A", "B"] },
  { major: "G", minor: "Em", notes: ["G", "A", "B", "C", "D", "E", "F#"] },
  { major: "D", minor: "Bm", notes: ["D", "E", "F#", "G", "A", "B", "C#"] },
  { major: "A", minor: "F#m", notes: ["A", "B", "C#", "D", "E", "F#", "G#"] },
  { major: "E", minor: "C#m", notes: ["E", "F#", "G#", "A", "B", "C#", "D#"] },
  { major: "B", minor: "G#m", notes: ["B", "C#", "D#", "E", "F#", "G#", "A#"] },
  { major: "F#", minor: "D#m", notes: ["F#", "G#", "A#", "B", "C#", "D#", "E#"] },
  { major: "F", minor: "Dm", notes: ["F", "G", "A", "Bb", "C", "D", "E"] },
  { major: "Bb", minor: "Gm", notes: ["Bb", "C", "D", "Eb", "F", "G", "A"] },
  { major: "Eb", minor: "Cm", notes: ["Eb", "F", "G", "Ab", "Bb", "C", "D"] },
  { major: "Ab", minor: "Fm", notes: ["Ab", "Bb", "C", "Db", "Eb", "F", "G"] },
  { major: "Db", minor: "Bbm", notes: ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"] },
];

/** Major scale intervals in semitones */
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

/** Minor scale intervals in semitones */
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

/** Keys that conventionally use flats */
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"]);

/** Nashville number to scale degree mapping for major key */
export const MAJOR_DEGREES: { number: string; quality: string; interval: number }[] = [
  { number: "1", quality: "major", interval: 0 },
  { number: "2-", quality: "minor", interval: 2 },
  { number: "3-", quality: "minor", interval: 4 },
  { number: "4", quality: "major", interval: 5 },
  { number: "5", quality: "major", interval: 7 },
  { number: "6-", quality: "minor", interval: 9 },
  { number: "7°", quality: "dim", interval: 11 },
];

/** Nashville number to scale degree mapping for minor key */
export const MINOR_DEGREES: { number: string; quality: string; interval: number }[] = [
  { number: "1-", quality: "minor", interval: 0 },
  { number: "2°", quality: "dim", interval: 2 },
  { number: "♭3", quality: "major", interval: 3 },
  { number: "4-", quality: "minor", interval: 5 },
  { number: "5-", quality: "minor", interval: 7 },
  { number: "5", quality: "major", interval: 7 }, // harmonic minor V
  { number: "♭6", quality: "major", interval: 8 },
  { number: "♭7", quality: "major", interval: 10 },
];

/**
 * Normalize a key string to canonical form.
 * Handles: "F#", "F# major", "F# minor", "F#m", "Gb", etc.
 */
export function normalizeKey(keyStr: string): string | null {
  if (!keyStr) return null;
  let s = keyStr.trim();

  const lower = s.toLowerCase();
  if (["tbd", "unknown", "---", "none"].includes(lower)) return null;

  // Replace unicode symbols
  s = s.replace(/♯/g, "#").replace(/♭/g, "b");

  // Handle "F#/Gb" slash format — take first option
  if (s.includes("/")) s = s.split("/")[0].trim();

  // Remove parenthetical notes
  s = s.replace(/\(.*?\)/g, "").trim();

  // Handle "X major" / "X minor"
  let minor = false;
  if (/minor/i.test(s)) {
    minor = true;
    s = s.replace(/\s*minor\s*/i, "").trim();
  } else if (/major/i.test(s)) {
    s = s.replace(/\s*major\s*/i, "").trim();
  }

  // Handle trailing 'm' for minor
  if (s.endsWith("m") && s.length > 1) {
    minor = true;
  }

  // Extract note name
  const match = s.match(/^([A-G][#b]?)m?$/);
  if (match) {
    const note = match[1];
    if (s.endsWith("m")) minor = true;
    const result = note + (minor ? "m" : "");
    return ENHARMONIC[result] ?? result;
  }

  return s;
}

/**
 * Get the note index in the chromatic scale (0-11).
 */
export function noteIndex(note: string): number {
  const normalized = ENHARMONIC[note] ?? note;
  const idx = CHROMATIC_SHARPS.indexOf(normalized as typeof CHROMATIC_SHARPS[number]);
  return idx >= 0 ? idx : -1;
}

/**
 * Get a note name from chromatic index, respecting key preference for flats/sharps.
 */
export function noteName(index: number, useFlats: boolean): string {
  const i = ((index % 12) + 12) % 12;
  return useFlats ? CHROMATIC_FLATS[i] : CHROMATIC_SHARPS[i];
}

/**
 * Determine if a key conventionally uses flats.
 */
export function usesFlats(key: string): boolean {
  return FLAT_KEYS.has(key);
}

/**
 * Build a chord map for a given key.
 */
export function buildChordMap(
  key: string
): { number: string; quality: string; chord: string }[] {
  const isMinor = key.endsWith("m");
  const root = isMinor ? key.slice(0, -1) : key;
  const rootIdx = noteIndex(root);
  if (rootIdx < 0) return [];

  const flat = usesFlats(key);
  const degrees = isMinor ? MINOR_DEGREES : MAJOR_DEGREES;

  return degrees.map((d) => {
    const chordRoot = noteName(rootIdx + d.interval, flat);
    let chord = chordRoot;
    if (d.quality === "minor") chord += "m";
    else if (d.quality === "dim") chord += "dim";
    return { number: d.number, quality: d.quality, chord };
  });
}

/**
 * Calculate the semitone distance between two keys.
 */
export function semitoneDistance(fromKey: string, toKey: string): number {
  const fromRoot = fromKey.endsWith("m") ? fromKey.slice(0, -1) : fromKey;
  const toRoot = toKey.endsWith("m") ? toKey.slice(0, -1) : toKey;
  const fromIdx = noteIndex(fromRoot);
  const toIdx = noteIndex(toRoot);
  if (fromIdx < 0 || toIdx < 0) return 0;
  return ((toIdx - fromIdx) + 12) % 12;
}

/**
 * Calculate recommended capo position for guitar-friendly shapes.
 * Returns { capoFret, shapesKey } or null if no capo needed.
 */
export function calculateCapo(
  concertKey: string
): { capoFret: number; shapesKey: string } | null {
  // Guitar-friendly open chord keys
  const friendlyKeys = ["C", "G", "D", "A", "E", "Am", "Em", "Dm"];
  const isMinor = concertKey.endsWith("m");
  const root = isMinor ? concertKey.slice(0, -1) : concertKey;
  const rootIdx = noteIndex(root);
  if (rootIdx < 0) return null;

  // If already a friendly key, no capo needed
  if (friendlyKeys.includes(concertKey)) return null;

  // Find the best capo position (lowest fret, most common shapes)
  let bestCapo = 0;
  let bestShapes = concertKey;

  for (const fk of friendlyKeys) {
    const fkIsMinor = fk.endsWith("m");
    if (fkIsMinor !== isMinor) continue;

    const fkRoot = fkIsMinor ? fk.slice(0, -1) : fk;
    const fkIdx = noteIndex(fkRoot);
    const capo = ((rootIdx - fkIdx) + 12) % 12;

    if (capo > 0 && capo <= 7) {
      if (bestCapo === 0 || capo < bestCapo) {
        bestCapo = capo;
        bestShapes = fk;
      }
    }
  }

  if (bestCapo === 0) return null;
  return { capoFret: bestCapo, shapesKey: bestShapes };
}

/**
 * Extract BPM from a tempo string like "~88 BPM" or "120-130 BPM".
 */
export function parseTempo(tempoStr: string): number | null {
  if (!tempoStr) return null;
  const match = tempoStr.match(/~?(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Find which key family a key belongs to.
 */
export function findKeyFamily(key: string): typeof KEY_FAMILIES[number] | null {
  const norm = normalizeKey(key);
  if (!norm) return null;

  for (const family of KEY_FAMILIES) {
    if (normalizeKey(family.major) === norm || normalizeKey(family.minor) === norm) {
      return family;
    }
  }
  return null;
}
