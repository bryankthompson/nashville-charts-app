import React, { useState, useMemo } from "react";
import type { ChartListEntry } from "../../shared/chart-types";

interface Props {
  charts: ChartListEntry[];
  totalCount: number;
}

export function ChartBrowser({ charts, totalCount }: Props) {
  const [search, setSearch] = useState("");
  const [keyFilter, setKeyFilter] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "artist" | "key">("title");

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
          <div key={i} className="chart-card">
            <div className="card-key">{chart.key}</div>
            <div className="card-info">
              <div className="card-title">{chart.title}</div>
              <div className="card-artist">{chart.artist}</div>
            </div>
            <div className="card-path">{chart.path}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="no-results">No charts match your search.</div>
        )}
      </div>
    </div>
  );
}
