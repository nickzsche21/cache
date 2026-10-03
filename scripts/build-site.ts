/**
 * Builds dist/: the website, which is generation 0 of the same single file
 * the "make a copy" button produces. The site and a copy differ only in their
 * generation number — that is the point, and the replicate tests check it.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { build as esbuild, transform } from "esbuild";
import { assemble, type Meta } from "../src/ui/replicate";

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

async function main() {
  const js = (await esbuild({
    entryPoints: [path.join(root, "src/ui/entry.ts")],
    bundle: true, format: "iife", minify: true, target: "es2019", write: false, legalComments: "none",
  })).outputFiles[0].text;
  const css = (await transform(fs.readFileSync(path.join(root, "src/ui/style.css"), "utf8"), { loader: "css", minify: true })).code;
  const packText = fs.readFileSync(path.join(root, "public/pack.json"), "utf8");
  const pack = JSON.parse(packText);
  // Gzip with a zero timestamp so the same library always encodes to the same bytes.
  const packB64 = zlib.gzipSync(Buffer.from(JSON.stringify(pack)), { level: 9 }).toString("base64");
  const meta: Meta = { generation: 0, home: "", built: pack.built, lineage: [] };

  const html = assemble({ css, js, pack: packB64, meta });
  fs.writeFileSync(path.join(dist, "index.html"), html);

  const version = crypto.createHash("sha256").update(html).digest("hex").slice(0, 12);
  fs.writeFileSync(path.join(dist, "sw.js"), `/* CACHE service worker — keeps the one file this site is, so it opens in airplane mode. */
const VERSION = "cache-${version}";
const SHELL = ["./", "./manifest.webmanifest", "./icon.svg"];
self.addEventListener("install", (e) => {
  // "reload" goes past the HTTP cache, so a new worker never installs an old page.
  e.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    // Cached copy first, always: someone in trouble should not wait on a dead
    // network. A fresh copy is fetched behind it for next time — and waitUntil
    // keeps this worker alive until it is saved. Without it the browser may
    // stop the worker the moment the page is answered, mid-download, and the
    // update never lands.
    const refresh = caches.open(VERSION).then((c) =>
      fetch(req, { cache: "no-cache" }).then((r) => (r.ok ? c.put("./", r.clone()).then(() => r) : r)).catch(() => null));
    e.waitUntil(refresh);
    e.respondWith(caches.open(VERSION).then(async (c) =>
      (await c.match("./")) || (await refresh) || new Response("Offline, and this browser has not saved the library yet.", { status: 503 })));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
`);
  fs.writeFileSync(path.join(dist, "manifest.webmanifest"), JSON.stringify({
    name: "CACHE — survival library", short_name: "CACHE", start_url: "./", display: "standalone",
    background_color: "#f6f3ea", theme_color: "#15140f",
    icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
  }, null, 2));
  fs.writeFileSync(path.join(dist, "icon.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#15140f"/><rect x="16" y="16" width="32" height="32" rx="3" fill="none" stroke="#d9480f" stroke-width="5"/><rect x="26" y="26" width="12" height="12" fill="#f6f3ea"/></svg>`);

  const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
  const gz = (await import("node:zlib")).gzipSync(html).length;
  console.log(`index.html ${(html.length / 1e6).toFixed(2)} MB (${(gz / 1e6).toFixed(2)} MB on the wire) — library ${(packText.length / 1e6).toFixed(1)} MB packed to ${(packB64.length / 1e6).toFixed(1)} MB; program ${kb(js.length)}, style ${kb(css.length)}; sw ${version}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
