import React from "react";
import type { ChartListEntry } from "../../shared/chart-types";

interface Props {
  setCharts: ChartListEntry[];
  poolCharts: ChartListEntry[];
}

function ChartRow({ chart }: { chart: ChartListEntry }) {
  return (
    <div className="setlist-row">
      <span className="row-key">{chart.key}</span>
      <span className="row-title">{chart.title}</span>
      <span className="row-artist">{chart.artist}</span>
    </div>
  );
}

export function SetListManager({ setCharts, poolCharts }: Props) {
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
              setCharts.map((chart, i) => <ChartRow key={i} chart={chart} />)
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
              poolCharts.map((chart, i) => <ChartRow key={i} chart={chart} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
