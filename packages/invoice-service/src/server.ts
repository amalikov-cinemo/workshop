/**
 * Minimal REST wrapper around the invoice domain logic.
 *
 * Kept deliberately thin: all business rules live in invoice.ts so the
 * "unit of work" the agent reasons about (and the tests that gate it) stay
 * focused on billing logic, not HTTP plumbing.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { calculateTotals, formatInvoiceSummary, type Invoice } from "./invoice.js";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body);
}

export function createApp() {
  return createServer(async (req, res) => {
    try {
      if (req.method === "POST" && req.url === "/invoices/totals") {
        const invoice = JSON.parse(await readBody(req)) as Invoice;
        return json(res, 200, calculateTotals(invoice));
      }
      if (req.method === "POST" && req.url === "/invoices/summary") {
        const invoice = JSON.parse(await readBody(req)) as Invoice;
        res.writeHead(200, { "content-type": "text/plain" });
        return res.end(formatInvoiceSummary(invoice));
      }
      if (req.method === "GET" && req.url === "/health") {
        return json(res, 200, { status: "ok" });
      }
      return json(res, 404, { error: "not found" });
    } catch (err) {
      return json(res, 400, { error: (err as Error).message });
    }
  });
}

// Start the server only when run directly (not when imported by tests).
if (process.argv[1] && process.argv[1].endsWith("server.js")) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => {
    console.log(`invoice-service listening on http://localhost:${port}`);
  });
}
