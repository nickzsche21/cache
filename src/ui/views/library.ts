import { h, fill } from "../dom";
import type { Ctx } from "../ctx";
import { readSelf, descend, assemble, fileName } from "../replicate";

const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;

/** The button that makes the library a seed: one file, every part, one generation on. */
export function copyBox(ctx: Ctx) {
  const box = h("section", { class: "copy", "aria-labelledby": "copy-h" });
  let size = "";
  try { size = mb(new Blob([document.getElementById("cache-pack")?.textContent ?? ""]).size + 40_000); } catch { /* estimate unavailable */ }
  const msg = h("p", { class: "copy-msg", role: "status" });
  const lineage = ctx.meta.lineage.length
    ? h("ol", { class: "lineage", "aria-label": "Copies this file descends from" },
      h("li", { class: "gen0" }, h("span", { class: "dot" }), "website"),
      ...[...ctx.meta.lineage].reverse().map((l) => h("li", {}, h("span", { class: "dot" }), `copy ${l.generation}`, h("small", {}, l.at))))
    : null;
  fill(box,
    h("h2", { id: "copy-h" }, "Make a copy"),
    h("p", {}, "The whole library — ", h("strong", {}, `${ctx.pack.docs.length.toLocaleString()} documents`), ", the Army Survival Manual, the search, every tool and this button — in ",
      h("strong", {}, "one file"), size ? ` of about ${size}` : "", ". Send it by AirDrop, Bluetooth, USB stick or SD card. It opens in any browser with no internet, and it can make copies of itself."),
    h("button", { class: "copy-btn", onclick: () => {
      try {
        const parts = readSelf(document);
        const next = descend(parts.meta);
        const blob = new Blob([assemble({ ...parts, meta: next })], { type: "text/html" });
        const a = h("a", { href: URL.createObjectURL(blob), download: fileName(next) });
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 8000);
        msg.textContent = `Saved ${fileName(next)} — ${mb(blob.size)}, generation ${next.generation}. Your medical card, places, notes and checklist are not in it.`;
      } catch (e) { msg.textContent = `Could not make a copy here: ${(e as Error).message}`; }
    } }, ctx.host.kind === "copy" ? `Copy this copy → generation ${ctx.meta.generation + 1}` : "Download the library as one file"),
    msg,
    lineage,
    h("p", { class: "fine" },
      "Text from Wikipedia (CC BY-SA 4.0), each passage cited to the revision it was taken from; US Army FM 21-76, EPA and Ready.gov text (public domain); remedy cards and condition vocabulary from ",
      h("a", { href: ctx.pack.sources.nomad.url, target: "_blank", rel: "noopener" }, "Project NOMAD"), " (Apache-2.0; remedy text US government public domain). Copies keep these notices. Library built ", ctx.pack.built, ". ",
      ctx.host.kind === "copy" && ctx.meta.home ? h("span", {}, "Newer editions: ", h("a", { href: ctx.meta.home, target: "_blank", rel: "noopener" }, ctx.meta.home.replace(/^https?:\/\//, ""))) : null),
  );
  return box;
}

export function libraryView(ctx: Ctx) {
  const el = h("section", { class: "view" });
  function shelves() {
    const counts = new Map<string, number>();
    for (const d of ctx.pack.docs) counts.set(d.shelf, (counts.get(d.shelf) ?? 0) + 1);
    const order = ["manual", ...Object.keys(ctx.pack.shelves).filter((k) => k !== "manual")];
    fill(el,
      h("h2", { class: "band" }, "Shelves"),
      h("div", { class: "shelves" }, ...order.filter((k) => counts.get(k)).map((k) =>
        h("button", { class: `shelf-btn${k === "manual" ? " featured" : ""}`, onclick: () => shelf(k) },
          h("span", {}, ctx.pack.shelves[k]), h("span", { class: "n" }, String(counts.get(k)))))),
      h("p", { class: "note" }, `${ctx.pack.docs.length.toLocaleString()} documents and ${ctx.pack.remedies.length} remedy cards, all on this device.`),
      copyBox(ctx));
  }
  function shelf(k: string) {
    const docs = ctx.pack.docs.map((d, i) => ({ d, i })).filter(({ d }) => d.shelf === k)
      .sort((a, b) => (a.d.chapter ?? 0) - (b.d.chapter ?? 0) || a.d.t.localeCompare(b.d.t));
    fill(el,
      h("button", { class: "back", onclick: shelves }, "← shelves"),
      h("h2", { class: "band" }, ctx.pack.shelves[k]),
      k === "manual" ? h("p", { class: "note" }, "US Army Field Manual FM 21-76, Survival (1992) — the whole book, public domain. Its figures and tables did not survive digitisation; some of its medicine is dated, so prefer the first-aid shelf for treatment.") : null,
      h("ul", { class: "titles" }, ...docs.map(({ d, i }) => h("li", {}, h("button", { onclick: () => ctx.read(i) }, d.src === "fm" ? d.t.replace(/^Army Survival Manual · /, "") : d.t)))));
    window.scrollTo(0, 0);
  }
  shelves();
  return { el, home: shelves };
}
