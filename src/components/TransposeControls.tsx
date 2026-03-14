import React from "react";
import type { TransposeResult } from "../../shared/chart-types";

interface Props {
  originalKey: string;
  transposition?: TransposeResult;
}

const ALL_MAJOR_KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const ALL_MINOR_KEYS = ["Am", "Bbm", "Bm", "Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m"];

export function TransposeControls({ originalKey, transposition }: Props) {
  const isMinor = originalKey.endsWith("m");
  const keys = isMinor ? ALL_MINOR_KEYS : ALL_MAJOR_KEYS;
  const currentKey = transposition?.newKey ?? originalKey;

  return (
    <div className="transpose-controls">
      <div className="transpose-header">Transpose</div>
      <div className="key-selector">
        {keys.map((k) => (
          <button
            key={k}
            className={`key-btn ${k === currentKey ? "active" : ""} ${k === originalKey ? "original" : ""}`}
            title={k === originalKey ? "Original key" : `Transpose to ${k}`}
          >
            {k}
          </button>
        ))}
      </div>
      {transposition?.capoFret != null && (
        <div className="capo-recommendation">
          Capo fret {transposition.capoFret} recommended
        </div>
      )}
    </div>
  );
}
