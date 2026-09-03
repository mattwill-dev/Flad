/**
 * Minimal, dependency-free static file server — for previewing another
 * skin (e.g. insight-js) alongside Flad in the skin-viewer comparison tool
 * (compare.html). Mirrors tests/mock-gateway/server.mjs's static-serving
 * logic, generalized to an arbitrary directory/port.
 *
 * Usage: node serve-static.mjs <directory> [port]
 * Example: node serve-static.mjs ./skins/insight-js 5173
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { join, extname, normalize, resolve } from "node:path";

const [, , dirArg, portArg] = process.argv;
if (!dirArg) {
  console.error("Usage: node serve-static.mjs <directory> [port]");
  process.exit(1);
}

const ROOT = resolve(dirArg);
const PORT = Number(portArg || 5173);

if (!existsSync(ROOT) || !statSync(ROOT).isDirectory()) {
  console.error(`Not a directory: ${ROOT}`);
  process.exit(1);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".avif": "image/avif",
  ".webp": "image/webp",
};

const server = createServer(async (req, res) => {
  // Permissive CORS — this skin's own gateway calls go cross-origin to
  // whatever gateway/mock it's pointed at (see tests/mock-gateway/server.mjs
  // for the matching server-side CORS headers on that end).
  res.setHeader("Access-Control-Allow-Origin", "*");

  const url = new URL(req.url, `http://localhost:${PORT}`);
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  const filePath = join(ROOT, normalize(rel).replace(/^(\.\.[/\\])+/, ""));

  if (!filePath.startsWith(ROOT) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  const body = await readFile(filePath);
  res.writeHead(200, {
    "Content-Type": MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  res.end(body);
});

server.listen(PORT, () => {
  console.log(`Serving ${ROOT}`);
  console.log(`  → http://localhost:${PORT}`);
});
