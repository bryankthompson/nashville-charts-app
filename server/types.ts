/**
 * Server-side types for the Nashville Charts MCP server.
 */

export interface ServerConfig {
  chartsRoot: string;
  port?: number;
}

export interface ChartFile {
  filename: string;
  path: string;
  relativePath: string;
}
