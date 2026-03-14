# Nashville Charts

An MCP App that renders interactive **Nashville Number System (NNS)** chord charts inside Claude Desktop.

NNS is the notation system used by professional session musicians in Nashville. Chords are written as scale degree numbers (1, 4, 5, 6-, etc.) instead of letter names, making charts instantly transposable to any key.

## Install

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "nashville-charts": {
      "command": "npx",
      "args": ["-y", "nashville-charts-app", "--stdio"],
      "env": {
        "CHARTS_ROOT": "~/my-charts"
      }
    }
  }
}
```

Restart Claude Desktop. The app ships with 4 public domain example charts. Set `CHARTS_ROOT` to point at your own NNS chart directory.

## Usage

In Claude Desktop, try:

- **"Show me Amazing Grace"** — renders an interactive chart with color-coded chords
- **"Browse my charts"** — searchable chart browser
- **"Transpose Amazing Grace to A"** — transposed chord map with capo recommendation
- **"Which songs would make a good medley?"** — compatibility scoring

## Features

- **Color-coded chord numbers** — 1 (gold), 4 (blue), 5 (green), 6- (purple), non-diatonic (red)
- **Collapsible sections** — expand/collapse verse, chorus, bridge
- **Key transposition** — all 12 keys with automatic capo calculation
- **Medley analyzer** — scores song pairs by key, tempo, and time signature compatibility
- **Set list manager** — organize songs into sets and pools
- **Monospace alignment** — critical for NNS chord-over-lyric formatting

## Chart Format

Charts are `.md` files with this structure:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SONG TITLE
  Artist Name
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Key:     G major
  Time:    4/4
  Tempo:   ~120 BPM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHORD MAP (Key of G)
  1 = G    4 = C    5 = D    6- = Em

[VERSE 1]
1              4
  First line of lyrics
5              1
  Second line of lyrics
```

Filename convention: `key_g-artist_name-song_title.md`

## MCP Tools

| Tool | Type | Purpose |
|------|------|---------|
| `view-chart` | UI | Render an interactive chart |
| `browse-charts` | UI | Browse all charts with filters |
| `transpose-chart` | UI | Transpose to a new key |
| `manage-setlist` | UI | Set list management |
| `analyze-medleys` | UI | Medley compatibility analysis |
| `list-charts` | Data | List all charts as JSON |
| `get-chart` | Data | Get parsed chart data |
| `transpose` | Data | Compute transposition data |
| `score-medley` | Data | Score two songs for compatibility |
| `move-song` | Data | Move songs between set/pool |

## Development

```bash
# Install dependencies
npm install

# Build (requires esbuild — use Docker if Santa-blocked)
npm run build
# or: docker run --rm -v "$(pwd)":/app -w /app node:22-slim sh -c "npm install && npm run build"

# Run locally (HTTP on port 3001)
npm run serve

# Run locally (stdio)
npm run serve:stdio

# Dev mode (source TypeScript, no build needed)
npm run dev

# Tests
npm test
```

## License

MIT
