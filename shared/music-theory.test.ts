import { describe, it, expect } from "vitest";
import {
  normalizeKey,
  noteIndex,
  noteName,
  usesFlats,
  buildChordMap,
  semitoneDistance,
  calculateCapo,
  parseTempo,
  findKeyFamily,
} from "./music-theory";

describe("normalizeKey", () => {
  it("normalizes simple keys", () => {
    expect(normalizeKey("G")).toBe("G");
    expect(normalizeKey("Am")).toBe("Am");
    expect(normalizeKey("C#")).toBe("C#");
  });

  it("normalizes 'X major' format", () => {
    expect(normalizeKey("G major")).toBe("G");
    expect(normalizeKey("A major")).toBe("A");
  });

  it("normalizes 'X minor' format", () => {
    expect(normalizeKey("A minor")).toBe("Am");
    expect(normalizeKey("F# minor")).toBe("F#m");
  });

  it("handles enharmonics", () => {
    expect(normalizeKey("Db")).toBe("C#");
    expect(normalizeKey("Gb")).toBe("F#");
    expect(normalizeKey("Bb")).toBe("A#");
  });

  it("returns null for invalid input", () => {
    expect(normalizeKey("")).toBeNull();
    expect(normalizeKey("TBD")).toBeNull();
    expect(normalizeKey("unknown")).toBeNull();
  });
});

describe("noteIndex", () => {
  it("returns correct chromatic indices", () => {
    expect(noteIndex("C")).toBe(0);
    expect(noteIndex("G")).toBe(7);
    expect(noteIndex("A")).toBe(9);
  });

  it("handles enharmonics", () => {
    expect(noteIndex("Db")).toBe(noteIndex("C#"));
    expect(noteIndex("Gb")).toBe(noteIndex("F#"));
  });
});

describe("buildChordMap", () => {
  it("builds correct map for G major", () => {
    const map = buildChordMap("G");
    expect(map.find((e) => e.number === "1")?.chord).toBe("G");
    expect(map.find((e) => e.number === "4")?.chord).toBe("C");
    expect(map.find((e) => e.number === "5")?.chord).toBe("D");
    expect(map.find((e) => e.number === "2-")?.chord).toBe("Am");
    expect(map.find((e) => e.number === "6-")?.chord).toBe("Em");
  });

  it("builds correct map for C major", () => {
    const map = buildChordMap("C");
    expect(map.find((e) => e.number === "1")?.chord).toBe("C");
    expect(map.find((e) => e.number === "4")?.chord).toBe("F");
    expect(map.find((e) => e.number === "5")?.chord).toBe("G");
  });

  it("builds correct map for A major", () => {
    const map = buildChordMap("A");
    expect(map.find((e) => e.number === "1")?.chord).toBe("A");
    expect(map.find((e) => e.number === "4")?.chord).toBe("D");
    expect(map.find((e) => e.number === "5")?.chord).toBe("E");
  });
});

describe("semitoneDistance", () => {
  it("returns 0 for same key", () => {
    expect(semitoneDistance("C", "C")).toBe(0);
  });

  it("returns correct distance", () => {
    expect(semitoneDistance("C", "G")).toBe(7);
    expect(semitoneDistance("G", "A")).toBe(2);
    expect(semitoneDistance("A", "C")).toBe(3);
  });
});

describe("calculateCapo", () => {
  it("returns null for guitar-friendly keys", () => {
    expect(calculateCapo("G")).toBeNull();
    expect(calculateCapo("C")).toBeNull();
    expect(calculateCapo("D")).toBeNull();
    expect(calculateCapo("E")).toBeNull();
    expect(calculateCapo("A")).toBeNull();
  });

  it("returns capo for non-friendly keys", () => {
    const result = calculateCapo("Bb");
    expect(result).not.toBeNull();
    expect(result!.capoFret).toBeGreaterThan(0);
  });
});

describe("parseTempo", () => {
  it("extracts BPM from standard format", () => {
    expect(parseTempo("~72 BPM")).toBe(72);
    expect(parseTempo("~120 BPM")).toBe(120);
    expect(parseTempo("~88 BPM (half-time feel)")).toBe(88);
  });

  it("returns null for empty string", () => {
    expect(parseTempo("")).toBeNull();
  });
});

describe("findKeyFamily", () => {
  it("finds correct family for G", () => {
    const family = findKeyFamily("G");
    expect(family?.major).toBe("G");
    expect(family?.minor).toBe("Em");
  });

  it("finds correct family for Em", () => {
    const family = findKeyFamily("Em");
    expect(family?.major).toBe("G");
  });
});
