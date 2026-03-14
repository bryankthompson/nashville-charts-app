/**
 * Nashville Number System chart parser.
 * Converts .md chart files into structured ParsedChart JSON
 * using a line-by-line state machine.
 *
 * States: TITLE -> HEADER -> CHORD_MAP -> SONG_MAP -> SECTIONS -> NOTES
 * Delimiters: ━ separator lines mark transitions.
 */

import type {
  ParsedChart,
  ChartMetadata,
  ChordMapEntry,
  SongMapEntry,
  ChartSection,
  Measure,
} from "../shared/chart-types.ts";

type ParserState =
  | "START"
  | "TITLE"
  | "HEADER"
  | "BODY_PRE_SECTIONS"
  | "SECTIONS"
  | "NOTES";

const SEPARATOR = /^[━═]{3,}/;
const SECTION_LABEL = /^\[([^\]]+)\]/;
const CHORD_MAP_HEADER = /^CHORD MAP/i;
const SONG_MAP_HEADER = /^SONG MAP/i;
const NOTES_HEADER = /^NOTES:?$/i;
const METADATA_LINE = /^\s*(Key|Tuning|Capo|Shapes|Time|Tempo|Feel|Duration|Arc):\s*(.+)/i;
const CHORD_MAP_ENTRY = /(\S+)\s*=\s*(\S+)/g;
const SONG_MAP_LINE = /^\s*(.+?):\s+(.+)$/;
const MEDLEY_TITLE = /^MEDLEY\s+[A-Z]/i;

/**
 * Determine if a line is a chord line (contains NNS numbers at the start or spaced out).
 * Chord lines contain tokens like: 1, 4-, 5, 6-, ♭7, 1/6, |, (x2), etc.
 * They do NOT start with spaces followed by lowercase lyrics.
 */
