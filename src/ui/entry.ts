import { mount, type Host } from "./app";
import { IDS, embedJSON, type Meta } from "./replicate";
import type { Pack } from "../lib/search";

const byId = (id: string) => document.getElementById(id)!;
const meta = JSON.parse(byId(IDS.meta).textContent ?? "{}") as Meta;
const pack = JSON.parse(byId(IDS.pack).textContent ?? "{}") as Pack;

const onWeb = /^https?:$/.test(location.protocol);
const kind: Host["kind"] = meta.generation === 0 && onWeb ? "site" : "copy";

// Generation 0 learns where it lives, so every copy can point back to it.
if (kind === "site") {
  meta.home = location.origin + location.pathname.replace(/index\.html$/, "");
  byId(IDS.meta).textContent = embedJSON(meta);
}

let offline: ReturnType<Host["offline"]> = "unavailable";
const listeners: (() => void)[] = [];
const set = (s: typeof offline) => { offline = s; listeners.forEach((f) => f()); };

if (kind === "site" && "serviceWorker" in navigator) {
  offline = "pending";
  const link = document.createElement("link");
  link.rel = "manifest"; link.href = "manifest.webmanifest";
  document.head.append(link);
  const here = new URL("./", location.href).href;
  navigator.serviceWorker.register("sw.js").then(() => navigator.serviceWorker.ready).then(async () => {
    for (let i = 0; i < 40; i++) {
      if (await caches.match(here)) return set("ready");
      await new Promise((r) => setTimeout(r, 500));
    }
    set("unavailable");
  }).catch(() => set("unavailable"));
}

mount(byId(IDS.root), pack, meta, { kind, offline: () => offline, onOfflineChange: (cb) => listeners.push(cb) });
