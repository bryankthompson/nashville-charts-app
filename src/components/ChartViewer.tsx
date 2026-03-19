import React, { useState } from "react";
import type { App } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ParsedChart, TransposeResult } from "../../shared/chart-types";
import { ChordMap } from "./ChordMap";
import { SongMap } from "./SongMap";
import { SectionBlock } from "./SectionBlock";

const MAJOR_KEYS = ["A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab"];
const MINOR_KEYS = ["Am", "Bbm", "Bm", "Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m"];

interface Props {
  app: App;
  chart: ParsedChart;
  transposition?: TransposeResult;
  onToolResult: (result: CallToolResult) => void;
}

export function ChartViewer({ app, chart, transposition, onToolResult }: Props) {
  const [allExpanded, setAllExpanded] = useState(true);
  const [transposing, setTransposing] = useState(false);

  const meta = chart.metadata;
  const currentKey = transposition ? transposition.newKey : meta.key;
  const isMinor = meta.key?.endsWith("m");
  const keys = isMinor ? MINOR_KEYS : MAJOR_KEYS;

  const handleTranspose = async (newKey: string) => {
    if (newKey === currentKey) return;
    setTransposing(true);
    try {
      const result = await app.callServerTool({
        name: "transpose-chart",
        arguments: { query: chart.title, newKey },
      });
      onToolResult(result);
    } catch (err) {
      console.error("Failed to transpose:", err);
    } finally {
      setTransposing(false);
    }
  };

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

      {/* Transpose Controls */}
      {meta.key && (
        <div className="transpose-controls">
          <div className="transpose-header">
            Transpose{transposing && " ..."}
          </div>
          <div className="key-selector">
            {keys.map((k) => (
              <button
                key={k}
                className={`key-btn${k === currentKey ? " active" : ""}${k === meta.key ? " original" : ""}`}
                onClick={() => handleTranspose(k)}
                disabled={transposing}
              >
                {k}
              </button>
            ))}
          </div>
          {transposition?.capoFret != null && (
            <div className="capo-recommendation">
              Capo fret {transposition.capoFret}
              {transposition.shapesKey && ` (play ${transposition.shapesKey} shapes)`}
            </div>
          )}
        </div>
      )}

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
