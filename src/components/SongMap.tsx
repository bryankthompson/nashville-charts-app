import React from "react";
import type { SongMapEntry } from "../../shared/chart-types";

interface Props {
  songMap: SongMapEntry[];
}

export function SongMap({ songMap }: Props) {
  if (songMap.length === 0) return null;

  return (
    <div className="song-map">
      <div className="song-map-header">SONG MAP</div>
      <div className="song-map-body">
        {songMap.map((entry, i) => (
          <div key={i} className="song-map-entry">
            {entry.section === "Flow" ? (
              <span className="song-map-flow">{entry.progression}</span>
            ) : (
              <>
                <span className="song-map-section">{entry.section}:</span>
                <span className="song-map-progression">{entry.progression}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
