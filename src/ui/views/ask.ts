import { search, tokens, terms, citeUrl, citeText, type Result, type Remedy, type Doc } from "../../lib/search";
import { h, marked, type Kid } from "../dom";
import type { Ctx } from "../ctx";
import { inIndia } from "../../lib/tools/field";

const QUICK_IN = ["snake bite", "dengue", "heat stroke", "flood", "CPR", "choking", "severe bleeding", "burn", "purify water", "cyclone", "panic attack", "find north"];
const QUICK = ["severe bleeding", "CPR", "choking", "burn", "hypothermia", "snake bite", "purify water", "earthquake", "panic attack", "find north", "SOS signal"];

export function citation(d: Doc) {
  const url = citeUrl(d);
  return h("p", { class: "cite" }, citeText(d), " ", url ? h("a", { href: url, target: "_blank", rel: "noopener" }, "source") : null);
}

export function askView(ctx: Ctx) {
  let q = "";
  let reading: number | null = null;
  const input = h("input", {
    type: "search", class: "q", autocomplete: "off", spellcheck: "false", enterkeyhint: "search",
    placeholder: "What’s happening? e.g. snake bite, purify water", "aria-label": "Search the library",
  });
  const out = h("div", { class: "results", "aria-live": "polite" });
  const chips = h("div", { class: "chips" },
    ...(inIndia() ? QUICK_IN : QUICK).map((c) => h("button", { class: "qchip", onclick: () => { input.value = c; run(c); } }, c)));
  const el = h("section", { class: "view" },
    h("p", { class: "sos" }, h("strong", {}, `If someone may be dying, call ${inIndia() ? "112" : "your local emergency number"} first. `),
      "This is a reference library, not a medic."),
    input, chips, out);

  let timer: ReturnType<typeof setTimeout> | undefined;
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => run(input.value), 90); });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { clearTimeout(timer); run(input.value); } });
  ctx.onIndexed(() => { if (reading === null) run(q); });

  function run(text: string) {
    q = text;
    reading = null;
    const ix = ctx.index();
    if (!text.trim()) { out.replaceChildren(home()); return; }
    if (!ix) {
      out.replaceChildren(h("p", { class: "empty" }, `Reading the library — ${Math.round(ctx.progress() * 100)}%. Your search will run the moment it is done. The Tools tab works already.`));
      return;
    }
    const a = search(ix, text, 12);
    const kids: Kid[] = [];
    if (!a.results.length && !a.remedies.length) {
      kids.push(h("p", { class: "empty" }, "Nothing in the library matches that. Try fewer, plainer words — “burn”, not “I think he burned his arm on the stove”."));
    }
    if (a.conditions.length) kids.push(h("p", { class: "understood" }, "Read as: ", a.conditions.map((c) => c.label).join(", "), " — from Project NOMAD’s condition list."));
    kids.push(...a.results.map((r) => card(r)));
    if (a.remedies.length) {
      kids.push(
        h("h2", { class: "band" }, `Home care for minor ${a.conditions.map((c) => c.label.toLowerCase()).join(", ")}`),
        h("p", { class: "note" }, "For mild cases only. From NOMAD’s collection of CDC, NIH and NCCIH guidance; the caution line is part of the answer."),
        ...a.remedies.map(remedy),
      );
    }
    out.replaceChildren(...(kids.filter(Boolean) as Node[]));
  }

  function home() {
    const ix = ctx.index();
    return h("p", { class: "note" },
      `${ctx.pack.docs.length.toLocaleString()} documents, ${ctx.pack.remedies.length} remedy cards`,
      ix ? `, ${ix.chunks.length.toLocaleString()} passages — searched on this device with no AI and no server.` : ` — reading the library, ${Math.round(ctx.progress() * 100)}%…`);
  }

  function card(r: Result) {
    const ix = ctx.index()!;
    return h("article", { class: "card" },
      h("div", { class: "card-h" },
        h("button", { class: "title", onclick: () => open(r.docIndex) }, r.doc.t),
        h("span", { class: "shelf" }, ctx.pack.shelves[r.doc.shelf] ?? ""),
      ),
      ...r.hits.map((hit) => {
        const c = ix.chunks[hit.chunk];
        return h("blockquote", { class: "passage" },
          c.heading ? h("span", { class: "sec" }, c.heading) : null,
          h("p", {}, hit.snippet.cut[0] ? "… " : "", marked(hit.snippet.text, hit.snippet.marks), hit.snippet.cut[1] ? " …" : ""));
      }),
      citation(r.doc),
    );
  }

  function remedy(r: Remedy) {
    return h("article", { class: "card remedy" },
      h("div", { class: "card-h" }, h("span", { class: "title static" }, r.name), h("span", { class: "shelf" }, r.kind === "home" ? "home care" : "herb · NCCIH")),
      h("p", {}, r.uses),
      r.how ? h("p", {}, h("strong", {}, "How: "), r.how) : null,
      h("p", { class: "caution" }, h("strong", {}, "Caution: "), r.cautions),
      r.evidence ? h("p", { class: "evidence" }, r.evidence) : null,
      h("p", { class: "cite" }, "US government guidance, public domain, via Project NOMAD. ", h("a", { href: r.sourceUrl, target: "_blank", rel: "noopener" }, "source")),
    );
  }

  function open(di: number, query = q) {
    reading = di;
    const d = ctx.pack.docs[di];
    const wanted = new Set(terms(query));
    const section = (head: string, text: string) => {
      const marks: [number, number][] = wanted.size ? tokens(text).filter((t) => wanted.has(t.term)).map((t) => [t.start, t.end]) : [];
      let off = 0;
      return h("section", { class: "rsec" },
        head ? h("h3", {}, head) : null,
        ...text.split("\n").map((para) => {
          const start = text.indexOf(para, off); off = start + para.length;
          const local = marks.filter(([a, b]) => a >= start && b <= start + para.length).map(([a, b]) => [a - start, b - start] as [number, number]);
          return h("p", {}, marked(para, local));
        }));
    };
    const toc = d.s.filter(([h0]) => h0).length > 3
      ? h("nav", { class: "toc" }, ...d.s.map(([head], i) => head ? h("button", { onclick: () => el.querySelectorAll(".rsec")[i]?.scrollIntoView({ behavior: "smooth" }) }, head) : null))
      : null;
    out.replaceChildren(...[
      h("button", { class: "back", onclick: () => run(q) }, q.trim() ? "← results" : "← back"),
      h("h1", { class: "rtitle" }, d.t),
      citation(d),
      toc,
      ...d.s.map(([head, text]) => section(head, text)),
      citation(d),
    ].filter((x): x is HTMLElement => x !== null));
    el.scrollIntoView();
    window.scrollTo(0, 0);
  }

  out.replaceChildren(home());
  return {
    el,
    focus: () => input.focus({ preventScroll: true }),
    ask: (text: string) => { input.value = text; run(text); },
    open,
    refresh: () => { if (reading === null) run(q); },
  };
}
