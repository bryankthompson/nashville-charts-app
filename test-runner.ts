/**
 * Simple test runner using Node's native TypeScript support.
 * Run with: node --experimental-strip-types --experimental-transform-types test-runner.ts
 */

import * as fs from "fs";
import * as path from "path";
import { parseChart, parseChartFilename, parseChordMapLine, validateChart, encodeFilenameKey, generateChartFilename } from "./server/parser.ts";
import { generateChartTemplate } from "./server/chart-template.ts";
import { transposeChart, getTranspositionOptions } from "./server/transposer.ts";
import {
  normalizeKey,
  noteIndex,
  buildChordMap,
  semitoneDistance,
  calculateCapo,
  parseTempo,
  findKeyFamily,
} from "./shared/music-theory.ts";

const EXAMPLES_DIR = path.resolve(import.meta.dirname, "examples");

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${msg}`);
  } else {
    failed++;
    console.error(`  FAIL: ${msg}`);
  }
}

function assertEqual(actual: any, expected: any, msg: string) {
  const eq = JSON.stringify(actual) === JSON.stringify(expected);
  if (eq) {
    passed++;
    console.log(`  PASS: ${msg}`);
  } else {
    failed++;
    console.error(`  FAIL: ${msg}`);
    console.error(`    Expected: ${JSON.stringify(expected)}`);
    console.error(`    Actual:   ${JSON.stringify(actual)}`);
  }
}

// ===== Music Theory Tests =====
console.log("\n=== Music Theory ===");

assertEqual(normalizeKey("G"), "G", "normalizeKey simple major");
assertEqual(normalizeKey("Am"), "Am", "normalizeKey simple minor");
assertEqual(normalizeKey("G major"), "G", "normalizeKey 'X major' format");
assertEqual(normalizeKey("A minor"), "Am", "normalizeKey 'X minor' format");
assertEqual(normalizeKey("Db"), "C#", "normalizeKey enharmonic Db->C#");
assertEqual(normalizeKey("Gb"), "F#", "normalizeKey enharmonic Gb->F#");
assertEqual(normalizeKey(""), null, "normalizeKey empty string");
assertEqual(normalizeKey("TBD"), null, "normalizeKey TBD");

assertEqual(noteIndex("C"), 0, "noteIndex C=0");
assertEqual(noteIndex("G"), 7, "noteIndex G=7");
assertEqual(noteIndex("A"), 9, "noteIndex A=9");

const gMap = buildChordMap("G");
assertEqual(gMap.find((e) => e.number === "1")?.chord, "G", "buildChordMap G: 1=G");
assertEqual(gMap.find((e) => e.number === "4")?.chord, "C", "buildChordMap G: 4=C");
assertEqual(gMap.find((e) => e.number === "5")?.chord, "D", "buildChordMap G: 5=D");
assertEqual(gMap.find((e) => e.number === "2-")?.chord, "Am", "buildChordMap G: 2-=Am");
assertEqual(gMap.find((e) => e.number === "6-")?.chord, "Em", "buildChordMap G: 6-=Em");

const cMap = buildChordMap("C");
assertEqual(cMap.find((e) => e.number === "1")?.chord, "C", "buildChordMap C: 1=C");
assertEqual(cMap.find((e) => e.number === "4")?.chord, "F", "buildChordMap C: 4=F");
assertEqual(cMap.find((e) => e.number === "5")?.chord, "G", "buildChordMap C: 5=G");

const aMap = buildChordMap("A");
assertEqual(aMap.find((e) => e.number === "1")?.chord, "A", "buildChordMap A: 1=A");
assertEqual(aMap.find((e) => e.number === "4")?.chord, "D", "buildChordMap A: 4=D");
assertEqual(aMap.find((e) => e.number === "5")?.chord, "E", "buildChordMap A: 5=E");

assertEqual(semitoneDistance("C", "C"), 0, "semitoneDistance C->C = 0");
assertEqual(semitoneDistance("C", "G"), 7, "semitoneDistance C->G = 7");
assertEqual(semitoneDistance("G", "A"), 2, "semitoneDistance G->A = 2");

assertEqual(calculateCapo("G"), null, "calculateCapo G = null (friendly)");
assertEqual(calculateCapo("C"), null, "calculateCapo C = null (friendly)");
assert(calculateCapo("Bb") !== null, "calculateCapo Bb = has capo");
assert((calculateCapo("Bb")?.capoFret ?? 0) > 0, "calculateCapo Bb fret > 0");

assertEqual(parseTempo("~72 BPM"), 72, "parseTempo ~72 BPM");
assertEqual(parseTempo("~120 BPM"), 120, "parseTempo ~120 BPM");
assertEqual(parseTempo(""), null, "parseTempo empty");

const gFamily = findKeyFamily("G");
assertEqual(gFamily?.major, "G", "findKeyFamily G -> major=G");
assertEqual(gFamily?.minor, "Em", "findKeyFamily G -> minor=Em");

const emFamily = findKeyFamily("Em");
assertEqual(emFamily?.major, "G", "findKeyFamily Em -> major=G");

// ===== Parser Tests =====
console.log("\n=== Parser ===");

const amazingGrace = fs.readFileSync(
  path.join(EXAMPLES_DIR, "key_g-traditional-amazing_grace.md"),
  "utf-8"
);
const agChart = parseChart(amazingGrace);

assertEqual(agChart.title, "AMAZING GRACE", "Amazing Grace title");
assertEqual(agChart.artist, "Traditional Hymn (Public Domain)", "Amazing Grace artist");
assertEqual(agChart.metadata.key, "G major", "Amazing Grace key");
assertEqual(agChart.metadata.time, "3/4", "Amazing Grace time sig");
assert(agChart.metadata.tempo?.includes("72") ?? false, "Amazing Grace tempo ~72");
assert(agChart.metadata.feel?.toLowerCase().includes("waltz") ?? false, "Amazing Grace feel waltz");
assertEqual(agChart.isMedley, false, "Amazing Grace not medley");
assert(agChart.chordMap.length >= 3, "Amazing Grace has >= 3 chord map entries");
assertEqual(agChart.chordMap[0]?.chord, "G", "Amazing Grace chord map 1=G");
const agFour = agChart.chordMap.find((e) => e.number === "4");
assertEqual(agFour?.chord, "C", "Amazing Grace chord map 4=C");
assert(agChart.sections.length >= 4, `Amazing Grace has >= 4 sections (got ${agChart.sections.length})`);
assertEqual(agChart.sections[0].label, "VERSE 1", "Amazing Grace first section is VERSE 1");
assert(agChart.sections[0].measures.length > 0, "Amazing Grace VERSE 1 has measures");
assert(agChart.notes.length > 0, "Amazing Grace has notes");
assert(agChart.songMap.length >= 1, "Amazing Grace has song map");

const saints = fs.readFileSync(
  path.join(EXAMPLES_DIR, "key_d-traditional-when_the_saints.md"),
  "utf-8"
);
const saintsChart = parseChart(saints);
assertEqual(saintsChart.title, "WHEN THE SAINTS GO MARCHING IN", "Saints title");
assertEqual(saintsChart.metadata.key, "D major", "Saints key");
assert(saintsChart.sections.length >= 3, `Saints has >= 3 sections (got ${saintsChart.sections.length})`);

const susanna = fs.readFileSync(
  path.join(EXAMPLES_DIR, "key_c-traditional-oh_susanna.md"),
  "utf-8"
);
const susannaChart = parseChart(susanna);
assertEqual(susannaChart.title, "OH! SUSANNA", "Susanna title");
assertEqual(susannaChart.metadata.key, "C major", "Susanna key");
const repeatSection = susannaChart.sections.find((s) => s.isRepeat);
assert(repeatSection !== undefined, "Susanna has a repeat section");

const swingLow = fs.readFileSync(
  path.join(EXAMPLES_DIR, "key_a-traditional-swing_low.md"),
  "utf-8"
);
const slChart = parseChart(swingLow);
assertEqual(slChart.title, "SWING LOW, SWEET CHARIOT", "Swing Low title");
assertEqual(slChart.metadata.key, "A major", "Swing Low key");
assert(slChart.metadata.feel?.includes("gospel") ?? false, "Swing Low feel gospel");

// Parse all example charts without errors
const exampleFiles = fs.readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith(".md"));
assert(exampleFiles.length >= 4, `Found >= 4 example charts (got ${exampleFiles.length})`);
for (const file of exampleFiles) {
  const content = fs.readFileSync(path.join(EXAMPLES_DIR, file), "utf-8");
  const chart = parseChart(content);
  assert(!!chart.title, `${file}: has title`);
  assert(!!chart.metadata.key, `${file}: has key`);
  assert(chart.sections.length > 0, `${file}: has sections`);
}

// ===== Parser Bug Fix Tests =====
console.log("\n=== Parser Bug Fixes ===");

// Inline test fixture exercising flats, flow song map, and annotations
const minorKeyChart = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TEST MINOR KEY CHART
  Test Artist
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Key:     Am
  Time:    4/4
  Tempo:   ~72 BPM
  Feel:    Rock ballad
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHORD MAP (Key of Am)
  1- = Am       2° = Bdim     ♭3 = C        4- = Dm
  5- = Em       5 = E         ♭6 = F        ♭7 = G

SONG MAP
  Intro → Verse → Bridge → Outro

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[INTRO]
(Fingerpicked arpeggios, descending bass line)
| 1-      | ♭3      | ♭6      | ♭7      |

[VERSE]
(Strumming begins)
| ♭3      | 4-      | ♭6      | 1-      |

[BRIDGE]
(Full band, driving feel)
| ♭3      | ♭7      | 1-      |         |

[OUTRO]
(same chord pattern as Intro)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOTES:
  - Test chart for parser bug fixes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
const stChart = parseChart(minorKeyChart);

assertEqual(stChart.title, "TEST MINOR KEY CHART", "minor key chart title");
assertEqual(stChart.metadata.key, "Am", "minor key chart key");

// Bug 1: Flat accidentals preserved in chord map numbers
const flat3 = stChart.chordMap.find((e) => e.number === "♭3");
assert(flat3 !== undefined, "chord map has ♭3");
assertEqual(flat3?.chord, "C", "chord map ♭3 = C");

const flat6 = stChart.chordMap.find((e) => e.number === "♭6");
assert(flat6 !== undefined, "chord map has ♭6");
assertEqual(flat6?.chord, "F", "chord map ♭6 = F");

const flat7 = stChart.chordMap.find((e) => e.number === "♭7");
assert(flat7 !== undefined, "chord map has ♭7");
assertEqual(flat7?.chord, "G", "chord map ♭7 = G");

const dim2 = stChart.chordMap.find((e) => e.number === "2°");
assert(dim2 !== undefined, "chord map has 2°");
assertEqual(dim2?.chord, "Bdim", "chord map 2° = Bdim");

// Bug 1: Plain numbers still work alongside flats
const one = stChart.chordMap.find((e) => e.number === "1-");
assert(one !== undefined, "chord map has 1-");
assertEqual(one?.chord, "Am", "chord map 1- = Am");

// Bug 1: Inline regex unit test
const testEntries = parseChordMapLine("  ♭3 = C    ♭6 = F    ♭7 = G    5 = E");
assertEqual(testEntries.length, 4, "parseChordMapLine flat entries: 4 entries");
assertEqual(testEntries[0]?.number, "♭3", "parseChordMapLine: ♭3 preserved");
assertEqual(testEntries[1]?.number, "♭6", "parseChordMapLine: ♭6 preserved");
assertEqual(testEntries[2]?.number, "♭7", "parseChordMapLine: ♭7 preserved");
assertEqual(testEntries[3]?.number, "5", "parseChordMapLine: plain 5 still works");

// Bug 2: Song map parsed (flow format, no colon)
assert(stChart.songMap.length > 0, "song map has entries (flow format)");
assertEqual(stChart.songMap[0]?.section, "Flow", "song map: flow format section");
assert(
  stChart.songMap[0]?.progression.includes("→"),
  "song map: flow has arrow separators"
);

// Bug 3: Section annotations stored separately from measures
const introSection = stChart.sections.find((s) => s.label === "INTRO");
assert(introSection !== undefined, "has INTRO section");
assert(
  (introSection?.annotations?.length ?? 0) > 0,
  "INTRO has annotations"
);
assert(
  introSection?.annotations?.[0]?.includes("Fingerpicked") ?? false,
  "INTRO annotation contains 'Fingerpicked'"
);
// Annotations should NOT appear as measure lyrics
const introLyrics = introSection?.measures.map((m) => m.lyrics).join(" ") ?? "";
assert(
  !introLyrics.includes("Fingerpicked"),
  "'Fingerpicked' not in measure lyrics"
);

// Bug 3: Verse section also has annotation
const verseSection = stChart.sections.find((s) => s.label === "VERSE");
assert(
  (verseSection?.annotations?.length ?? 0) > 0,
  "VERSE has annotations"
);
assert(
  verseSection?.annotations?.[0]?.includes("Strumming") ?? false,
  "VERSE annotation contains 'Strumming'"
);

// Bug 3: Repeat marker still works alongside annotations
const outroSection = stChart.sections.find((s) => s.label === "OUTRO");
assert(outroSection?.isRepeat === true, "OUTRO is a repeat section");
assert(
  (outroSection?.annotations?.length ?? 0) === 0,
  "OUTRO repeat marker not stored as annotation"
);

// ===== Filename Parser Tests =====
console.log("\n=== Filename Parser ===");

const fnResult1 = parseChartFilename("key_g-traditional-amazing_grace.md");
assertEqual(fnResult1?.key, "G", "filename parser G major");
assertEqual(fnResult1?.artist, "traditional", "filename parser artist");
assertEqual(fnResult1?.song, "amazing grace", "filename parser song");

const fnResult2 = parseChartFilename("key_am-artist_name-song_title.md");
assertEqual(fnResult2?.key, "Am", "filename parser Am minor");

const fnResult3 = parseChartFilename("key_fsm-3_doors_down-loser.md");
assertEqual(fnResult3?.key, "F#m", "filename parser F#m");

assertEqual(parseChartFilename("README.md"), null, "filename parser rejects README");
assertEqual(parseChartFilename("random_file.md"), null, "filename parser rejects random");

// ===== Transposition Tests =====
console.log("\n=== Transposition ===");

const gMapSimple = buildChordMap("G").map((e) => ({ ...e, note: undefined }));
const gToA = transposeChart("G", "A", gMapSimple);
assertEqual(gToA.originalKey, "G", "transpose G->A originalKey");
assertEqual(gToA.newKey, "A", "transpose G->A newKey");
assertEqual(gToA.chordMap.find((e) => e.number === "1")?.chord, "A", "transpose G->A: 1=A");
assertEqual(gToA.chordMap.find((e) => e.number === "4")?.chord, "D", "transpose G->A: 4=D");
assertEqual(gToA.chordMap.find((e) => e.number === "5")?.chord, "E", "transpose G->A: 5=E");

const cMapSimple = buildChordMap("C").map((e) => ({ ...e, note: undefined }));
const cToF = transposeChart("C", "F", cMapSimple);
assertEqual(cToF.chordMap.find((e) => e.number === "1")?.chord, "F", "transpose C->F: 1=F");
assertEqual(cToF.chordMap.find((e) => e.number === "4")?.chord, "Bb", "transpose C->F: 4=Bb");
assertEqual(cToF.chordMap.find((e) => e.number === "5")?.chord, "C", "transpose C->F: 5=C");

const dMapSimple = buildChordMap("D").map((e) => ({ ...e, note: undefined }));
const dToD = transposeChart("D", "D", dMapSimple);
assertEqual(dToD.chordMap.find((e) => e.number === "1")?.chord, "D", "transpose D->D: 1=D (identity)");
assertEqual(dToD.capoFret, null, "transpose D->D: no capo");

const cToEb = transposeChart("C", "Eb", cMapSimple);
assert(cToEb.capoFret !== null, "transpose C->Eb has capo");
assert((cToEb.capoFret ?? 0) > 0, "transpose C->Eb capo > 0");

const majOptions = getTranspositionOptions("C");
assertEqual(majOptions.length, 12, "getTranspositionOptions C: 12 options");

const minOptions = getTranspositionOptions("Am");
assertEqual(minOptions.length, 12, "getTranspositionOptions Am: 12 options");

const gOption = getTranspositionOptions("G").find((o) => o.key === "G");
assertEqual(gOption?.semitones, 0, "getTranspositionOptions G: G has 0 semitones");

// ===== Filename Encoder Tests =====
console.log("\n=== Filename Encoder ===");

assertEqual(encodeFilenameKey("G"), "g", "encodeFilenameKey G");
assertEqual(encodeFilenameKey("F#m"), "fsm", "encodeFilenameKey F#m");
assertEqual(encodeFilenameKey("Bb"), "bb", "encodeFilenameKey Bb");
assertEqual(encodeFilenameKey("Am"), "am", "encodeFilenameKey Am");
assertEqual(encodeFilenameKey("C#"), "cs", "encodeFilenameKey C#");
assertEqual(encodeFilenameKey("Ebm"), "ebm", "encodeFilenameKey Ebm");
assertEqual(encodeFilenameKey("X"), null, "encodeFilenameKey invalid");

assertEqual(
  generateChartFilename("G", "Traditional", "Amazing Grace"),
  "key_g-traditional-amazing_grace.md",
  "generateChartFilename simple"
);
assertEqual(
  generateChartFilename("F#m", "3 Doors Down", "Loser"),
  "key_fsm-3_doors_down-loser.md",
  "generateChartFilename with number in artist"
);
assertEqual(
  generateChartFilename("Bb", "Chris Stapleton", "Tennessee Whiskey"),
  "key_bb-chris_stapleton-tennessee_whiskey.md",
  "generateChartFilename flat key"
);
assertEqual(
  generateChartFilename("X", "Artist", "Song"),
  null,
  "generateChartFilename invalid key"
);

// ===== Chart Template Tests =====
console.log("\n=== Chart Template ===");

const template = generateChartTemplate({
  title: "Test Song",
  artist: "Test Artist",
  key: "G",
  tempo: "~120 BPM",
  time: "4/4",
  feel: "Rock, driving",
});
assert(template.includes("TEST SONG"), "template has uppercase title");
assert(template.includes("Test Artist"), "template has artist");
assert(template.includes("Key:     G major"), "template has key");
assert(template.includes("1 = G"), "template has chord map 1=G");
assert(template.includes("4 = C"), "template has chord map 4=C");
assert(template.includes("5 = D"), "template has chord map 5=D");
assert(template.includes("[VERSE 1]"), "template has verse section");
assert(template.includes("[CHORUS]"), "template has chorus section");
assert(template.includes("NOTES:"), "template has notes section");

const minorTemplate = generateChartTemplate({
  title: "Minor Song",
  artist: "Artist",
  key: "Am",
});
assert(minorTemplate.includes("1- = Am"), "minor template has 1-=Am");
assert(minorTemplate.includes("Key:     Am"), "minor template shows Am key");

try {
  generateChartTemplate({ title: "Bad", artist: "Bad", key: "X" });
  assert(false, "template rejects invalid key");
} catch {
  assert(true, "template rejects invalid key");
}

// ===== Validate Chart Tests =====
console.log("\n=== Validate Chart ===");

const validResult = validateChart(amazingGrace);
assert(validResult.valid === true, "validateChart accepts valid chart");

const invalidEmpty = validateChart("");
assert(invalidEmpty.valid === false, "validateChart rejects empty");
if (!invalidEmpty.valid) {
  assert(invalidEmpty.errors.length > 0, "validateChart empty has errors");
}

const invalidNoKey = validateChart(`━━━━━━
  TITLE
  ARTIST
