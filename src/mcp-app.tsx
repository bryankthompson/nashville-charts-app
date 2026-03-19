/**
 * Nashville Charts MCP App - UI entry point
 *
 * Uses the ext-apps SDK to receive tool results from the MCP server
 * and render the appropriate view component.
 */
import type { App, McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChartViewer } from "./components/ChartViewer";
import { ChartBrowser } from "./components/ChartBrowser";
import { MedleyAnalyzer } from "./components/MedleyAnalyzer";
import { SetListManager } from "./components/SetListManager";
import type {
  ParsedChart,
  ChartListEntry,
  MedleyScore,
  TransposeResult,
} from "../shared/chart-types";
import "./chart.css";

type ViewAction =
  | { action: "view-chart"; chart: ParsedChart; transposition?: TransposeResult }
  | { action: "transpose-chart"; chart: ParsedChart; transposition: TransposeResult }
  | { action: "browse-charts"; charts: ChartListEntry[]; totalCount: number }
  | { action: "analyze-medleys"; scores: MedleyScore[]; chartCount: number }
  | { action: "manage-setlist"; set: ChartListEntry[]; pool: ChartListEntry[] };

function extractViewAction(result: CallToolResult): ViewAction | null {
  const textContent = result.content?.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") return null;
  try {
    const data = JSON.parse(textContent.text);
    if (data.action) return data as ViewAction;
  } catch {
    // Not JSON or no action field
  }
  return null;
}

function NashvilleChartsApp() {
  const [view, setView] = useState<ViewAction | null>(null);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();
  const tornDown = useRef(false);

  const { app, error } = useApp({
    appInfo: { name: "Nashville Charts", version: "0.1.1" },
    capabilities: {},
    onAppCreated: (app) => {
      // Enhancement 5: teardown flag
      app.onteardown = async () => {
        tornDown.current = true;
        setView(null);
        setHostContext(undefined);
        console.info("Nashville Charts app torn down");
        return {};
      };

      app.ontoolinput = async (input) => {
        console.info("Received tool input:", input);
      };

      app.ontoolresult = async (result) => {
        if (tornDown.current) return;
        console.info("Received tool result:", result);
        const action = extractViewAction(result);
        if (action) {
          setView(action);
        }
      };

      app.ontoolcancelled = (params) => {
        console.info("Tool cancelled:", params.reason);
      };

      // Enhancement 2: track host context changes
      app.onhostcontextchanged = () => {
        if (tornDown.current) return;
        setHostContext(app.getHostContext());
      };

      app.onerror = console.error;

      // Set initial host context
      setHostContext(app.getHostContext());
    },
  });

  if (error) {
    return (
      <div className="ncs-app">
        <strong>Error:</strong> {error.message}
      </div>
    );
  }

  if (!app) {
    return (
      <div className="ncs-app ncs-loading">
        <p>Connecting...</p>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="ncs-app ncs-loading">
        <p>Loading Nashville Charts...</p>
      </div>
    );
  }

  return <NashvilleChartsInner app={app} view={view} setView={setView} hostContext={hostContext} tornDown={tornDown} />;
}

interface InnerProps {
  app: App;
  view: ViewAction;
  setView: (view: ViewAction) => void;
  hostContext: McpUiHostContext | undefined;
  tornDown: React.RefObject<boolean>;
}

// Enhancement 3: build YAML model context describing current view
function buildModelContext(view: ViewAction): string | null {
  switch (view.action) {
    case "view-chart":
    case "transpose-chart": {
      const c = view.chart;
      const meta = c.metadata;
      const t = view.transposition;
      const lines = [
        "---",
        `view: chart`,
        `title: "${c.title}"`,
        `artist: "${c.artist}"`,
        `key: ${t ? t.newKey : meta.key}`,
      ];
      if (t && t.originalKey !== t.newKey) lines.push(`original-key: ${t.originalKey}`);
      if (t?.capoFret != null) lines.push(`capo: fret ${t.capoFret}`);
      if (meta.tempo) lines.push(`tempo: ${meta.tempo}`);
      if (meta.time) lines.push(`time: ${meta.time}`);
      if (meta.feel) lines.push(`feel: "${meta.feel}"`);
      lines.push(`sections: ${c.sections.map((s) => s.label).join(", ")}`);
      lines.push("---");
      return lines.join("\n");
    }
    case "manage-setlist": {
      const setList = view.set.map((s) => `  - "${s.title}" by ${s.artist} (${s.key})`).join("\n");
      const lines = [
        "---",
        `view: setlist`,
        `set-count: ${view.set.length}`,
        `pool-count: ${view.pool.length}`,
        "---",
        "",
        "Set list:",
        setList || "  (empty)",
      ];
      return lines.join("\n");
    }
    case "browse-charts":
      return [
        "---",
        `view: browse`,
        `total-charts: ${view.totalCount}`,
        `showing: ${view.charts.length}`,
        "---",
      ].join("\n");
    case "analyze-medleys":
      return [
        "---",
        `view: medley-analysis`,
        `charts-analyzed: ${view.chartCount}`,
        `pairs: ${view.scores.length}`,
        "---",
      ].join("\n");
    default:
      return null;
  }
}

function NashvilleChartsInner({ app, view, setView, hostContext, tornDown }: InnerProps) {
  // Enhancement 2: pass state-tracked context so useHostStyles re-applies on changes
  useHostStyles(app, hostContext);

  // Enhancement 3: update model context when view changes
  useEffect(() => {
    if (tornDown.current) return;
    const content = buildModelContext(view);
    if (content) {
      app.updateModelContext({ content: [{ type: "text", text: content }] }).catch(() => {
        // Host may not support updateModelContext — graceful degradation
      });
    }
  }, [app, view, tornDown]);

  const handleToolResult = useCallback((result: CallToolResult) => {
    const action = extractViewAction(result);
    if (action) setView(action);
  }, []);

  return (
    <div className="ncs-app">
      {view.action === "view-chart" && (
        <ChartViewer app={app} chart={view.chart} transposition={view.transposition} onToolResult={handleToolResult} />
      )}
      {view.action === "transpose-chart" && (
        <ChartViewer app={app} chart={view.chart} transposition={view.transposition} onToolResult={handleToolResult} />
      )}
      {view.action === "browse-charts" && (
        <ChartBrowser app={app} charts={view.charts} totalCount={view.totalCount} onToolResult={handleToolResult} />
      )}
      {view.action === "analyze-medleys" && (
        <MedleyAnalyzer scores={view.scores} chartCount={view.chartCount} />
      )}
      {view.action === "manage-setlist" && (
        <SetListManager app={app} setCharts={view.set} poolCharts={view.pool} onToolResult={handleToolResult} />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NashvilleChartsApp />
  </StrictMode>,
);
