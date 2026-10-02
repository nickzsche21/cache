import { build, search, citeUrl, tokens, terms, type Pack, type Index, type Result, type Remedy } from "../lib/search";
import { readSelf, descend, assemble, fileName, type Meta } from "./replicate";

type Kid = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined>;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === "function") el.addEventListener(k.replace(/^on/, ""), v);
    else if (k === "class") el.className = String(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const k of kids) if (k !== null && k !== undefined && k !== false) el.append(k);
  return el;
}

/** Text with <mark> around the given ranges — built from nodes, never from HTML. */
function marked(text: string, marks: [number, number][]): DocumentFragment {
  const f = document.createDocumentFragment();
  let at = 0;
  for (const [a, b] of [...marks].sort((x, y) => x[0] - y[0])) {
    if (a < at) continue;
    f.append(text.slice(at, a), h("mark", {}, text.slice(a, b)));
    at = b;
  }
  f.append(text.slice(at));
  return f;
}

const QUICK = ["severe bleeding", "CPR", "choking", "burn", "hypothermia", "snake bite", "purify water", "earthquake", "find north", "SOS signal"];
const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;

export type Host = {
  /** "site" is generation 0 on the web; "copy" is any file made by the button. */
  kind: "site" | "copy";
  offline: () => "ready" | "pending" | "unavailable";
  onOfflineChange?: (cb: () => void) => void;
};

