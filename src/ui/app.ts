import { buildAsync, type Index, type Pack } from "../lib/search";
import type { Meta } from "./replicate";
import { h, pref } from "./dom";
import type { Ctx, Host, Tab } from "./ctx";
import { askView } from "./views/ask";
import { toolsView } from "./views/tools";
import { libraryView } from "./views/library";
import { meView } from "./views/me";

export type { Host } from "./ctx";

const TABS: { id: Tab; label: string; glyph: string }[] = [
  { id: "ask", label: "Ask", glyph: "⌕" },
  { id: "tools", label: "Tools", glyph: "✦" },
  { id: "library", label: "Library", glyph: "▤" },
  { id: "me", label: "Me", glyph: "◉" },
];

export function mount(root: HTMLElement, pack: Pack, meta: Meta, host: Host) {
  let night = pref("night") === "1", big = pref("big") === "1";
  const apply = () => { document.documentElement.dataset.night = night ? "1" : "0"; document.documentElement.dataset.big = big ? "1" : "0"; };
  apply();

  let ix: Index | null = null, progress = 0;
  const indexed: (() => void)[] = [];
  const titles = new Map(pack.docs.map((d, i) => [d.t, i]));

  const ctx: Ctx = {
    pack, meta, host,
    index: () => ix,
    progress: () => progress,
    onIndexed: (cb) => indexed.push(cb),
    go: (tab, sub) => go(tab, sub),
    read: (di, q) => { go("ask"); ask.open(di, q ?? ""); },
    ask: (q) => { go("ask"); ask.ask(q); },
    docByTitle: (t) => titles.get(t) ?? -1,
  };

  const ask = askView(ctx), tools = toolsView(ctx), library = libraryView(ctx), me = meView(ctx);
  const views: Record<Tab, HTMLElement> = { ask: ask.el, tools: tools.el, library: library.el, me: me.el };

  const status = h("span", { class: "chip" });
  const setStatus = () => {
    if (host.kind === "copy") { status.textContent = `copy ${meta.generation} · offline`; status.title = "A self-contained copy: no internet, no server."; status.dataset.ok = "1"; return; }
    const s = host.offline();
    status.textContent = s === "ready" ? "offline ready" : s === "pending" ? "saving…" : "online only";
    status.title = s === "ready" ? "Saved in this browser: it opens in airplane mode." : s === "pending" ? "Saving the library for offline use." : "This browser cannot save it for offline use. Make a copy instead.";
    status.dataset.ok = s === "ready" ? "1" : "0";
  };
  setStatus();
  host.onOfflineChange?.(setStatus);

  const toggle = (label: string, wide: string, title: string, get: () => boolean, set: (v: boolean) => void) => {
    const b = h("button", { class: "tool", "aria-pressed": String(get()), title }, label, h("span", { class: "wide" }, wide));
    b.addEventListener("click", () => { set(!get()); apply(); b.setAttribute("aria-pressed", String(get())); });
    return b;
  };

  const header = h("header", { class: "top" },
    h("div", { class: "brand" }, h("span", { class: "mark-logo", "aria-hidden": "true" }, "▣"), h("span", { class: "name" }, "CACHE"), status),
    h("div", { class: "tools-top" },
      toggle("red", " light", "Red light keeps your night vision", () => night, (v) => { night = v; pref("night", v ? "1" : "0"); }),
      toggle("Aa", "", "Larger text", () => big, (v) => { big = v; pref("big", v ? "1" : "0"); })),
  );

  const main = h("main", { class: "wrap" });
  const tabbar = h("nav", { class: "tabbar", "aria-label": "Sections" },
    ...TABS.map((t) => h("button", { class: "tab", "data-tab": t.id, onclick: () => go(t.id) },
      h("span", { class: "tab-glyph", "aria-hidden": "true" }, t.glyph), h("span", {}, t.label))));

  root.replaceChildren(header, main, tabbar);

  let current: Tab = "ask";
  function go(tab: Tab, sub?: string) {
    current = tab;
    main.replaceChildren(views[tab]);
    tabbar.querySelectorAll<HTMLElement>(".tab").forEach((b) => b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false"));
    if (tab === "tools") tools.show(sub);
    if (tab === "library" && !sub) library.home();
    if (tab === "me") me.refresh();
    const want = `#${tab}${sub ? "/" + sub : ""}`;
    if (location.hash !== want) { try { history.pushState(null, "", want); } catch { /* file:// in some browsers */ } }
    window.scrollTo(0, 0);
  }

  const fromHash = () => {
    const [t, sub] = (location.hash.slice(1) || "ask").split("/") as [Tab, string | undefined];
    return { t: TABS.some((x) => x.id === t) ? t : ("ask" as Tab), sub };
  };
  const first = fromHash();
  go(first.t, first.sub);
  if (current === "ask") ask.focus();
  // Links like #tools/water, and the phone's back button, move between views.
  window.addEventListener("hashchange", () => { const { t, sub } = fromHash(); go(t, sub); });

  // Read the library in slices after first paint; the tools do not need it.
  setTimeout(() => {
    void buildAsync(pack, (p) => { progress = p; if (!ix) ask.refresh(); }).then((built) => {
      ix = built;
      indexed.forEach((f) => f());
    });
  }, 30);
}
