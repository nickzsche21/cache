import { gunzipSync, strFromU8 } from "fflate";
import { mount } from "./app";
import type { Host } from "./ctx";
import { IDS, embedJSON, type Meta } from "./replicate";
import type { Pack } from "../lib/search";

const byId = (id: string) => document.getElementById(id)!;
const meta = JSON.parse(byId(IDS.meta).textContent ?? "{}") as Meta;
/** The library travels gzipped inside the file; unpacking it takes a moment, once. */
function unpack(b64: string): Pack {
  const bin = atob(b64.replace(/\s+/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return JSON.parse(strFromU8(gunzipSync(bytes))) as Pack;
}
const pack = unpack(byId(IDS.pack).textContent ?? "");

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
  const hadController = Boolean(navigator.serviceWorker.controller);
  // A newer worker taking over means a newer library has been saved. Say so,
  // rather than reloading under someone in the middle of reading.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || document.getElementById("cache-update")) return;
    const bar = document.createElement("button");
    bar.id = "cache-update";
    bar.className = "update-bar";
    bar.textContent = "A newer library is saved — tap to load it";
    bar.addEventListener("click", () => location.reload());
    document.body.append(bar);
  });
  navigator.serviceWorker.register("sw.js").then((reg) => { void reg.update().catch(() => {}); return navigator.serviceWorker.ready; }).then(async () => {
    for (let i = 0; i < 40; i++) {
      if (await caches.match(here)) return set("ready");
      await new Promise((r) => setTimeout(r, 500));
    }
    set("unavailable");
  }).catch(() => set("unavailable"));
}

mount(byId(IDS.root), pack, meta, { kind, offline: () => offline, onOfflineChange: (cb) => listeners.push(cb) });
