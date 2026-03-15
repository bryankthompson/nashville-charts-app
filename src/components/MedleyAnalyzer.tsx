import React from "react";
import type { MedleyScore } from "../../shared/chart-types";

interface Props {
  scores: MedleyScore[];
  chartCount: number;
}

function scoreColor(score: number, max: number): string {
  const ratio = score / max;
  if (ratio >= 0.75) return "score-excellent";
  if (ratio >= 0.5) return "score-good";
  if (ratio >= 0.25) return "score-fair";
  return "score-poor";
}

function ScoreBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="score-bar-container">
      <span className="score-bar-label">{label}</span>
      <div className="score-bar-track">
        <div
          className={`score-bar-fill ${scoreColor(value, max)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="score-bar-value">
        {value}/{max}
      </span>
    </div>
  );
}

export function MedleyAnalyzer({ scores, chartCount }: Props) {
  const maxTotal = 3 + 3 + 3 + 3 + 2; // key + tempo + time + hook + bonus = 14

  return (
    <div className="medley-analyzer">
      <div className="analyzer-header">
        <h1>Medley Compatibility Analysis</h1>
        <span className="chart-count">{chartCount} songs analyzed</span>
      </div>

      <div className="pair-list">
        {scores.map((score, i) => (
          <div key={i} className={`pair-card ${scoreColor(score.total, maxTotal)}`}>
            <div className="pair-songs">
              <div className="pair-songs-names">
                <span className="song-name">{score.songA}</span>
                <span className="pair-divider">+</span>
                <span className="song-name">{score.songB}</span>
              </div>
              <div className="pair-total">
                <span className="total-score">{score.total}</span>
                <span className="total-max">/{maxTotal}</span>
              </div>
            </div>
            <div className="pair-breakdown">
              <ScoreBar value={score.keyScore} max={3} label="Key" />
              <ScoreBar value={score.tempoScore} max={3} label="Tempo" />
              <ScoreBar value={score.timeScore} max={3} label="Time" />
              <ScoreBar value={score.hookScore} max={3} label="Hook" />
              {score.bonus > 0 && (
                <ScoreBar value={score.bonus} max={2} label="Bonus" />
              )}
            </div>
            {score.notes.length > 0 && (
              <div className="pair-notes">
                {score.notes.map((note, j) => (
                  <div key={j} className="note-item">
                    {note}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
