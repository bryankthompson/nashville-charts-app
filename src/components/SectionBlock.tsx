import React, { useState } from "react";
import type { ChartSection } from "../../shared/chart-types";

interface Props {
  section: ChartSection;
  defaultExpanded?: boolean;
}

/** Map NNS chord numbers to CSS color classes */
function chordClass(token: string): string {
  const cleaned = token.replace(/[|()x\d,\s]/g, "").trim();
  if (!cleaned) return "";

  // Root/tonic
  if (/^1(?:[/-]|$)/.test(cleaned)) return "chord-1";
  // 2 (minor)
  if (/^2/.test(cleaned)) return "chord-2";
  // 3 (minor)
  if (/^3/.test(cleaned)) return "chord-3";
  // 4 (subdominant)
  if (/^4/.test(cleaned)) return "chord-4";
  // 5 (dominant)
  if (/^5/.test(cleaned)) return "chord-5";
  // 6 (relative minor)
  if (/^6/.test(cleaned)) return "chord-6";
  // 7 (diminished)
  if (/^7/.test(cleaned)) return "chord-7";
  // Flat chords (non-diatonic)
  if (/^[♭b#♯]/.test(cleaned)) return "chord-non-diatonic";

  return "";
}

/** Render a chord line with color-coded tokens */
function renderChordLine(line: string): React.ReactNode {
  if (!line.trim()) return null;

  // Split while preserving spacing
  const parts: React.ReactNode[] = [];
  let idx = 0;

  // Match chord tokens and everything else
  const regex = /(\|?\s*[1-7♭♯#b][°\-+\/\w#♭♯]*\s*\|?|[|]\s*)/g;
  let match: RegExpExecArray | null;
  let lastEnd = 0;

  while ((match = regex.exec(line)) !== null) {
    // Add any text before this match
    if (match.index > lastEnd) {
      parts.push(
        <span key={idx++} className="chord-space">
          {line.slice(lastEnd, match.index)}
        </span>
      );
    }

    const token = match[0];
    const cls = chordClass(token.trim());
    parts.push(
      <span key={idx++} className={cls ? `chord-token ${cls}` : "chord-token"}>
        {token}
      </span>
    );
    lastEnd = match.index + match[0].length;
  }

  // Add remaining text
  if (lastEnd < line.length) {
    parts.push(
      <span key={idx++} className="chord-space">
        {line.slice(lastEnd)}
      </span>
    );
  }

  return <div className="chord-line">{parts}</div>;
}

export function SectionBlock({ section, defaultExpanded = true }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={`section-block ${expanded ? "expanded" : "collapsed"}`}>
      <div
        className="section-header"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(!expanded); } }}
        role="button"
        tabIndex={0}
      >
        <span className="section-toggle">{expanded ? "▼" : "▶"}</span>
        <span className="section-label">[{section.label}]</span>
        {section.isRepeat && (
          <span className="section-repeat">({section.repeatNote ?? "repeat"})</span>
        )}
      </div>
      {expanded && (
        <div className="section-body">
          {section.annotations && section.annotations.length > 0 && (
            <div className="section-annotations">
              {section.annotations.map((anno, i) => (
                <div key={i} className="section-annotation">{anno}</div>
              ))}
            </div>
          )}
          {section.isRepeat && section.measures.length === 0 ? (
            <div className="repeat-marker">({section.repeatNote ?? "same chord pattern"})</div>
          ) : (
            section.measures.map((measure, i) => (
              <div key={i} className="measure-pair">
                {measure.chords && renderChordLine(measure.chords)}
                {measure.lyrics && (
                  <div className="lyric-line">{measure.lyrics}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
