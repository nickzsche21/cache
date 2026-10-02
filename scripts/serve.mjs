// A minimal static server for local checks: node scripts/serve.mjs <dir> <port> [--accept-upload]
// --accept-upload lets a page PUT the file its copy button produced to /index.html,
// so the exact bytes can be opened on a separate origin. Local testing only.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const dir = path.resolve(process.argv[2]);
const port = Number(process.argv[3] || 4110);
const upload = process.argv.includes("--accept-upload");
fs.mkdirSync(dir, { recursive: true });
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml" };
http.createServer((req, res) => {
  if (upload && req.method === "OPTIONS") {
    res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-methods": "PUT", "access-control-allow-headers": "content-type" });
    return res.end();
  }
  if (upload && req.method === "PUT" && req.url === "/index.html") {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      fs.writeFileSync(path.join(dir, "index.html"), Buffer.concat(chunks));
      res.writeHead(200, { "access-control-allow-origin": "*" });
      res.end(`stored ${Buffer.concat(chunks).length} bytes`);
    });
    return;
  }
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(dir, p);
  if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] ?? "application/octet-stream", "cache-control": "no-cache" });
  fs.createReadStream(f).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`serving ${dir} on http://127.0.0.1:${port}${upload ? " (uploads on)" : ""}`));