function isChordLine(line: string): boolean {
  if (!line.trim()) return false;

  // Lines starting with | are bar-delimited chord lines
  if (line.trim().startsWith("|")) return true;

  // Lines that are repeat markers
  if (/^\s*\(same\b/i.test(line)) return false;

  // Chord tokens: digits with optional modifiers, flats, sharps, slash chords
  const chordTokenPattern = /^[1-7♭♯#b]/;
  const tokens = line.trim().split(/\s+/);
  if (tokens.length === 0) return false;

  // First token should look like a chord number
  const first = tokens[0];
  if (chordTokenPattern.test(first)) {
    // Additional heuristic: chord lines don't start with common lyric words
    const lyricStarts = /^(a|the|and|but|or|i|you|he|she|we|they|my|your|is|was|in|on|at|to|for|of|it|not|no|oh|so)/i;
    if (lyricStarts.test(first) && !/^\d/.test(first)) return false;
    return true;
  }

  return false;
}

/**
 * Parse a chord map section line into entries.
 * e.g. "  1 = A    2- = Bm    3- = C#m    4 = D"
 */
function parseChordMapLine(line: string): ChordMapEntry[] {
  const entries: ChordMapEntry[] = [];
  const regex = /([1-7♭♯#b][°\-+]?)\s*=\s*(\S+)/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    const number = match[1];
    const chord = match[2];
    let quality = "major";
    if (number.endsWith("-") || chord.endsWith("m") && !chord.endsWith("dim")) {
      quality = "minor";
    } else if (number.endsWith("°") || chord.includes("dim")) {
      quality = "dim";
    } else if (number.endsWith("+") || chord.includes("aug")) {
      quality = "aug";
    }
    entries.push({ number, quality, chord });
  }

  // Check for trailing annotation like "(borrowed minor iv)"
  const annoMatch = line.match(/\(([^)]+)\)\s*$/);
  if (annoMatch && entries.length > 0) {
    entries[entries.length - 1].note = annoMatch[1];
  }

  return entries;
}

/**
 * Parse a full chart file content into a ParsedChart.
 */
export function parseChart(content: string): ParsedChart {
  const lines = content.split("\n");
  let state: ParserState = "START";

  const result: ParsedChart = {
    title: "",
    artist: "",
    metadata: {} as ChartMetadata,
    chordMap: [],
    songMap: [],
    sections: [],
    notes: [],
    isMedley: false,
    raw: content,
  };

  let currentSection: ChartSection | null = null;
  let inChordMap = false;
  let inSongMap = false;
  let inNotes = false;
  let separatorCount = 0;
  let pendingChordLine: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track separator lines
    if (SEPARATOR.test(trimmed)) {
      separatorCount++;

      // Flush any pending section
      if (currentSection) {
        flushPendingChord(currentSection, pendingChordLine);
        pendingChordLine = null;
        result.sections.push(currentSection);
        currentSection = null;
      }

      if (state === "START") {
        state = "TITLE";
        continue;
      }

      if (state === "TITLE") {
        state = "HEADER";
        continue;
      }

      if (state === "HEADER") {
        state = "BODY_PRE_SECTIONS";
        continue;
      }

      // A separator after we've started sections means we're transitioning
      if (state === "SECTIONS" || state === "BODY_PRE_SECTIONS") {
        // Check if next non-empty line is NOTES:
        const nextNonEmpty = findNextNonEmpty(lines, i + 1);
        if (nextNonEmpty && NOTES_HEADER.test(nextNonEmpty.trim())) {
          state = "NOTES";
          inChordMap = false;
          inSongMap = false;
        }
        continue;
      }

      if (state === "NOTES") {
        // End of notes section
        continue;
      }

      continue;
    }

    // Skip empty lines in certain states
    if (!trimmed) {
      if (state === "SECTIONS" && currentSection) {
        // Empty line within a section — might separate verse blocks
        // Don't flush, just continue
      }
      inChordMap = false;
      inSongMap = false;
      continue;
    }

    // Process based on state
    switch (state) {
      case "TITLE": {
        if (!result.title) {
          result.title = trimmed;
          if (MEDLEY_TITLE.test(trimmed)) {
            result.isMedley = true;
          }
        } else if (!result.artist) {
          result.artist = trimmed;
        }
        break;
      }

      case "HEADER": {
        const metaMatch = trimmed.match(METADATA_LINE);
        if (metaMatch) {
          const field = metaMatch[1].toLowerCase() as keyof ChartMetadata;
          result.metadata[field] = metaMatch[2].trim();
        }
        break;
      }

      case "BODY_PRE_SECTIONS": {
        // We're between the header separator and the first section label.
        // This area contains CHORD MAP, SONG MAP, or section labels.

        if (CHORD_MAP_HEADER.test(trimmed)) {
          inChordMap = true;
          inSongMap = false;
          continue;
        }

        if (SONG_MAP_HEADER.test(trimmed)) {
          inSongMap = true;
          inChordMap = false;
          continue;
        }

        if (inChordMap) {
          const entries = parseChordMapLine(trimmed);
          result.chordMap.push(...entries);
          continue;
        }

        if (inSongMap) {
          const mapMatch = trimmed.match(SONG_MAP_LINE);
          if (mapMatch) {
            result.songMap.push({
              section: mapMatch[1].trim(),
              progression: mapMatch[2].trim(),
            });
          }
          continue;
        }

        // Check if this is a section label — transition to SECTIONS state
        if (SECTION_LABEL.test(trimmed)) {
          state = "SECTIONS";
          // Fall through to SECTIONS handling below
        } else {
          continue;
        }
      }
      // NOTE: intentional fallthrough from BODY_PRE_SECTIONS when section label found

      case "SECTIONS": {
        if (NOTES_HEADER.test(trimmed)) {
          if (currentSection) {
            flushPendingChord(currentSection, pendingChordLine);
            pendingChordLine = null;
            result.sections.push(currentSection);
            currentSection = null;
          }
          state = "NOTES";
          inNotes = true;
          continue;
        }

        const sectionMatch = trimmed.match(SECTION_LABEL);
        if (sectionMatch) {
          // Save previous section
          if (currentSection) {
            flushPendingChord(currentSection, pendingChordLine);
            pendingChordLine = null;
            result.sections.push(currentSection);
          }

          currentSection = {
            label: sectionMatch[1],
            measures: [],
            isRepeat: false,
          };
          continue;
        }

        if (!currentSection) continue;

        // Check for repeat marker
        if (/^\s*\(same\s+(chord\s+)?pattern/i.test(trimmed)) {
          currentSection.isRepeat = true;
          currentSection.repeatNote = trimmed.replace(/^\s*\(/, "").replace(/\)\s*$/, "");
          continue;
        }

        // Parse chord/lyric pairs within section
        if (isChordLine(line)) {
          // Flush any previous pending chord that had no lyrics
          flushPendingChord(currentSection, pendingChordLine);
          pendingChordLine = line;
        } else if (pendingChordLine !== null) {
          // This is a lyric line following a chord line
          currentSection.measures.push({
            chords: pendingChordLine,
            lyrics: line,
          });
          pendingChordLine = null;
        } else {
          // Standalone lyric or annotation line
          currentSection.measures.push({
            chords: "",
            lyrics: line,
          });
        }
        break;
      }

      case "NOTES": {
        if (trimmed.startsWith("-") || trimmed.startsWith("•")) {
          result.notes.push(trimmed.replace(/^[-•]\s*/, ""));
        } else if (!NOTES_HEADER.test(trimmed)) {
          // Continuation of previous note or standalone note text
          if (result.notes.length > 0 && !trimmed.startsWith("[")) {
            // Could be a sub-section header like "BASS-SPECIFIC NOTES:"
            if (trimmed.endsWith(":")) {
              result.notes.push(trimmed);
            } else {
              // Continuation of previous note
              result.notes[result.notes.length - 1] += " " + trimmed;
            }
          } else {
            result.notes.push(trimmed);
          }
        }
        break;
      }
    }
  }

  // Flush final section
  if (currentSection) {
    flushPendingChord(currentSection, pendingChordLine);
    result.sections.push(currentSection);
  }

  return result;
}

/**
 * Flush a pending chord line that has no following lyric line.
 */
function flushPendingChord(
  section: ChartSection,
  pendingChordLine: string | null
): void {
  if (pendingChordLine !== null) {
    section.measures.push({
      chords: pendingChordLine,
      lyrics: "",
    });
  }
}

/**
 * Find the next non-empty line after index.
 */
function findNextNonEmpty(lines: string[], startIdx: number): string | null {
  for (let i = startIdx; i < lines.length; i++) {
    if (lines[i].trim()) return lines[i];
  }
  return null;
}

/**
 * Parse a chart filename into components.
 * e.g., "key_fsm-3_doors_down-loser.md" -> { key: "F#m", artist: "3 doors down", song: "loser" }
 */
export function parseChartFilename(filename: string): {
  key: string;
  artist: string;
  song: string;
} | null {
  const name = filename.replace(/\.md$/, "");
  if (!name.startsWith("key_")) return null;

  const remainder = name.slice(4); // strip "key_"
  const dashIdx = remainder.indexOf("-");
  if (dashIdx < 0) return null;

  const keyCode = remainder.slice(0, dashIdx);
  const rest = remainder.slice(dashIdx + 1);

  const key = decodeFilenameKey(keyCode);
  if (!key) return null;

  const artistSongIdx = rest.indexOf("-");
  if (artistSongIdx < 0) return null;

  const artist = rest.slice(0, artistSongIdx).replace(/_/g, " ");
  const song = rest.slice(artistSongIdx + 1).replace(/_/g, " ");

  return { key, artist, song };
}

/** Filename key code to display key mapping */
const FILENAME_KEY_MAP: Record<string, string> = {
  a: "A", bb: "Bb", b: "B", c: "C", cs: "C#",
  db: "Db", d: "D", eb: "Eb", e: "E",
  f: "F", fs: "F#", gb: "Gb", g: "G",
  gs: "G#", ab: "Ab",
  am: "Am", bbm: "Bbm", bm: "Bm", cm: "Cm", csm: "C#m",
  dbm: "Dbm", dm: "Dm", ebm: "Ebm", em: "Em",
  fm: "Fm", fsm: "F#m", gbm: "Gbm", gm: "Gm",
  gsm: "G#m", abm: "Abm",
};

function decodeFilenameKey(code: string): string | null {
  return FILENAME_KEY_MAP[code.toLowerCase()] ?? null;
}
