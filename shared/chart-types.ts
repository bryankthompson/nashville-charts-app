/** Metadata from a chart header */
export interface ChartMetadata {
  key: string;
  tuning?: string;
  capo?: string;
  shapes?: string;
  time?: string;
  tempo?: string;
  feel?: string;
  duration?: string;
  arc?: string;
}

/** A single entry in the chord map */
export interface ChordMapEntry {
  number: string; // e.g. "1", "4-", "♭7", "5"
  quality: string; // e.g. "major", "minor", "dim"
  chord: string; // e.g. "G", "Dm", "F#dim"
  note?: string; // optional annotation e.g. "(borrowed minor iv)"
}

/** A section entry in the song map */
export interface SongMapEntry {
  section: string; // e.g. "Verse", "Chorus"
  progression: string; // e.g. "1 - 5 - 6- - 4 (x2)"
}

/** A single measure within a section */
export interface Measure {
  chords: string; // The chord line (NNS numbers)
  lyrics: string; // The lyric line below
}

/** A section of the chart (VERSE, CHORUS, etc.) */
export interface ChartSection {
  label: string; // e.g. "VERSE 1", "CHORUS", "BRIDGE"
  measures: Measure[];
  isRepeat: boolean; // true if "(same chord pattern)" etc.
  repeatNote?: string; // e.g. "same chord pattern as Verse 1"
}

/** Medley transition block */
export interface MedleyTransition {
  from: string;
  to: string;
  details: string[];
}

/** Fully parsed chart */
export interface ParsedChart {
  title: string;
  artist: string;
  metadata: ChartMetadata;
  chordMap: ChordMapEntry[];
  songMap: SongMapEntry[];
  sections: ChartSection[];
  notes: string[];
  isMedley: boolean;
  raw: string;
}

/** Chart file listing entry */
export interface ChartListEntry {
  filename: string;
  title: string;
  artist: string;
  key: string;
  path: string;
}

/** Transposition result */
export interface TransposeResult {
  originalKey: string;
  newKey: string;
  capoFret: number | null;
  chordMap: ChordMapEntry[];
}

/** Medley compatibility score */
export interface MedleyScore {
  songA: string;
  songB: string;
  keyScore: number;
  tempoScore: number;
  timeScore: number;
  hookScore: number;
  bonus: number;
  total: number;
  notes: string[];
}