━━━━━━
  Tuning: Standard
━━━━━━
[VERSE]
1  4  5
━━━━━━
`);
assert(invalidNoKey.valid === false, "validateChart rejects missing key");

// Roundtrip: generate template -> fill in -> validate
const filledTemplate = generateChartTemplate({
  title: "Roundtrip Test",
  artist: "Test Artist",
  key: "D",
  tempo: "~100 BPM",
  time: "4/4",
  feel: "Country",
}).replace("[chords above lyrics here]", "1                    4\n  Test lyric line")
  .replace("[fill in progression]", "1 - 4 - 5 - 1")
  .replace("[sources, techniques, special notes]", "Test note");
const roundtripResult = validateChart(filledTemplate);
// Template sections have placeholder text, which the parser sees as content
// The filled template should parse with a title and key at minimum
if (roundtripResult.valid) {
  assertEqual(roundtripResult.chart.title, "ROUNDTRIP TEST", "roundtrip title");
  assertEqual(roundtripResult.chart.metadata.key, "D major", "roundtrip key");
} else {
  // If validation fails, that's also informative
  console.log("  INFO: roundtrip validation errors:", roundtripResult.errors);
  assert(false, "roundtrip template validates after filling");
}

// ===== Summary =====
console.log("\n" + "=".repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All tests passed!");
}
