import React, { useState } from "react";
import type { ParsedChart, TransposeResult } from "../../shared/chart-types";
import { ChordMap } from "./ChordMap";
import { SongMap } from "./SongMap";
import { SectionBlock } from "./SectionBlock";

interface Props {
  chart: ParsedChart;
  transposition?: TransposeResult;
}

export function ChartViewer({ chart, transposition }: Props) {
  const [allExpanded, setAllExpanded] = useState(true);

  const meta = chart.metadata;

  return (
    <div className="chart-viewer">
      {/* Sticky Header */}
      <div className="chart-header-sticky">
        <div className="chart-title-block">
          <h1 className="chart-title">{chart.title}</h1>
          <h2 className="chart-artist">{chart.artist}</h2>
          {chart.isMedley && <span className="medley-badge">MEDLEY</span>}
        </div>

        <div className="chart-metadata">
          {meta.key && (
            <div className="meta-item">
              <span className="meta-label">Key:</span>
              <span className="meta-value">{transposition ? transposition.newKey : meta.key}</span>
              {transposition && transposition.originalKey !== transposition.newKey && (
                <span className="meta-original">(from {transposition.originalKey})</span>
              )}
            </div>
          )}
          {meta.tuning && (
            <div className="meta-item">
              <span className="meta-label">Tuning:</span>
              <span className="meta-value">{meta.tuning}</span>
            </div>
          )}
          {meta.capo && (
            <div className="meta-item">
              <span className="meta-label">Capo:</span>
              <span className="meta-value">
                {transposition?.capoFret != null
                  ? `Fret ${transposition.capoFret}`
                  : meta.capo}
              </span>
            </div>
          )}
          {meta.shapes && (
            <div className="meta-item">
              <span className="meta-label">Shapes:</span>
              <span className="meta-value">{meta.shapes}</span>
            </div>
          )}
          {meta.time && (
            <div className="meta-item">
              <span className="meta-label">Time:</span>
              <span className="meta-value">{meta.time}</span>
            </div>
          )}
          {meta.tempo && (
            <div className="meta-item">
              <span className="meta-label">Tempo:</span>
              <span className="meta-value">{meta.tempo}</span>
            </div>
          )}
          {meta.feel && (
            <div className="meta-item">
              <span className="meta-label">Feel:</span>
              <span className="meta-value">{meta.feel}</span>
            </div>
          )}
        </div>

        <ChordMap
          chordMap={chart.chordMap}
          keyName={meta.key ?? "?"}
          transposition={transposition}
        />
      </div>

      {/* Song Map */}
      {chart.songMap.length > 0 && <SongMap songMap={chart.songMap} />}

      {/* Expand/Collapse All */}
      <div className="section-controls">
        <button
          className="btn-toggle-all"
          onClick={() => setAllExpanded(!allExpanded)}
        >
          {allExpanded ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* Sections */}
      <div className="chart-sections">
        {chart.sections.map((section, i) => (
          <SectionBlock
            key={i}
            section={section}
            defaultExpanded={allExpanded}
          />
        ))}
      </div>

      {/* Notes */}
      {chart.notes.length > 0 && (
        <div className="chart-notes">
          <div className="notes-header">NOTES</div>
          <ul className="notes-list">
            {chart.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
