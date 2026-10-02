/** Small DOM helpers. Everything user-visible is built from nodes and text, never HTML strings. */

export type Kid = Node | string | number | null | undefined | false;
export type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === "function") el.addEventListener(k.replace(/^on/, ""), v);
    else if (k === "class") el.className = String(v);
    else if (k === "value" && "value" in el) (el as HTMLInputElement).value = String(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const k of kids) if (k !== null && k !== undefined && k !== false) el.append(typeof k === "number" ? String(k) : k);
  return el;
}

export function marked(text: string, marks: [number, number][]): DocumentFragment {
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

/* ── storage that never leaves the device ─────────────────────────────────
   Personal things — the medical card, saved places, notes, the checklist —
   live in this browser's storage only. A copy of the library is built from the
   page's four parts and never reads these keys, so they cannot travel with it. */
export const PERSONAL = "cache-me-";
export function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(PERSONAL + key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
export function save(key: string, value: unknown) {
  try { localStorage.setItem(PERSONAL + key, JSON.stringify(value)); } catch { /* full or blocked: nothing to do offline */ }
}
export function pref(key: string, v?: string): string | null {
  try { if (v === undefined) return localStorage.getItem("cache-" + key); localStorage.setItem("cache-" + key, v); } catch { /* fine */ }
  return null;
}

/* ── sound, made here: no audio files to carry ──────────────────────────── */
let ac: AudioContext | null = null;
export function audio(): AudioContext | null {
  if (!ac) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    ac = AC ? new AC() : null;
  }
  if (ac?.state === "suspended") void ac.resume();
  return ac;
}
export function beep(freq = 880, ms = 80, gain = 0.25, at?: number) {
  const a = audio();
  if (!a) return;
  const t = at ?? a.currentTime;
  const o = a.createOscillator(), g = a.createGain();
  o.frequency.value = freq; o.type = "square";
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.005);
  g.gain.setValueAtTime(gain, t + ms / 1000 - 0.01);
  g.gain.linearRampToValueAtTime(0, t + ms / 1000);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + ms / 1000 + 0.02);
}

/* ── keep the screen on while a tool is working ─────────────────────────── */
type Sentinel = { release: () => Promise<void> };
export async function keepAwake(): Promise<() => void> {
  try {
    const wl = (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<Sentinel> } }).wakeLock;
    if (!wl) return () => {};
    const s = await wl.request("screen");
    return () => { void s.release().catch(() => {}); };
  } catch { return () => {}; }
}

export const vibrate = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* no motor */ } };

export function fullscreen(el: HTMLElement) {
  try { void el.requestFullscreen?.({ navigationUI: "hide" }).catch(() => {}); } catch { /* not allowed here */ }
}
export function exitFullscreen() {
  try { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); } catch { /* fine */ }
}

export const two = (n: number) => String(n).padStart(2, "0");
export const clock = (ms: number) => { const d = new Date(ms); return `${two(d.getHours())}:${two(d.getMinutes())}`; };
export function span(ms: number) {
  const m = Math.round(Math.abs(ms) / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${two(m % 60)} min`;
}

/** replaceChildren that skips the nulls and falses conditional content produces. */
export function fill(el: Element, ...kids: Kid[]) {
  el.replaceChildren(...kids.filter((k): k is Node | string | number => k !== null && k !== undefined && k !== false).map((k) => (typeof k === "number" ? String(k) : k)));
}
