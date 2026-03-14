/**
 * Medley compatibility scoring algorithm.
 * Based on scoring criteria from CLAUDE.md medley creation workflow.
 *
 * Scoring matrix:
 * | Factor    | 3 Points              | 2 Points                    | 1 Point                          |
 * |-----------|-----------------------|-----------------------------|----------------------------------|
 * | Key       | Same key              | Relative major/minor        | Parallel major/minor             |
 * | Tempo     | Within 10 BPM         | Within 20 BPM               | Within 30 BPM or half/double     |
 * | Time Sig  | Same                  | Compatible (4/4 with 6/8)   | Different                        |
 * | Hook      | Iconic                | Strong hook                 | Moderate                         |
 * | Bonus     | Tempo ramp potential   | +2 points                   |                                  |
 */

import type { ParsedChart, MedleyScore } from "../shared/chart-types.ts";
import { normalizeKey, findKeyFamily, parseTempo, RELATIVE_PAIRS, RELATIVE_PAIRS_REV } from "../shared/music-theory.ts";

/**
 * Score two songs for medley compatibility.
 */
export function scoreMedley(chartA: ParsedChart, chartB: ParsedChart): MedleyScore {
  const notes: string[] = [];

  const keyScore = scoreKey(chartA, chartB, notes);
  const tempoScore = scoreTempo(chartA, chartB, notes);
  const timeScore = scoreTimeSig(chartA, chartB, notes);
  // Hook scoring requires subjective assessment — default to 2 (strong)
  const hookScore = 2;
  const bonus = scoreBonus(chartA, chartB, notes);

  return {
    songA: chartA.title,
    songB: chartB.title,
    keyScore,
    tempoScore,
    timeScore,
    hookScore,
    bonus,
    total: keyScore + tempoScore + timeScore + hookScore + bonus,
    notes,
  };
}

function scoreKey(a: ParsedChart, b: ParsedChart, notes: string[]): number {
  const keyA = normalizeKey(a.metadata.key ?? "");
  const keyB = normalizeKey(b.metadata.key ?? "");

  if (!keyA || !keyB) {
    notes.push("Key data missing — cannot score key compatibility");
    return 0;
  }

  // Same key
  if (keyA === keyB) {
    notes.push(`Same key: ${a.metadata.key}`);
    return 3;
  }

  // Relative major/minor
  const familyA = findKeyFamily(a.metadata.key ?? "");
  const familyB = findKeyFamily(b.metadata.key ?? "");
  if (familyA && familyB && familyA.major === familyB.major) {
    notes.push(`Relative keys: ${a.metadata.key} ↔ ${b.metadata.key} (same key family)`);
    return 2;
  }

  // Parallel major/minor (same root, different quality)
  const rootA = keyA.replace("m", "");
  const rootB = keyB.replace("m", "");
  if (rootA === rootB) {
    notes.push(`Parallel major/minor: ${a.metadata.key} ↔ ${b.metadata.key}`);
    return 1;
  }

  notes.push(`Different keys: ${a.metadata.key} vs ${b.metadata.key}`);
  return 0;
}

function scoreTempo(a: ParsedChart, b: ParsedChart, notes: string[]): number {
  const bpmA = parseTempo(a.metadata.tempo ?? "");
  const bpmB = parseTempo(b.metadata.tempo ?? "");

  if (bpmA === null || bpmB === null) {
    notes.push("Tempo data missing — cannot score tempo compatibility");
    return 0;
  }

  const diff = Math.abs(bpmA - bpmB);

  // Check half/double time
  const halfDouble = Math.abs(bpmA - bpmB * 2) <= 10 || Math.abs(bpmA * 2 - bpmB) <= 10;

  if (diff <= 10) {
    notes.push(`Tempos within 10 BPM: ${bpmA} vs ${bpmB}`);
    return 3;
  }
  if (diff <= 20) {
    notes.push(`Tempos within 20 BPM: ${bpmA} vs ${bpmB}`);
    return 2;
  }
  if (diff <= 30 || halfDouble) {
    const halfDoubleNote = halfDouble ? " (half/double time compatible)" : "";
    notes.push(`Tempos within 30 BPM: ${bpmA} vs ${bpmB}${halfDoubleNote}`);
    return 1;
  }

  notes.push(`Large tempo gap: ${bpmA} vs ${bpmB} (${diff} BPM apart)`);
  return 0;
}

function scoreTimeSig(a: ParsedChart, b: ParsedChart, notes: string[]): number {
  const timeA = a.metadata.time ?? "";
  const timeB = b.metadata.time ?? "";

  if (!timeA || !timeB) {
    notes.push("Time signature data missing");
    return 0;
  }

  if (timeA === timeB) {
    notes.push(`Same time signature: ${timeA}`);
    return 3;
  }

  // Compatible pairs
  const compatible = [
    ["4/4", "6/8"],
    ["4/4", "12/8"],
    ["3/4", "6/8"],
  ];
  const isCompatible = compatible.some(
    ([x, y]) => (timeA === x && timeB === y) || (timeA === y && timeB === x)
  );

  if (isCompatible) {
    notes.push(`Compatible time signatures: ${timeA} ↔ ${timeB}`);
    return 2;
  }

  notes.push(`Different time signatures: ${timeA} vs ${timeB}`);
  return 1;
}

function scoreBonus(a: ParsedChart, b: ParsedChart, notes: string[]): number {
  const bpmA = parseTempo(a.metadata.tempo ?? "");
  const bpmB = parseTempo(b.metadata.tempo ?? "");

  if (bpmA !== null && bpmB !== null && bpmB > bpmA && bpmB - bpmA <= 20) {
    notes.push("Tempo ramp potential: songs can be ordered to build energy (+2)");
    return 2;
  }

  return 0;
}

/**
 * Score all pairs in a list of charts and return sorted results.
 */
export function scoreAllPairs(charts: ParsedChart[]): MedleyScore[] {
  const scores: MedleyScore[] = [];

  for (let i = 0; i < charts.length; i++) {
    for (let j = i + 1; j < charts.length; j++) {
      scores.push(scoreMedley(charts[i], charts[j]));
    }
  }

  return scores.sort((a, b) => b.total - a.total);
}