export function mount(root: HTMLElement, pack: Pack, meta: Meta, host: Host) {
  const store = (k: string, v?: string) => {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { /* file:// or private mode */ }
    return null;
  };
  let night = store("cache-night") === "1";
  let big = store("cache-big") === "1";
  let q = "";
  let view: { kind: "home" } | { kind: "results" } | { kind: "read"; doc: number } | { kind: "shelf"; shelf: string } = { kind: "home" };
  let ix: Index | null = null;
  let last: ReturnType<typeof search> | null = null;

  const apply = () => {
    document.documentElement.dataset.night = night ? "1" : "0";
    document.documentElement.dataset.big = big ? "1" : "0";
  };
  apply();

  const input = h("input", {
    type: "search", class: "q", autocomplete: "off", spellcheck: "false", enterkeyhint: "search",
    placeholder: "What’s happening? e.g. snake bite, purify water",
    "aria-label": "Search the library",
  });
  const main = h("main", { class: "main", "aria-live": "polite" });
  const status = h("span", { class: "chip" });
  const copyBox = h("section", { class: "copy", "aria-labelledby": "copy-h" });

  function setStatus() {
    if (host.kind === "copy") {
      status.textContent = `copy ${meta.generation} · offline`;
      status.title = "A self-contained copy: it needs no internet and no server.";
      status.dataset.ok = "1";
      return;
    }
    const s = host.offline();
    status.textContent = s === "ready" ? "offline ready" : s === "pending" ? "saving…" : "online only";
    status.title = s === "ready" ? "Saved in this browser: it opens in airplane mode." : s === "pending" ? "Saving the library for offline use." : "This browser cannot save it for offline use. Make a copy instead.";
    status.dataset.ok = s === "ready" ? "1" : "0";
  }
  setStatus();
  host.onOfflineChange?.(setStatus);

  let timer: ReturnType<typeof setTimeout> | undefined;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => go(input.value), 90);
  });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { clearTimeout(timer); go(input.value); } });

  function go(text: string) {
    q = text;
    if (!ix) return;
    if (!text.trim()) { view = { kind: "home" }; render(); return; }
    last = search(ix, text, 10);
    view = { kind: "results" };
    render();
  }

  const header = h("header", { class: "top" },
    h("div", { class: "brand" },
      h("span", { class: "mark-logo", "aria-hidden": "true" }, "▣"),
      h("span", { class: "name" }, "CACHE"),
      status,
    ),
    h("div", { class: "tools" },
      h("button", { class: "tool", "aria-pressed": String(night), title: "Red light keeps your night vision",
        onclick: (e) => { night = !night; store("cache-night", night ? "1" : "0"); apply(); (e.currentTarget as HTMLElement).setAttribute("aria-pressed", String(night)); } }, "red", h("span", { class: "wide" }, " light")),
      h("button", { class: "tool", "aria-pressed": String(big),
        onclick: (e) => { big = !big; store("cache-big", big ? "1" : "0"); apply(); (e.currentTarget as HTMLElement).setAttribute("aria-pressed", String(big)); } }, "Aa"),
    ),
  );

  const sos = h("p", { class: "sos" },
    h("strong", {}, "If someone may be dying, call your local emergency number first. "),
    "This is a reference library, not a medic.",
  );

  const chips = h("div", { class: "chips" },
    ...QUICK.map((c) => h("button", { class: "qchip", onclick: () => { input.value = c; go(c); } }, c)),
  );

  root.replaceChildren(header, h("div", { class: "wrap" }, sos, input, chips, main, copyBox));

  /* ── views ────────────────────────────────────────────────────────────── */

  function citation(d: Pack["docs"][number]) {
    const rev = d.rev ? `revision ${d.rev}` : "current revision";
    return h("p", { class: "cite" },
      "Wikipedia, “", d.t, "”, ", rev, d.ts ? `, ${d.ts}` : "", ". CC BY-SA 4.0. ",
      h("a", { href: citeUrl(d), target: "_blank", rel: "noopener" }, "source"),
    );
  }

  function resultCard(r: Result) {
    const shelf = ix!.pack.shelves[r.doc.shelf] ?? "";
    return h("article", { class: "card" },
      h("div", { class: "card-h" },
        h("button", { class: "title", onclick: () => { view = { kind: "read", doc: r.docIndex }; render(); window.scrollTo(0, 0); } }, r.doc.t),
        h("span", { class: "shelf" }, shelf),
      ),
      ...r.hits.map((hit) => {
        const c = ix!.chunks[hit.chunk];
        return h("blockquote", { class: "passage" },
          c.heading ? h("span", { class: "sec" }, c.heading) : null,
          h("p", {}, hit.snippet.cut[0] ? "… " : "", marked(hit.snippet.text, hit.snippet.marks), hit.snippet.cut[1] ? " …" : ""),
        );
      }),
      citation(r.doc),
    );
  }

  function remedyCard(r: Remedy) {
    return h("article", { class: "card remedy" },
      h("div", { class: "card-h" },
        h("span", { class: "title static" }, r.name),
        h("span", { class: "shelf" }, r.kind === "home" ? "home care" : "herb · NCCIH"),
      ),
      h("p", {}, r.uses),
      r.how ? h("p", { class: "how" }, h("strong", {}, "How: "), r.how) : null,
      h("p", { class: "caution" }, h("strong", {}, "Caution: "), r.cautions),
      r.evidence ? h("p", { class: "evidence" }, r.evidence) : null,
      h("p", { class: "cite" }, "US government guidance, public domain, via Project NOMAD. ",
        h("a", { href: r.sourceUrl, target: "_blank", rel: "noopener" }, "source")),
    );
  }

  function renderResults() {
    const a = last!;
    const kids: Kid[] = [];
    if (!a.results.length && !a.remedies.length) {
      kids.push(h("p", { class: "empty" }, "Nothing in the library matches that. Try fewer or plainer words — “burn”, not “I think he burned his arm on the stove”."));
    }
    if (a.conditions.length) {
      kids.push(h("p", { class: "understood" }, "Read as: ", a.conditions.map((c) => c.label).join(", "), " — from Project NOMAD’s condition list."));
    }
    kids.push(...a.results.map(resultCard));
    if (a.remedies.length) {
      kids.push(
        h("h2", { class: "band" }, `Home care for minor ${a.conditions.map((c) => c.label.toLowerCase()).join(", ")}`),
        h("p", { class: "note" }, "For mild cases only. These cards come from NOMAD’s collection of CDC, NIH and NCCIH guidance; the caution line is part of the answer."),
        ...a.remedies.map(remedyCard),
      );
    }
    main.replaceChildren(...kids.filter(Boolean) as Node[]);
  }

  function renderReader(di: number) {
    const d = ix!.pack.docs[di];
    const wanted = new Set(terms(q));
    const sec = (head: string, text: string) => {
      const marks: [number, number][] = wanted.size
        ? tokens(text).filter((t) => wanted.has(t.term)).map((t) => [t.start, t.end])
        : [];
      return h("section", { class: "rsec" },
        head ? h("h3", {}, head) : null,
        ...text.split(/\n+/).map((para) => {
          const off = text.indexOf(para);
          const local = marks.filter(([a, b]) => a >= off && b <= off + para.length).map(([a, b]) => [a - off, b - off] as [number, number]);
          return h("p", {}, marked(para, local));
        }),
      );
    };
    main.replaceChildren(
      h("button", { class: "back", onclick: () => { view = q.trim() ? { kind: "results" } : { kind: "home" }; render(); } }, "← back"),
      h("h1", { class: "rtitle" }, d.t),
      citation(d),
      ...d.s.map(([head, text]) => sec(head, text)),
      citation(d),
    );
  }

  function renderShelf(shelf: string) {
    const docs = ix!.pack.docs.map((d, i) => ({ d, i })).filter(({ d }) => d.shelf === shelf).sort((a, b) => a.d.t.localeCompare(b.d.t));
    main.replaceChildren(
      h("button", { class: "back", onclick: () => { view = { kind: "home" }; render(); } }, "← shelves"),
      h("h2", { class: "band" }, ix!.pack.shelves[shelf]),
      h("ul", { class: "titles" }, ...docs.map(({ d, i }) =>
        h("li", {}, h("button", { onclick: () => { view = { kind: "read", doc: i }; render(); window.scrollTo(0, 0); } }, d.t)))),
    );
  }

  function renderHome() {
    const counts = new Map<string, number>();
    for (const d of pack.docs) counts.set(d.shelf, (counts.get(d.shelf) ?? 0) + 1);
    main.replaceChildren(
      h("h2", { class: "band" }, "Shelves"),
      h("div", { class: "shelves" },
        ...Object.entries(pack.shelves).map(([k, label]) =>
          h("button", { class: "shelf-btn", onclick: () => { view = { kind: "shelf", shelf: k }; render(); } },
            h("span", {}, label), h("span", { class: "n" }, String(counts.get(k) ?? 0))))),
      h("p", { class: "note" },
        `${pack.docs.length} articles and ${pack.remedies.length} remedy cards, `,
        `${ix ? ix.chunks.length.toLocaleString() : "…"} passages, searched on this device with no AI and no server.`),
    );
  }

  function render() {
    if (!ix) { main.replaceChildren(h("p", { class: "empty" }, "Building the index…")); return; }
    if (view.kind === "results" && last) renderResults();
    else if (view.kind === "read") renderReader(view.doc);
    else if (view.kind === "shelf") renderShelf(view.shelf);
    else renderHome();
  }

  /* ── the copy ─────────────────────────────────────────────────────────── */

  function renderCopy() {
    let size = "";
    try { size = mb(new Blob([document.documentElement.outerHTML]).size); } catch { /* estimate unavailable */ }
    const lineage = meta.lineage.length
      ? h("ol", { class: "lineage", "aria-label": "Copies this file descends from" },
        h("li", { class: "gen0" }, h("span", { class: "dot" }), "website"),
        ...[...meta.lineage].reverse().map((l) => h("li", {}, h("span", { class: "dot" }), `copy ${l.generation}`, h("small", {}, l.at))))
      : null;
    const msg = h("p", { class: "copy-msg", role: "status" });
    copyBox.replaceChildren(...([
      h("h2", { id: "copy-h" }, "Make a copy"),
      h("p", {}, "The whole library — every article, the search, this button — in ", h("strong", {}, "one file"), size ? ` of about ${size}` : "", ". ",
        "Send it by AirDrop, Bluetooth, USB stick or SD card. It opens in any browser with no internet, and it can make copies of itself."),
      h("button", { class: "copy-btn", onclick: () => {
        try {
          const parts = readSelf(document);
          const next = descend(parts.meta);
          const blob = new Blob([assemble({ ...parts, meta: next })], { type: "text/html" });
          const a = h("a", { href: URL.createObjectURL(blob), download: fileName(next) });
          document.body.append(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 8000);
          msg.textContent = `Saved ${fileName(next)} — ${mb(blob.size)}, generation ${next.generation}.`;
        } catch (e) {
          msg.textContent = `Could not make a copy here: ${(e as Error).message}`;
        }
      } }, host.kind === "copy" ? `Copy this copy → generation ${meta.generation + 1}` : "Download the library as one file"),
      msg,
      lineage,
      h("p", { class: "fine" },
        "Text from Wikipedia (CC BY-SA 4.0), each passage cited to the revision it was taken from. Remedy cards and the condition vocabulary from ",
        h("a", { href: pack.sources.nomad.url, target: "_blank", rel: "noopener" }, "Project NOMAD"), " (Apache-2.0), whose remedy text is US government public domain. ",
        "Copies keep these notices. Library built ", pack.built, ". ",
        host.kind === "copy" ? h("span", {}, "Newer editions: ", h("a", { href: meta.home, target: "_blank", rel: "noopener" }, meta.home.replace(/^https?:\/\//, ""))) : null,
      ),
    ].filter(Boolean) as Node[]));
  }

  render();
  renderCopy();
  // Build after first paint so the page is usable to look at immediately.
  setTimeout(() => {
    ix = build(pack);
    render();
    input.focus({ preventScroll: true });
    if (q) go(q);
  }, 0);
}
