/**
 * Nashville Charts MCP Server
 *
 * Exports a createServer() factory for use with ext-apps pattern.
 * No transport logic here - that lives in main.ts.
 */

import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { parseChart, parseChartFilename, validateChart, generateChartFilename } from "./parser.ts";
import { generateChartTemplate } from "./chart-template.ts";
import { transposeChart, getTranspositionOptions } from "./transposer.ts";
import { scoreMedley, scoreAllPairs } from "./medley-scorer.ts";
import { buildChordMap, normalizeKey } from "../shared/music-theory.ts";
import type { ParsedChart, ChartListEntry } from "../shared/chart-types.ts";

// --- Configuration ---

// Works both from source (server.ts) and compiled (dist/server.js)
const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "..", "dist")
  : import.meta.dirname;

const CHARTS_ROOT = resolveChartsRoot();

function resolveChartsRoot(): string {
  const envRoot = process.env.CHARTS_ROOT;
  if (envRoot) {
    const resolved = envRoot.startsWith("~")
      ? path.join(process.env.HOME ?? "", envRoot.slice(1))
      : path.resolve(envRoot);
    if (fs.existsSync(resolved)) return resolved;
  }
  // Default to examples/ directory
  return path.resolve(new URL(".", import.meta.url).pathname, "..", "examples");
}

// --- File System Helpers ---

function findChartFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(d: string) {
    if (!fs.existsSync(d)) return;
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".md") && entry.name.startsWith("key_")) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results.sort();
}

function readAndParseChart(filePath: string): ParsedChart {
  const content = fs.readFileSync(filePath, "utf-8");
  return parseChart(content);
}

function listAllCharts(): ChartListEntry[] {
  const files = findChartFiles(CHARTS_ROOT);
  return files.map((fp) => {
    const filename = path.basename(fp);
    const parsed = parseChartFilename(filename);
    const relativePath = path.relative(CHARTS_ROOT, fp);

    if (parsed) {
      return {
        filename,
        title: parsed.song.replace(/(^|\s)\S/g, (t) => t.toUpperCase()),
        artist: parsed.artist.replace(/(^|\s)\S/g, (t) => t.toUpperCase()),
        key: parsed.key,
        path: relativePath,
      };
    }

    // Fallback: read the file to get title/artist
    try {
      const chart = readAndParseChart(fp);
      return {
        filename,
        title: chart.title,
        artist: chart.artist,
        key: chart.metadata.key ?? "Unknown",
        path: relativePath,
      };
    } catch {
      return {
        filename,
        title: filename,
        artist: "Unknown",
        key: "Unknown",
        path: relativePath,
      };
    }
  });
}

function findChartByQuery(query: string): { chart: ParsedChart; filePath: string } | null {
  const files = findChartFiles(CHARTS_ROOT);
  const q = query.toLowerCase();

  // Try exact filename match first
  for (const fp of files) {
    if (path.basename(fp).toLowerCase() === q || path.basename(fp).toLowerCase() === q + ".md") {
      return { chart: readAndParseChart(fp), filePath: fp };
    }
  }

  // Try matching by title or artist in filename
  for (const fp of files) {
    const filename = path.basename(fp).toLowerCase();
    if (filename.includes(q.replace(/\s+/g, "_"))) {
      return { chart: readAndParseChart(fp), filePath: fp };
    }
  }

  // Try parsing and matching against title/artist
  for (const fp of files) {
    const parsed = parseChartFilename(path.basename(fp));
    if (parsed) {
      if (
        parsed.song.toLowerCase().includes(q) ||
        parsed.artist.toLowerCase().includes(q)
      ) {
        return { chart: readAndParseChart(fp), filePath: fp };
      }
    }
  }

  return null;
}

// --- Server Factory ---

