import { describe, it, expect } from "vitest";
import { transposeChart, getTranspositionOptions } from "./transposer";
import { buildChordMap } from "../shared/music-theory";

describe("transposeChart", () => {
  it("transposes G major to A major", () => {
    const gMap = buildChordMap("G").map((e) => ({ ...e, note: undefined }));
    const result = transposeChart("G", "A", gMap);

    expect(result.originalKey).toBe("G");
    expect(result.newKey).toBe("A");

    // 1 chord should now be A
    const one = result.chordMap.find((e) => e.number === "1");
    expect(one?.chord).toBe("A");

    // 4 chord should now be D
    const four = result.chordMap.find((e) => e.number === "4");
    expect(four?.chord).toBe("D");

    // 5 chord should now be E
    const five = result.chordMap.find((e) => e.number === "5");
    expect(five?.chord).toBe("E");
  });

  it("transposes C major to F major", () => {
    const cMap = buildChordMap("C").map((e) => ({ ...e, note: undefined }));
    const result = transposeChart("C", "F", cMap);

    const one = result.chordMap.find((e) => e.number === "1");
    expect(one?.chord).toBe("F");

    const four = result.chordMap.find((e) => e.number === "4");
    expect(four?.chord).toBe("Bb");

    const five = result.chordMap.find((e) => e.number === "5");
    expect(five?.chord).toBe("C");
  });

  it("transposes to same key returns identical map", () => {
    const dMap = buildChordMap("D").map((e) => ({ ...e, note: undefined }));
    const result = transposeChart("D", "D", dMap);

    expect(result.originalKey).toBe("D");
    expect(result.newKey).toBe("D");
    expect(result.capoFret).toBeNull();

    const one = result.chordMap.find((e) => e.number === "1");
    expect(one?.chord).toBe("D");
  });

  it("calculates capo for non-guitar-friendly keys", () => {
    const cMap = buildChordMap("C").map((e) => ({ ...e, note: undefined }));
    const result = transposeChart("C", "Eb", cMap);

    // Eb should recommend a capo
    expect(result.capoFret).not.toBeNull();
    expect(result.capoFret).toBeGreaterThan(0);
  });

  it("no capo for guitar-friendly keys", () => {
    const gMap = buildChordMap("G").map((e) => ({ ...e, note: undefined }));
    const result = transposeChart("G", "G", gMap);
    expect(result.capoFret).toBeNull();
  });
});

describe("getTranspositionOptions", () => {
  it("returns 12 options for major keys", () => {
    const options = getTranspositionOptions("C");
    expect(options).toHaveLength(12);
  });

  it("returns 12 options for minor keys", () => {
    const options = getTranspositionOptions("Am");
    expect(options).toHaveLength(12);
  });

  it("includes the original key with 0 semitones", () => {
    const options = getTranspositionOptions("G");
    const original = options.find((o) => o.key === "G");
    expect(original).toBeDefined();
    expect(original!.semitones).toBe(0);
  });
});
