import React, { useState } from "react";
import type { App } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ChartListEntry } from "../../shared/chart-types";

interface Props {
  app: App;
  setCharts: ChartListEntry[];
  poolCharts: ChartListEntry[];
  onToolResult: (result: CallToolResult) => void;
}

function ChartRow({
  chart,
  destination,
  onMove,
  moving,
}: {
  chart: ChartListEntry;
  destination: "set" | "pool";
  onMove: (filename: string, destination: "set" | "pool") => void;
  moving: string | null;
}) {
  const isMoving = moving === chart.filename;
  return (
    <div className="setlist-row">
      <span className="row-key">{chart.key}</span>
      <span className="row-title">{chart.title}</span>
      <span className="row-artist">{chart.artist}</span>
      <button
        className="btn-move"
        onClick={() => onMove(chart.filename, destination)}
        disabled={isMoving}
      >
        {isMoving ? "..." : destination === "set" ? "\u2192 Set" : "\u2192 Pool"}
      </button>
    </div>
  );
}

export function SetListManager({ app, setCharts, poolCharts, onToolResult }: Props) {
  const [moving, setMoving] = useState<string | null>(null);

  const handleMove = async (filename: string, destination: "set" | "pool") => {
    setMoving(filename);
    try {
      const moveResult = await app.callServerTool({
        name: "move-song",
        arguments: { filename, destination },
      });
      if (moveResult.isError) {
        console.error("Move failed:", moveResult.content);
        return;
      }
      // Refresh the setlist view
      const result = await app.callServerTool({
        name: "manage-setlist",
        arguments: {},
      });
      onToolResult(result);
    } catch (err) {
      console.error("Failed to move song:", err);
    } finally {
      setMoving(null);
    }
  };

  return (
    <div className="setlist-manager">
      <h1>Set List Manager</h1>

      <div className="setlist-columns">
        <div className="setlist-column">
          <div className="column-header">
            <h2>Set</h2>
            <span className="column-count">{setCharts.length} songs</span>
          </div>
          <div className="column-body">
            {setCharts.length === 0 ? (
              <div className="empty-column">No songs in set. Move songs from the pool.</div>
            ) : (
              setCharts.map((chart, i) => (
                <ChartRow key={i} chart={chart} destination="pool" onMove={handleMove} moving={moving} />
              ))
            )}
          </div>
        </div>

        <div className="setlist-column">
          <div className="column-header">
            <h2>Song Pool</h2>
            <span className="column-count">{poolCharts.length} songs</span>
          </div>
          <div className="column-body">
            {poolCharts.length === 0 ? (
              <div className="empty-column">No songs in pool.</div>
            ) : (
              poolCharts.map((chart, i) => (
                <ChartRow key={i} chart={chart} destination="set" onMove={handleMove} moving={moving} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
