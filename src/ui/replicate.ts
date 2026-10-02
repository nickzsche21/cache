/**
 * How a copy makes a copy.
 *
 * A CACHE file is four parts and nothing else: its stylesheet, its program,
 * its library and a small record of where it came from. To copy itself it
 * reads those four parts back out of its own page and writes them into a new
 * file, one generation later. Nothing is fetched, so it works on a laptop in a
 * shelter with the network down — which is the only time it needs to.
 */

export type Meta = {
  generation: number;
  /** Where generation 0 lives, so a copy can point people back to updates. */
  home: string;
  built: string;
  /** Most recent first, capped: the dates this lineage was copied on. */
  lineage: { generation: number; at: string }[];
};

/** `pack` is the library gzipped and base64-encoded, exactly as it sits in the file. */
export type Parts = { css: string; js: string; pack: string; meta: Meta };

export const IDS = { css: "cache-style", js: "cache-engine", pack: "cache-pack", meta: "cache-meta", root: "cache-root" } as const;

/**
 * Safe inside a <script> element: every "<" becomes \\u003c, which JSON.parse
 * turns back into "<". So no article text — however it is written — can close
 * the script early and take over the page.
 */
export const embedJSON = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

export function assemble(p: Parts): string {
  if (/<\/script/i.test(p.js)) throw new Error("the program contains a closing script tag and cannot be inlined");
  // A comment opener inside a script switches the HTML parser into a state
  // where "</script>" no longer closes it, and the rest of the file is eaten.
  // Written as \x3c so that this check — which ships inside the program —
  // does not itself contain the four characters it is looking for.
  if (/\x3c!--/.test(p.js)) throw new Error("the program contains a comment opener and cannot be inlined safely");
  if (/<\/style/i.test(p.css)) throw new Error("the stylesheet contains a closing style tag and cannot be inlined");
  // Base64 has no angle brackets in its alphabet, so the library cannot break
  // out of its tag whatever the articles say. Anything else is refused.
  if (!/^[A-Za-z0-9+/=\s]*$/.test(p.pack)) throw new Error("the library is not base64 and cannot be inlined safely");
  return [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
    '<meta name="color-scheme" content="light dark">',
    `<title>CACHE — survival library${p.meta.generation ? ` · copy ${p.meta.generation}` : ""}</title>`,
    `<style id="${IDS.css}">${p.css}</style>`,
    "</head><body>",
    `<div id="${IDS.root}"><p style="font:16px system-ui;padding:24px">Opening the library…</p></div>`,
    `<script type="application/json" id="${IDS.meta}">${embedJSON(p.meta)}</script>`,
    `<script type="application/octet-stream" id="${IDS.pack}" data-encoding="gzip+base64">${p.pack}</script>`,
    `<script id="${IDS.js}">${p.js}</script>`,
    "</body></html>",
  ].join("\n");
}

/** The next generation's record. */
export function descend(meta: Meta, now = new Date()): Meta {
  const generation = meta.generation + 1;
  return {
    ...meta,
    generation,
    lineage: [{ generation, at: now.toISOString().slice(0, 10) }, ...meta.lineage].slice(0, 24),
  };
}

/** Read the four parts back out of a page — the live one, in a browser. */
export function readSelf(doc: Document): Parts {
  const text = (id: string) => {
    const el = doc.getElementById(id);
    if (!el) throw new Error(`missing #${id}`);
    return el.textContent ?? "";
  };
  return { css: text(IDS.css), js: text(IDS.js), pack: text(IDS.pack), meta: JSON.parse(text(IDS.meta)) as Meta };
}

export const fileName = (meta: Meta) => `cache-survival-library${meta.generation ? `-copy-${meta.generation}` : ""}.html`;