/**
 * Creates a new MCP server instance with all tools and resources registered.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "nashville-charts",
    version: "0.1.1",
  });

  // Shared app resource URI - all UI tools point to the same React app
  const appResourceUri = "ui://nashville-charts/mcp-app.html";

  // Register the single app resource (serves the built React SPA)
  registerAppResource(
    server,
    appResourceUri,
    appResourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const htmlPath = path.join(DIST_DIR, "mcp-app.html");
      let html: string;
      try {
        html = await fs.promises.readFile(htmlPath, "utf-8");
      } catch {
        html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Nashville Charts</title></head>
<body><div id="root">Build the app first: npm run build</div></body></html>`;
      }
      return {
        contents: [{ uri: appResourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }],
      };
    },
  );

  // --- Tool: list-charts (data only) ---
  server.registerTool(
    "list-charts",
    {
      title: "List Charts",
      description: "List all available Nashville Number System charts with metadata",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (): Promise<CallToolResult> => {
      const charts = listAllCharts();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(charts, null, 2),
          },
        ],
      };
    },
  );

  // --- Tool: get-chart (data only) ---
  server.registerTool(
    "get-chart",
    {
      title: "Get Chart Data",
      description: "Parse a chart file and return structured JSON",
      inputSchema: {
        query: z.string().describe("Song title, artist name, or filename to search for"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ query }): Promise<CallToolResult> => {
      const result = findChartByQuery(query);
      if (!result) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `No chart found matching "${query}". Use list-charts to see available charts.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result.chart, null, 2),
          },
        ],
      };
    },
  );

  // --- Tool: view-chart (UI) ---
  registerAppTool(
    server,
    "view-chart",
    {
      title: "View Chart",
      description:
        "Render an interactive Nashville Number System chart in the chat. Returns a rich HTML view with color-coded chords, collapsible sections, and chord map.",
      inputSchema: {
        query: z.string().describe("Song title, artist name, or filename to search for"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: { ui: { resourceUri: appResourceUri } },
    },
    async ({ query }): Promise<CallToolResult> => {
      const result = findChartByQuery(query);
      if (!result) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `No chart found matching "${query}". Use list-charts to see available charts.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              action: "view-chart",
              chart: result.chart,
            }),
          },
        ],
      };
    },
  );

  // --- Tool: browse-charts (UI) ---
  registerAppTool(
    server,
    "browse-charts",
    {
      title: "Browse Charts",
      description:
        "Browse all charts with filtering by key, artist, or title. Returns an interactive browser view.",
      inputSchema: {
        filter: z
          .string()
          .optional()
          .describe("Optional filter: key name, artist, or search term"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: { ui: { resourceUri: appResourceUri } },
    },
    async ({ filter }): Promise<CallToolResult> => {
      const charts = listAllCharts();
      let filtered = charts;

      if (filter) {
        const f = filter.toLowerCase();
        filtered = charts.filter(
          (c) =>
            c.key.toLowerCase().includes(f) ||
            c.artist.toLowerCase().includes(f) ||
            c.title.toLowerCase().includes(f),
        );
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              action: "browse-charts",
              charts: filtered,
              totalCount: charts.length,
            }),
          },
        ],
      };
    },
  );

  // --- Tool: transpose-chart (UI) ---
  registerAppTool(
    server,
    "transpose-chart",
    {
      title: "Transpose Chart",
      description:
        "Show a chart transposed to a new key with updated chord map and capo recommendation",
      inputSchema: {
        query: z.string().describe("Song title, artist name, or filename"),
        newKey: z.string().describe("Target key (e.g., 'A', 'Eb', 'F#m')"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: { ui: { resourceUri: appResourceUri } },
    },
    async ({ query, newKey }): Promise<CallToolResult> => {
      const result = findChartByQuery(query);
      if (!result) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `No chart found matching "${query}".`,
            },
          ],
        };
      }

      const transposition = transposeChart(
        result.chart.metadata.key ?? "",
        newKey,
        result.chart.chordMap,
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              action: "transpose-chart",
              chart: result.chart,
              transposition,
            }),
          },
        ],
      };
    },
  );

  // --- Tool: transpose (data only) ---
  server.registerTool(
    "transpose",
    {
      title: "Transpose Key",
      description: "Compute transposition data: new chord map and capo position",
      inputSchema: {
        originalKey: z.string().describe("Original key"),
        newKey: z.string().describe("Target key"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ originalKey, newKey }): Promise<CallToolResult> => {
      const options = getTranspositionOptions(originalKey);
      const originalMap = buildChordMap(originalKey).map((e) => ({
        ...e,
        note: undefined,
      }));
      const transposition = transposeChart(originalKey, newKey, originalMap);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ transposition, allOptions: options }, null, 2),
          },
        ],
      };
    },
  );

  // --- Tool: analyze-medleys (UI) ---
  registerAppTool(
    server,
    "analyze-medleys",
    {
      title: "Analyze Medleys",
      description:
        "Analyze songs for medley compatibility. Scores key, tempo, and time signature compatibility.",
      inputSchema: {
        songs: z
          .array(z.string())
          .optional()
          .describe("List of song queries to analyze. If omitted, analyzes all charts."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: { ui: { resourceUri: appResourceUri } },
    },
    async ({ songs }): Promise<CallToolResult> => {
      let charts: ParsedChart[];

      if (songs && songs.length > 0) {
        charts = [];
        for (const q of songs) {
          const result = findChartByQuery(q);
          if (result) charts.push(result.chart);
        }
      } else {
        const files = findChartFiles(CHARTS_ROOT);
        charts = files.map((fp) => readAndParseChart(fp));
      }

      if (charts.length < 2) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "Need at least 2 charts to analyze medley compatibility.",
            },
          ],
        };
      }

      const scores = scoreAllPairs(charts);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              action: "analyze-medleys",
              scores,
              chartCount: charts.length,
            }),
          },
        ],
      };
    },
  );

  // --- Tool: score-medley (data only) ---
  server.registerTool(
    "score-medley",
    {
      title: "Score Medley Pair",
      description: "Score two specific songs for medley compatibility",
      inputSchema: {
        songA: z.string().describe("First song query"),
        songB: z.string().describe("Second song query"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ songA, songB }): Promise<CallToolResult> => {
      const a = findChartByQuery(songA);
      const b = findChartByQuery(songB);

      if (!a || !b) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Could not find one or both songs: "${songA}", "${songB}"`,
            },
          ],
        };
      }

      const score = scoreMedley(a.chart, b.chart);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(score, null, 2),
          },
        ],
      };
    },
  );

  // --- Tool: manage-setlist (UI) ---
  registerAppTool(
    server,
    "manage-setlist",
    {
      title: "Manage Set List",
      description:
        "Visual set list management. Shows all charts organized into set and pool.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: { ui: { resourceUri: appResourceUri } },
    },
    async (): Promise<CallToolResult> => {
      const charts = listAllCharts();

      // Organize by directory structure
      const setCharts = charts.filter(
        (c) => c.path.includes("set/") || c.path.includes("set\\"),
      );
      const poolCharts = charts.filter(
        (c) => !c.path.includes("set/") && !c.path.includes("set\\"),
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              action: "manage-setlist",
              set: setCharts,
              pool: poolCharts,
            }),
          },
        ],
      };
    },
  );

  // --- Tool: move-song (data only, app-visible only) ---
  server.registerTool(
    "move-song",
    {
      title: "Move Song",
      description: "Move a chart file between set/ and song_pool/ directories",
      inputSchema: {
        filename: z.string().describe("Chart filename to move"),
        destination: z
          .enum(["set", "pool"])
          .describe("Where to move the file: 'set' or 'pool'"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: { ui: { visibility: ["app"] } },
    },
    async ({ filename, destination }): Promise<CallToolResult> => {
      const files = findChartFiles(CHARTS_ROOT);
      const match = files.find((fp) => path.basename(fp) === filename);

      if (!match) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `File not found: ${filename}`,
            },
          ],
        };
      }

      const destDir =
        destination === "set"
          ? path.join(CHARTS_ROOT, "set")
          : path.join(CHARTS_ROOT, "song_pool");

      // Create destination directory if it doesn't exist
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const destPath = path.join(destDir, path.basename(filename));

      try {
        fs.renameSync(match, destPath);
        return {
          content: [
            {
              type: "text" as const,
              text: `Moved ${filename} to ${destination}/`,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error moving file: ${err}`,
            },
          ],
        };
      }
    },
  );

  // --- Tool: create-chart (data only — returns template text) ---
  server.registerTool(
    "create-chart",
    {
      title: "Create Chart Template",
      description:
        "Generate a pre-filled NNS chart template with chord map. Returns chart text that can be edited and saved via save-chart.",
      inputSchema: {
        title: z.string().describe("Song title"),
        artist: z.string().describe("Artist or composer name"),
        key: z.string().describe("Musical key (e.g., 'G', 'Am', 'Bb', 'F#m')"),
        tempo: z.string().optional().describe("Tempo (e.g., '~120 BPM')"),
        time: z.string().optional().describe("Time signature (e.g., '4/4', '3/4')"),
        feel: z.string().optional().describe("Musical feel (e.g., 'Country shuffle, mid-tempo')"),
        tuning: z.string().optional().describe("Guitar tuning (e.g., 'Standard', 'Half-step down')"),
        capo: z.string().optional().describe("Capo position (e.g., '2nd fret', 'No capo')"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ title, artist, key, tempo, time, feel, tuning, capo }): Promise<CallToolResult> => {
      try {
        const template = generateChartTemplate({
          title,
          artist,
          key,
          tempo,
          time,
          feel,
          tuning,
          capo,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: template,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error generating template: ${err}`,
            },
          ],
        };
      }
    },
  );

  // --- Tool: save-chart (writes to disk) ---
  server.registerTool(
    "save-chart",
    {
      title: "Save Chart",
      description:
        "Validate and save an NNS chart to the charts directory. Auto-generates filename from metadata. Returns the saved path.",
      inputSchema: {
        content: z.string().describe("Full chart file content in NNS .md format"),
        folder: z
          .enum(["set", "song_pool", "root"])
          .default("song_pool")
          .describe("Target folder: 'set' (active setlist), 'song_pool' (available songs), or 'root' (charts root)"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ content, folder }): Promise<CallToolResult> => {
      // Validate the chart content
      const validation = validateChart(content);
      if (!validation.valid) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Chart validation failed:\n${validation.errors.map((e) => `  - ${e}`).join("\n")}`,
            },
          ],
        };
      }

      const chart = validation.chart;

      // Extract key for filename
      const displayKey = normalizeKey(chart.metadata.key ?? "");
      if (!displayKey) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Cannot determine key from metadata: "${chart.metadata.key}"`,
            },
          ],
        };
      }

      // Generate filename
      const filename = generateChartFilename(displayKey, chart.artist, chart.title);
      if (!filename) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Cannot generate filename from key="${displayKey}", artist="${chart.artist}", title="${chart.title}"`,
            },
          ],
        };
      }

      // Determine target directory
      let targetDir = CHARTS_ROOT;
      if (folder === "set") {
        targetDir = path.join(CHARTS_ROOT, "set");
      } else if (folder === "song_pool") {
        targetDir = path.join(CHARTS_ROOT, "song_pool");
      }

      // Create directory if it doesn't exist
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filePath = path.join(targetDir, filename);

      // Check if file already exists
      if (fs.existsSync(filePath)) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `File already exists: ${path.relative(CHARTS_ROOT, filePath)}. Use a different title/artist or remove the existing file first.`,
            },
          ],
        };
      }

      // Write the file
      try {
        fs.writeFileSync(filePath, content, "utf-8");
        const relativePath = path.relative(CHARTS_ROOT, filePath);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                saved: true,
                filename,
                path: relativePath,
                folder,
                title: chart.title,
                artist: chart.artist,
                key: displayKey,
                sections: chart.sections.length,
                chords: chart.chordMap.length,
              }, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Error writing file: ${err}`,
            },
          ],
        };
      }
    },
  );

  return server;
}
