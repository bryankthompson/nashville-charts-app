import { describe, it, expect } from "vitest";
import { parseChart, parseChartFilename } from "./parser";
import * as fs from "fs";
import * as path from "path";

const EXAMPLES_DIR = path.resolve(import.meta.dirname, "..", "examples");

describe("parseChart", () => {
  it("parses Amazing Grace correctly", () => {
    const content = fs.readFileSync(
      path.join(EXAMPLES_DIR, "key_g-traditional-amazing_grace.md"),
      "utf-8"
    );
    const chart = parseChart(content);

    expect(chart.title).toBe("AMAZING GRACE");
    expect(chart.artist).toBe("Traditional Hymn (Public Domain)");
    expect(chart.metadata.key).toBe("G major");
    expect(chart.metadata.time).toBe("3/4");
    expect(chart.metadata.tempo).toContain("72");
    expect(chart.metadata.feel).toContain("waltz");
    expect(chart.isMedley).toBe(false);
  });

  it("parses chord map entries", () => {
    const content = fs.readFileSync(
      path.join(EXAMPLES_DIR, "key_g-traditional-amazing_grace.md"),
      "utf-8"
    );
    const chart = parseChart(content);

    expect(chart.chordMap.length).toBeGreaterThanOrEqual(3);
    expect(chart.chordMap[0]).toEqual({
      number: "1",
      quality: "major",
      chord: "G",
    });
    // Find the 4 chord
    const four = chart.chordMap.find((e) => e.number === "4");
    expect(four?.chord).toBe("C");
  });

  it("parses sections", () => {
    const content = fs.readFileSync(
      path.join(EXAMPLES_DIR, "key_g-traditional-amazing_grace.md"),
      "utf-8"
    );
    const chart = parseChart(content);

    expect(chart.sections.length).toBeGreaterThanOrEqual(4);
    expect(chart.sections[0].label).toBe("VERSE 1");
    expect(chart.sections[0].measures.length).toBeGreaterThan(0);
  });

  it("parses notes section", () => {
    const content = fs.readFileSync(
      path.join(EXAMPLES_DIR, "key_g-traditional-amazing_grace.md"),
      "utf-8"
    );
    const chart = parseChart(content);

    expect(chart.notes.length).toBeGreaterThan(0);
    expect(chart.notes.some((n) => n.includes("1-4-1-5-1"))).toBe(true);
  });

  it("parses song map", () => {
    const content = fs.readFileSync(
      path.join(EXAMPLES_DIR, "key_g-traditional-amazing_grace.md"),
      "utf-8"
    );
    const chart = parseChart(content);

    expect(chart.songMap.length).toBeGreaterThanOrEqual(1);
    expect(chart.songMap[0].section).toContain("Verse");
  });

  it("parses When The Saints correctly", () => {
    const content = fs.readFileSync(
      path.join(EXAMPLES_DIR, "key_d-traditional-when_the_saints.md"),
      "utf-8"
    );
    const chart = parseChart(content);

    expect(chart.title).toBe("WHEN THE SAINTS GO MARCHING IN");
    expect(chart.metadata.key).toBe("D major");
    expect(chart.metadata.tempo).toContain("120");
    expect(chart.sections.length).toBeGreaterThanOrEqual(3);
  });

  it("parses Oh Susanna correctly", () => {
    const content = fs.readFileSync(
      path.join(EXAMPLES_DIR, "key_c-traditional-oh_susanna.md"),
      "utf-8"
    );
    const chart = parseChart(content);

    expect(chart.title).toBe("OH! SUSANNA");
    expect(chart.metadata.key).toBe("C major");
    // Should detect repeat section
    const repeatSection = chart.sections.find((s) => s.isRepeat);
    expect(repeatSection).toBeDefined();
  });

  it("parses Swing Low correctly", () => {
    const content = fs.readFileSync(
      path.join(EXAMPLES_DIR, "key_a-traditional-swing_low.md"),
      "utf-8"
    );
    const chart = parseChart(content);

    expect(chart.title).toBe("SWING LOW, SWEET CHARIOT");
    expect(chart.metadata.key).toBe("A major");
    expect(chart.metadata.feel).toContain("gospel");
  });

  it("parses all example charts without errors", () => {
    const files = fs.readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith(".md"));
    expect(files.length).toBeGreaterThanOrEqual(4);

    for (const file of files) {
      const content = fs.readFileSync(path.join(EXAMPLES_DIR, file), "utf-8");
      const chart = parseChart(content);
      expect(chart.title).toBeTruthy();
      expect(chart.metadata.key).toBeTruthy();
      expect(chart.sections.length).toBeGreaterThan(0);
    }
  });
});

describe("parseChartFilename", () => {
  it("parses standard filename", () => {
    const result = parseChartFilename("key_g-traditional-amazing_grace.md");
    expect(result).toEqual({
      key: "G",
      artist: "traditional",
      song: "amazing grace",
    });
  });

  it("parses minor key filename", () => {
    const result = parseChartFilename("key_am-artist_name-song_title.md");
    expect(result).toEqual({
      key: "Am",
      artist: "artist name",
      song: "song title",
    });
  });

  it("parses sharp key filename", () => {
    const result = parseChartFilename("key_fsm-3_doors_down-loser.md");
    expect(result).toEqual({
      key: "F#m",
      artist: "3 doors down",
      song: "loser",
    });
  });

  it("returns null for non-chart files", () => {
    expect(parseChartFilename("README.md")).toBeNull();
    expect(parseChartFilename("random_file.md")).toBeNull();
  });
});
