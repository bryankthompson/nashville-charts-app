/**
 * Entry point for running the Nashville Charts MCP server.
 * Supports both StreamableHTTP (default) and stdio (--stdio flag).
 *
 * Run with:
 *   node --experimental-strip-types --experimental-transform-types main.ts
 *   node --experimental-strip-types --experimental-transform-types main.ts --stdio
 */

import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import type { Request, Response } from "express";
import { createServer } from "./server/server.ts";

/**
 * Starts an MCP server with Streamable HTTP transport in stateless mode.
 */
export async function startStreamableHTTPServer(
  createServer: () => McpServer,
): Promise<void> {
  const port = parseInt(process.env.PORT ?? "3001", 10);

  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.use(cors());

  app.all("/mcp", async (req: Request, res: Response) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  const httpServer = app.listen(port, (err) => {
    if (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
    console.log(`Nashville Charts MCP server listening on http://localhost:${port}/mcp`);
  });

  const shutdown = () => {
    console.log("\nShutting down...");
    httpServer.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

/**
 * Starts an MCP server with stdio transport.
 * Includes debug logging to diagnose MCPB UI rendering issues.
 */
export async function startStdioServer(
  createServerFn: () => McpServer,
): Promise<void> {
  const server = createServerFn();
  const transport = new StdioServerTransport();

  // Debug: Set onmessage BEFORE connect — Protocol.connect() chains pre-existing
  // callbacks, so this captures raw messages before SDK schema parsing strips fields.
  // Critical: the SDK's InitializeRequestSchema uses z.core.$strip which removes
  // unknown properties like "extensions" from capabilities. This captures them raw.
  transport.onmessage = (msg: unknown) => {
    const msgObj = msg as Record<string, unknown>;
    if (msgObj?.method === "initialize") {
      console.error(`[DEBUG:rx] ========== RAW INITIALIZE REQUEST ==========`);
      console.error(`[DEBUG:rx] ${JSON.stringify(msg, null, 2).substring(0, 5000)}`);
      console.error(`[DEBUG:rx] =============================================`);

      // Specifically check for extensions in capabilities
      const params = msgObj.params as Record<string, unknown> | undefined;
      const caps = params?.capabilities as Record<string, unknown> | undefined;
      if (caps?.extensions) {
        console.error(`[DEBUG:rx] EXTENSIONS FOUND in capabilities: ${JSON.stringify(caps.extensions)}`);
      } else {
        console.error(`[DEBUG:rx] NO extensions field in capabilities`);
      }

      // Also check for extensions at params level (alternate location)
      if (params?.extensions) {
        console.error(`[DEBUG:rx] EXTENSIONS FOUND at params level: ${JSON.stringify(params.extensions)}`);
      }
    }
  };

  // Debug: Wrap transport.send to log outgoing initialize response
  const origSend = transport.send.bind(transport);
  transport.send = async (msg: unknown, opts?: unknown) => {
    const msgObj = msg as Record<string, unknown>;
    if (msgObj?.result && typeof msgObj.result === "object") {
      const result = msgObj.result as Record<string, unknown>;
      if (result.protocolVersion || result.serverInfo) {
        console.error(`[DEBUG:tx] ========== INITIALIZE RESPONSE ==========`);
        console.error(`[DEBUG:tx] ${JSON.stringify(result, null, 2).substring(0, 2000)}`);
        console.error(`[DEBUG:tx] ==========================================`);
      }
    }
    return origSend(msg as Parameters<typeof origSend>[0], opts as Parameters<typeof origSend>[1]);
  };

  await server.connect(transport);
}

async function main() {
  if (process.argv.includes("--stdio")) {
    await startStdioServer(createServer);
  } else {
    await startStreamableHTTPServer(createServer);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
