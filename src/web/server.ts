import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { fetchRoundByOpaqueId } from "../db/rounds.js";
import { isSupabaseConfigured } from "../db/supabase.js";
import { oddsPayload, roundProofJson, verifyRoundProof } from "./publicProof.js";
import { formatOddsEmbedDescription } from "../paytables/oddsPublic.js";

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
}

function sendHtml(res: ServerResponse, status: number, html: string): void {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

function pageShell(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title><style>
body{background:#090714;color:#F5F2FF;font-family:system-ui,sans-serif;margin:0;padding:24px}
.card{background:#160F25;border:1px solid #A847ED;border-radius:12px;padding:20px;max-width:720px;margin:auto}
a{color:#C783FF}code{background:#211537;padding:2px 6px;border-radius:4px}
.ok{color:#39D1AA}.bad{color:#EB5ABC}
</style></head><body><div class="card"><h1>${title}</h1>${body}</div></body></html>`;
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const path = url.pathname;

  if (path === "/health" || path === "/healthz") {
    sendJson(res, 200, { ok: true, supabase: isSupabaseConfigured() });
    return;
  }

  if (path === "/fair" || path === "/how-provably-fair") {
    sendHtml(
      res,
      200,
      pageShell(
        "ByteBits Fairness",
        `<p>Every settled round receives a unique proof page at <code>/fair/&lt;roundId&gt;</code>.</p>
<p>Algorithm: per-round server seed, SHA-256 commitment, HMAC-SHA256 draws.</p>
<p><a href="/odds">View odds</a></p>`
      )
    );
    return;
  }

  if (path.startsWith("/api/public/v1/rounds/") && path.endsWith("/proof")) {
    const id = path.split("/")[5];
    if (!isSupabaseConfigured()) {
      sendJson(res, 503, { error: "database_unconfigured" });
      return;
    }
    const round = await fetchRoundByOpaqueId(id);
    if (!round) {
      sendJson(res, 404, { error: "not_found" });
      return;
    }
    sendJson(res, 200, roundProofJson(round));
    return;
  }

  if (path.startsWith("/api/public/v1/verify/")) {
    const id = path.split("/").pop()!;
    const round = await fetchRoundByOpaqueId(id);
    if (!round) {
      sendJson(res, 404, { error: "not_found" });
      return;
    }
    sendJson(res, 200, verifyRoundProof(round));
    return;
  }

  if (path.startsWith("/api/public/v1/games/") && path.includes("/paytables/")) {
    const parts = path.split("/");
    const gameId = parts[5];
    sendJson(res, 200, oddsPayload(gameId));
    return;
  }

  if (path.startsWith("/odds/")) {
    const gameId = path.split("/")[2] ?? "coinflip";
    sendHtml(
      res,
      200,
      pageShell(
        `Odds · ${gameId}`,
        `<pre style="white-space:pre-wrap">${formatOddsEmbedDescription()}</pre>`
      )
    );
    return;
  }

  if (path === "/odds") {
    res.writeHead(302, { location: "/odds/coinflip" });
    res.end();
    return;
  }

  if (path.startsWith("/fair/")) {
    const id = path.split("/")[2];
    if (!isSupabaseConfigured()) {
      sendHtml(res, 503, pageShell("Fairness", "<p class='bad'>Database not configured.</p>"));
      return;
    }
    const round = await fetchRoundByOpaqueId(id);
    if (!round) {
      sendHtml(res, 404, pageShell("Not found", "<p>Unknown round ID.</p>"));
      return;
    }
    const verification = verifyRoundProof(round);
    const badge =
      verification.status === "verified"
        ? "<p class='ok'>✅ VERIFIED</p>"
        : verification.status === "awaiting_reveal"
          ? "<p>Awaiting reveal</p>"
          : "<p class='bad'>Verification failed</p>";

    sendHtml(
      res,
      200,
      pageShell(
        `Round ${id}`,
        `${badge}
<p>Game: <strong>${round.game}</strong> · Paytable ${round.paytable_version}</p>
<p>Stake ${round.stake_sc} SC · Payout ${round.payout_sc} SC · Fee ${round.fee_sc} SC</p>
<p>Commitment SHA-256: <code>${round.server_seed_hash}</code></p>
<p>Server seed: <code>${round.server_seed ?? "(hidden until settled)"}</code></p>
<p>Client A: <code>${round.client_seed_a}</code> · Client B: <code>${round.client_seed_b || "—"}</code></p>
<pre>${JSON.stringify(round.outcome, null, 2)}</pre>
<p><a href="/api/public/v1/rounds/${id}/proof">Canonical JSON proof</a></p>`
      )
    );
    return;
  }

  sendHtml(res, 404, pageShell("404", "<p>Not found.</p>"));
}

export function startFairnessWebServer(port = Number(process.env.FAIRNESS_WEB_PORT ?? 8787)): void {
  const server = createServer((req, res) => {
    void handleRequest(req, res).catch((err) => {
      console.error("web error", err);
      sendJson(res, 500, { error: "internal" });
    });
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    console.warn(`Fairness web server failed on port ${port}: ${err.message}`);
  });
  server.listen(port, () => {
    console.log(`ByteBits fairness site listening on :${port}`);
  });
}
