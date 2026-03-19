/**
 * Nashville Charts MCP App - UI entry point
 *
 * Uses the ext-apps SDK to receive tool results from the MCP server
 * and render the appropriate view component.
 */
import type { App } from "@modelcontextprotocol/ext-apps";
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { StrictMode, useCallback, useState } from "react";
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

  const { app, error } = useApp({
    appInfo: { name: "Nashville Charts", version: "0.1.1" },
    capabilities: {},
    onAppCreated: (app) => {
      app.onteardown = async () => {
        console.info("Nashville Charts app torn down");
        return {};
      };

      app.ontoolinput = async (input) => {
        console.info("Received tool input:", input);
      };

      app.ontoolresult = async (result) => {
        console.info("Received tool result:", result);
        const action = extractViewAction(result);
        if (action) {
          setView(action);
        }
      };

      app.ontoolcancelled = (params) => {
        console.info("Tool cancelled:", params.reason);
      };

      app.onerror = console.error;
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

  return <NashvilleChartsInner app={app} view={view} setView={setView} />;
}

interface InnerProps {
  app: App;
  view: ViewAction;
  setView: (view: ViewAction) => void;
}

function NashvilleChartsInner({ app, view, setView }: InnerProps) {
  // Apply host theme variables and fonts
  useHostStyles(app, app.getHostContext());

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
