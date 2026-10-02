import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { assemble, descend, embedJSON, fileName, IDS, type Meta, type Parts } from "./replicate";

const unpackB64 = (b64: string) => JSON.parse(zlib.gunzipSync(Buffer.from(b64, "base64")).toString("utf8"));
const packB64 = (v: unknown) => zlib.gzipSync(Buffer.from(JSON.stringify(v))).toString("base64");

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean) => { if (c) pass++; else fails.push(n); };

/** What a browser's textContent would give for each part — script and style bodies are raw text. */
function extract(html: string): Parts {
  const grab = (re: RegExp) => { const m = re.exec(html); if (!m) throw new Error(`missing ${re}`); return m[1]; };
  return {
    css: grab(new RegExp(`<style id="${IDS.css}">([\\s\\S]*?)</style>`)),
    js: grab(new RegExp(`<script id="${IDS.js}">([\\s\\S]*?)</script>`)),
    pack: grab(new RegExp(`<script type="application/octet-stream" id="${IDS.pack}"[^>]*>([\\s\\S]*?)</script>`)),
    meta: JSON.parse(grab(new RegExp(`<script type="application/json" id="${IDS.meta}">([\\s\\S]*?)</script>`))),
  };
}
/** Real script elements: bodies removed first, so string literals inside the program do not count. */
const scripts = (html: string) => {
  const bare = html.replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, "$1$2");
  return { open: (bare.match(/<script\b/gi) ?? []).length, close: (bare.match(/<\/script>/gi) ?? []).length };
};

const meta0: Meta = { generation: 0, home: "https://example.test/", built: "2026-10-02", lineage: [] };

/* ── nothing in the library can break out of its script tag ─────────────── */
{
  const hostile = { docs: [{ t: "</script><script>alert(1)</script>", s: [["<!--", "</SCRIPT >  <img src=x onerror=alert(2)>"]] }] };
  const html = assemble({ css: "body{}", js: "void 0", pack: packB64(hostile), meta: meta0 });
  const n = scripts(html);
  ok(`exactly three scripts, however hostile the text (${n.open} open, ${n.close} close)`, n.open === 3 && n.close === 3);
  ok("the packed library is pure base64", /^[A-Za-z0-9+/=]+$/.test(extract(html).pack));
  ok("and the text comes back exactly", unpackB64(extract(html).pack).docs[0].t === hostile.docs[0].t);
  let threwRaw = false;
  try { assemble({ css: "", js: "", pack: '{"a":"</script>"}', meta: meta0 }); } catch { threwRaw = true; }
  ok("an unpacked library is refused rather than inlined", threwRaw);
  ok("embedJSON escapes every <", !embedJSON({ a: "<<<" }).includes("<"));
  let threw = false;
  try { assemble({ css: "", js: 'x="</script>"', pack: "{}", meta: meta0 }); } catch { threw = true; }
  ok("a program that would close its own tag is refused, not inlined", threw);
  let threw2 = false;
  try { assemble({ css: "", js: 'x="<!--"', pack: "{}", meta: meta0 }); } catch { threw2 = true; }
  ok("so is one containing <!--, which would stop </script> working", threw2);
}

/* ── lineage ────────────────────────────────────────────────────────────── */
{
  const m1 = descend(meta0, new Date("2026-10-02T10:00:00Z"));
  ok("a copy is one generation later", m1.generation === 1);
  ok("and records when", m1.lineage[0].at === "2026-10-02" && m1.lineage[0].generation === 1);
  ok("it keeps where it came from", m1.home === meta0.home);
  let m = meta0;
  for (let i = 0; i < 40; i++) m = descend(m);
  ok("lineage is capped so files do not grow forever", m.lineage.length === 24 && m.generation === 40);
  ok("newest first", m.lineage[0].generation === 40);
  ok("file names say which copy", fileName(m1) === "cache-survival-library-copy-1.html" && fileName(meta0) === "cache-survival-library.html");
}

/* ── the real site file ─────────────────────────────────────────────────── */
{
  const site = fs.readFileSync(path.resolve(__dirname, "../../dist/index.html"), "utf8");
  const p0 = extract(site);
  ok("the site is generation 0", p0.meta.generation === 0);
  const n = scripts(site);
  ok(`the site has exactly three scripts (${n.open}/${n.close})`, n.open === 3 && n.close === 3);
  ok("the program never closes its own tag", !/<\/script/i.test(p0.js));
  ok("and never opens a comment that would swallow the file", !p0.js.includes("\x3c!--"));
  const pack = unpackB64(p0.pack);
  ok(`the whole library is inside (${pack.docs.length} documents)`, pack.docs.length > 700 && pack.remedies.length === 38);
  const raw = fs.readFileSync(path.resolve(__dirname, "../../public/pack.json"), "utf8");
  ok("and it unpacks to exactly the built library", JSON.stringify(pack) === JSON.stringify(JSON.parse(raw)));
  ok(`packing makes the file much smaller (${(site.length / 1e6).toFixed(1)} MB for a ${(raw.length / 1e6).toFixed(1)} MB library)`, site.length < raw.length * 0.6);

  // Self-contained: nothing in the markup asks the network for anything.
  const markup = site.replace(new RegExp(`<script type="application/octet-stream" id="${IDS.pack}"[^>]*>[\\s\\S]*?</script>`), "");
  ok("no external scripts", !/<script[^>]+src=/i.test(markup));
  ok("no stylesheets, images or fonts to fetch", !/<link\b|<img\b|@import|url\(\s*["']?https?:/i.test(markup));

  // A copy, and a copy of that copy, built exactly as the button builds them.
  const html1 = assemble({ ...p0, meta: descend(p0.meta) });
  const p1 = extract(html1);
  const html2 = assemble({ ...p1, meta: descend(p1.meta) });
  const p2 = extract(html2);
  ok("copy one is generation 1", p1.meta.generation === 1);
  ok("copy two is generation 2", p2.meta.generation === 2 && p2.meta.lineage.length === 2);
  ok("the library is byte-identical through two copies", p2.pack === p0.pack);
  ok("so is the program", p2.js === p0.js);
  ok("and the style", p2.css === p0.css);

  // The site and a copy differ only in the generation record and the title.
  const strip = (h: string) => h
    .replace(new RegExp(`(<script type="application/json" id="${IDS.meta}">)[\\s\\S]*?(</script>)`), "$1$2")
    .replace(/<title>[\s\S]*?<\/title>/, "");
  ok("a copy is the site, apart from its generation", strip(html1) === strip(site));
  ok("a copy is within a few hundred bytes of the original", Math.abs(html2.length - site.length) < 400);
}

console.log(fails.length ? `✗ ${fails.length} failed of ${pass + fails.length}` : `✓ ${pass} assertions pass`);
for (const f of fails) console.log("  ✗", f);
process.exit(fails.length ? 1 : 0);
