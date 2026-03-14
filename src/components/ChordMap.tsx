import React from "react";
import type { ChordMapEntry, TransposeResult } from "../../shared/chart-types";

interface Props {
  chordMap: ChordMapEntry[];
  keyName: string;
  transposition?: TransposeResult;
}

function qualityBadge(quality: string): string {
  switch (quality) {
    case "minor":
      return "min";
    case "dim":
      return "dim";
    case "aug":
      return "aug";
    default:
      return "maj";
  }
}

function numberClass(number: string): string {
  const base = number.replace(/[°\-+♭♯#b]/g, "");
  switch (base) {
    case "1": return "chord-1";
    case "2": return "chord-2";
    case "3": return "chord-3";
    case "4": return "chord-4";
    case "5": return "chord-5";
    case "6": return "chord-6";
    case "7": return "chord-7";
    default: return "chord-non-diatonic";
  }
}

export function ChordMap({ chordMap, keyName, transposition }: Props) {
  const displayMap = transposition ? transposition.chordMap : chordMap;
  const displayKey = transposition ? transposition.newKey : keyName;

  return (
    <div className="chord-map">
      <div className="chord-map-header">
        CHORD MAP (Key of {displayKey})
        {transposition && transposition.originalKey !== transposition.newKey && (
          <span className="transpose-badge">
            transposed from {transposition.originalKey}
            {transposition.capoFret !== null && (
              <> | Capo {transposition.capoFret}</>
            )}
          </span>
        )}
      </div>
      <div className="chord-map-grid">
        {displayMap.map((entry, i) => (
          <div key={i} className={`chord-map-entry ${numberClass(entry.number)}`}>
            <span className="chord-number">{entry.number}</span>
            <span className="chord-equals">=</span>
            <span className="chord-name">{entry.chord}</span>
            {entry.note && <span className="chord-note">({entry.note})</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
