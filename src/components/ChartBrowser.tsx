import React, { useState, useMemo } from "react";
import type { App } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ChartListEntry } from "../../shared/chart-types";

interface Props {
  app: App;
  charts: ChartListEntry[];
  totalCount: number;
  onToolResult: (result: CallToolResult) => void;
}

export function ChartBrowser({ app, charts, totalCount, onToolResult }: Props) {
  const [search, setSearch] = useState("");
  const [keyFilter, setKeyFilter] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "artist" | "key">("title");
  const [loading, setLoading] = useState<string | null>(null);

  const uniqueKeys = useMemo(
    () => [...new Set(charts.map((c) => c.key))].sort(),
    [charts]
  );

  const filtered = useMemo(() => {
    let result = charts;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.artist.toLowerCase().includes(q)
      );
    }
    if (keyFilter) {
      result = result.filter((c) => c.key === keyFilter);
    }
    return result.sort((a, b) => {
      const aVal = a[sortBy].toLowerCase();
      const bVal = b[sortBy].toLowerCase();
      return aVal.localeCompare(bVal);
    });
  }, [charts, search, keyFilter, sortBy]);

  const handleViewChart = async (chart: ChartListEntry) => {
    setLoading(chart.filename);
    try {
      const result = await app.callServerTool({
        name: "view-chart",
        arguments: { query: chart.title },
      });
      onToolResult(result);
    } catch (err) {
      console.error("Failed to view chart:", err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="chart-browser">
      <div className="browser-header">
        <h1>Nashville Charts</h1>
        <span className="chart-count">
          {filtered.length} of {totalCount} charts
        </span>
      </div>

      <div className="browser-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search by title or artist..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="key-select"
          value={keyFilter}
          onChange={(e) => setKeyFilter(e.target.value)}
        >
          <option value="">All Keys</option>
          {uniqueKeys.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
        >
          <option value="title">Sort by Title</option>
          <option value="artist">Sort by Artist</option>
          <option value="key">Sort by Key</option>
        </select>
      </div>

      <div className="chart-list">
        {filtered.map((chart, i) => (
          <div
            key={i}
            className={`chart-card chart-card-clickable${loading === chart.filename ? " chart-card-loading" : ""}`}
            onClick={() => !loading && handleViewChart(chart)}
          >
            <div className="card-key">{chart.key}</div>
            <div className="card-info">
              <div className="card-title">{chart.title}</div>
              <div className="card-artist">{chart.artist}</div>
            </div>
            <div className="card-path">{chart.path}</div>
            <div className="card-action">
              {loading === chart.filename ? "Loading..." : "View"}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="no-results">No charts match your search.</div>
        )}
      </div>
    </div>
  );
}
