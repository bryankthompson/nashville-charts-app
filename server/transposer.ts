/**
 * Key transposition engine for Nashville Number System charts.
 *
 * The beauty of NNS: chord numbers stay the same across all keys.
 * Only the chord map (number -> actual chord name) changes.
 * This module handles transposition of the chord map and capo calculation.
 */

import type { ChordMapEntry, TransposeResult } from "../shared/chart-types.ts";
import {
  noteIndex,
  noteName,
  usesFlats,
  semitoneDistance,
  calculateCapo,
  buildChordMap,
  ENHARMONIC,
} from "../shared/music-theory.ts";

/**
 * Transpose a chord map from one key to another.
 * Since NNS numbers are key-independent, we just rebuild the chord map
 * for the new key and compute a recommended capo position.
 */
export function transposeChart(
  originalKey: string,
  newKey: string,
  originalChordMap: ChordMapEntry[]
): TransposeResult {
  const semitones = semitoneDistance(originalKey, newKey);
  const flat = usesFlats(newKey);

  // Transpose each chord in the map
  const transposedMap: ChordMapEntry[] = originalChordMap.map((entry) => {
    const chordRoot = extractChordRoot(entry.chord);
    const suffix = entry.chord.slice(chordRoot.length);
    const rootIdx = noteIndex(chordRoot);

    if (rootIdx < 0) {
      return { ...entry }; // Can't transpose, keep original
    }

    const newRoot = noteName(rootIdx + semitones, flat);
    return {
      number: entry.number,
      quality: entry.quality,
      chord: newRoot + suffix,
      note: entry.note,
    };
  });

  // Calculate recommended capo
  const capo = calculateCapo(newKey);

  return {
    originalKey,
    newKey,
    capoFret: capo?.capoFret ?? null,
    chordMap: transposedMap,
  };
}

/**
 * Extract the root note from a chord name.
 * e.g., "C#m" -> "C#", "Gdim" -> "G", "Bb" -> "Bb"
 */
function extractChordRoot(chord: string): string {
  const match = chord.match(/^([A-G][#b]?)/);
  return match ? match[1] : chord;
}

/**
 * Get all available transposition options for a key,
 * sorted by guitar-friendliness (open chord keys first).
 */
export function getTranspositionOptions(originalKey: string): {
  key: string;
  semitones: number;
  capo: number | null;
  shapesKey: string | null;
}[] {
  const isMinor = originalKey.endsWith("m");
  const allKeys = isMinor
    ? ["Am", "Bbm", "Bm", "Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m"]
    : ["A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab"];

  return allKeys.map((key) => {
    const semitones = semitoneDistance(originalKey, key);
    const capoInfo = calculateCapo(key);
    return {
      key,
      semitones,
      capo: capoInfo?.capoFret ?? null,
      shapesKey: capoInfo?.shapesKey ?? null,
    };
  });
}
