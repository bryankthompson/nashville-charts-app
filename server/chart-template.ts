/**
 * Chart template generator.
 * Creates pre-filled NNS chart templates with chord maps from music theory engine.
 */

import { buildChordMap, normalizeKey, calculateCapo } from "../shared/music-theory.ts";

const SEPARATOR = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

export interface ChartTemplateInput {
  title: string;
  artist: string;
  key: string;
  tempo?: string;
  time?: string;
  feel?: string;
  tuning?: string;
  capo?: string;
}

/**
 * Generate a pre-filled NNS chart template.
 * Builds the chord map from the key using the music theory engine.
 */
export function generateChartTemplate(input: ChartTemplateInput): string {
  const normalizedKey = normalizeKey(input.key);
  if (!normalizedKey) {
    throw new Error(`Invalid key: "${input.key}"`);
  }

  // Verify the key produces a valid chord map
  const testMap = buildChordMap(normalizedKey);
  if (testMap.length === 0) {
    throw new Error(`Invalid key: "${input.key}" (no chord map could be built)`);
  }

  const isMinor = normalizedKey.endsWith("m");
  const displayKey = `${normalizedKey}${isMinor ? "" : " major"}`;
  const keyLabel = isMinor ? normalizedKey.slice(0, -1) : normalizedKey;

  // Build chord map from music theory engine
  const chordMap = buildChordMap(normalizedKey);

  // Calculate capo if not specified
  let capoStr = input.capo ?? "No capo";
  if (!input.capo) {
    const capo = calculateCapo(normalizedKey);
    if (capo) {
      capoStr = `${capo.capoFret}${ordinalSuffix(capo.capoFret)} fret`;
    }
  }

  // Format chord map entries into two rows
  const chordMapLines = formatChordMapLines(chordMap);

  const lines: string[] = [
    SEPARATOR,
    `  ${input.title.toUpperCase()}`,
    `  ${input.artist}`,
    SEPARATOR,
    `  Key:     ${displayKey}`,
    `  Tuning:  ${input.tuning ?? "Standard"}`,
    `  Capo:    ${capoStr}`,
    `  Time:    ${input.time ?? "4/4"}`,
    `  Tempo:   ${input.tempo ?? "~120 BPM"}`,
    `  Feel:    ${input.feel ?? "[describe the feel]"}`,
    SEPARATOR,
    "",
    `CHORD MAP (Key of ${keyLabel})`,
    ...chordMapLines,
    "",
    "SONG MAP",
    "  Verse:      [fill in progression]",
    "  Chorus:     [fill in progression]",
    "",
    SEPARATOR,
    "",
    "[VERSE 1]",
    "[chords above lyrics here]",
    "",
    "[CHORUS]",
    "[chords above lyrics here]",
    "",
    SEPARATOR,
    "NOTES:",
    "  - [sources, techniques, special notes]",
    SEPARATOR,
    "",
  ];

  return lines.join("\n");
}

/**
 * Format chord map entries into aligned rows (4 per row).
 */
function formatChordMapLines(
  chordMap: { number: string; quality: string; chord: string }[]
): string[] {
  const entries = chordMap.map((e) => `${e.number} = ${e.chord}`);
  const lines: string[] = [];

  for (let i = 0; i < entries.length; i += 4) {
    const row = entries.slice(i, i + 4);
    lines.push("  " + row.map((e) => e.padEnd(14)).join("").trimEnd());
  }

  return lines;
}

function ordinalSuffix(n: number): string {
  if (n === 1) return "st";
  if (n === 2) return "nd";
  if (n === 3) return "rd";
  return "th";
}
