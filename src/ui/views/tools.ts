import { h, fill, beep, keepAwake, vibrate, fullscreen, exitFullscreen, load, save, clock, span, two, type Kid } from "../dom";
import type { Ctx } from "../ctx";
import { sunDay, crossings, phase, sun, moon, phaseName, sunNow, MOON_H0 } from "../../lib/tools/sky";
import {
  distanceKm, bearingDeg, compassPoint, formatLatLon, formatDistance, bleachDose, boilMinutes, heatIndexC, heatCategory,
  cToF, fToC, windChillC, lightningKm, toMorse, morseTiming, MORSE, UNITS, convert, inIndia, type LatLon,
} from "../../lib/tools/field";
import { copyBox } from "./library";

export type Place = { name: string; lat: number; lon: number; at: string };
type Fix = { lat: number; lon: number; alt: number | null; acc: number; at: number };

/* ── where you are: GPS works with no internet at all ─────────────────────── */
let fix: Fix | null = null;
let fixError = "";
let watching = false;
const fixSubs = new Set<() => void>();
export function watchLocation(cb: () => void): () => void {
  fixSubs.add(cb);
  if (!watching && "geolocation" in navigator) {
    watching = true;
    navigator.geolocation.watchPosition(
      (p) => { fix = { lat: p.coords.latitude, lon: p.coords.longitude, alt: p.coords.altitude, acc: p.coords.accuracy, at: p.timestamp }; fixError = ""; fixSubs.forEach((f) => f()); },
      (e) => { fixError = e.code === 1 ? "Location permission was refused. Allow it in the browser to use GPS." : "No GPS fix yet. Step outside, away from tall buildings, and wait a minute."; fixSubs.forEach((f) => f()); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    );
  }
  if (!("geolocation" in navigator)) fixError = "This browser cannot read the location.";
  return () => fixSubs.delete(cb);
}
export const currentFix = () => fix;

/* ── which way the phone points ───────────────────────────────────────────── */
let heading: number | null = null;
let headingStarted = false;
const headSubs = new Set<() => void>();
async function startHeading(): Promise<string | null> {
  const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
  if (!DOE) return "This device has no compass the browser can read. Use the Sun instead — see Sun & moon.";
  if (typeof DOE.requestPermission === "function") {
    try { if ((await DOE.requestPermission()) !== "granted") return "Compass permission was refused."; } catch { return "Compass permission was refused."; }
  }
  if (headingStarted) return null;
  headingStarted = true;
  const turn = () => (screen.orientation?.angle ?? 0);
  const set = (v: number) => { heading = (v + turn() + 360) % 360; headSubs.forEach((f) => f()); };
  window.addEventListener("deviceorientationabsolute", ((e: DeviceOrientationEvent) => { if (e.alpha !== null) set(360 - e.alpha); }) as EventListener, true);
  window.addEventListener("deviceorientation", ((e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
    if (typeof e.webkitCompassHeading === "number") set(e.webkitCompassHeading);
  }) as EventListener, true);
  return null;
}

/* ── full-screen light: SOS, Morse, torch ─────────────────────────────────── */
function overlay(onClose: () => void) {
  const el = h("div", { class: "overlay", role: "button", "aria-label": "Tap to stop", tabindex: "0" });
  const hint = h("div", { class: "overlay-hint" }, "tap anywhere to stop");
  el.append(hint);
  let release = () => {};
  void keepAwake().then((r) => { release = r; });
  const close = () => { onClose(); release(); exitFullscreen(); el.remove(); };
  el.addEventListener("click", close);
  el.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Escape") close(); });
  document.body.append(el);
  fullscreen(el);
  el.focus();
  setTimeout(() => hint.classList.add("fade"), 2500);
  return el;
}

/* One Morse unit is 240 ms, so the fastest flashing — a run of dots — is about
   2 flashes a second, under the 3 per second where photosensitive seizures
   become a risk. */
const UNIT_MS = 240;
function playMorse(text: string, opts: { light: boolean; sound: boolean; colour: string; loop: boolean }) {
  const seq = morseTiming(text);
  let i = 0, stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const el = opts.light ? overlay(() => { stopped = true; clearTimeout(timer); }) : null;
  const step = () => {
    if (stopped) return;
    if (i >= seq.length) { if (!opts.loop) { el?.click(); return; } i = 0; }
    const s = seq[i++];
    if (el) el.style.background = s.on ? opts.colour : "#000";
    if (s.on && opts.sound) beep(760, s.units * UNIT_MS, 0.3);
    if (s.on) vibrate(s.units * UNIT_MS);
    timer = setTimeout(step, s.units * UNIT_MS);
  };
  step();
  return () => { stopped = true; clearTimeout(timer); };
}

/* ── the panels ───────────────────────────────────────────────────────────── */

type Panel = { id: string; label: string; glyph: string; blurb: string; render: (ctx: Ctx) => HTMLElement };

const link = (ctx: Ctx, title: string, label = title) => {
  const i = ctx.docByTitle(title);
  return i < 0 ? null : h("button", { class: "linkish", onclick: () => ctx.read(i) }, label);
};
const readMore = (ctx: Ctx, ...titles: string[]) => {
  const links = titles.map((t) => link(ctx, t)).filter(Boolean) as HTMLElement[];
  return links.length ? h("p", { class: "more" }, "Read: ", ...links.flatMap((l, i) => (i ? [" · ", l] : [l]))) : null;
};
/** Teaspoons to the nearest kitchen fraction. */
function tsp(x: number): string {
  const whole = Math.floor(x + 0.0625), rest = x - whole;
  const fr: [number, string][] = [[0, ""], [0.125, "⅛"], [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"], [1, ""]];
  let best = fr[0];
  for (const f of fr) if (Math.abs(rest - f[0]) < Math.abs(rest - best[0])) best = f;
  const w = best[0] === 1 ? whole + 1 : whole;
  return `${w || ""}${w && best[1] ? " " : ""}${best[1]}` || "a pinch";
}

const num = (attrs: Record<string, string | number>) => h("input", { type: "number", inputmode: "decimal", class: "field", ...attrs });

const PANELS: Panel[] = [
  {
    id: "sos", label: "SOS light", glyph: "···—", blurb: "Flash SOS, or any message, in Morse with the screen.",
    render: () => {
      const text = h("input", { class: "field wide", value: "SOS", maxlength: "40", "aria-label": "Message to flash" });
      const sound = h("input", { type: "checkbox", checked: true });
      let colour = "#ffffff";
      const colours = h("div", { class: "seg" },
        ...[["#ffffff", "white"], ["#ff2a1a", "red"]].map(([c, l], i) => h("button", { class: i === 0 ? "on" : "", onclick: (e) => {
          colour = c; colours.querySelectorAll("button").forEach((b) => b.classList.remove("on")); (e.currentTarget as HTMLElement).classList.add("on"); } }, l)));
      return h("div", {},
        h("label", { class: "row" }, h("span", {}, "Message"), text),
        h("p", { class: "mono big-morse" }, toMorse("SOS")),
        h("div", { class: "row" }, h("span", {}, "Colour"), colours),
        h("label", { class: "row" }, h("span", {}, "Beep as well"), sound),
        h("button", { class: "go", onclick: () => playMorse(text.value || "SOS", { light: true, sound: sound.checked, colour, loop: true }) }, "Start flashing"),
        h("p", { class: "warn" }, "Flashing light can trigger seizures in people with photosensitive epilepsy. This flashes at most about twice a second, below the three-per-second danger level, but warn anyone nearby."),
        h("p", { class: "note" }, "SOS is sent as one continuous signal, ···———···, then a pause, repeating. Turn your screen brightness all the way up."),
      );
    },
  },
  {
    id: "torch", label: "Flashlight", glyph: "◐", blurb: "Full-screen white light, or red to keep your night vision.",
    render: () => h("div", {},
      h("button", { class: "go", onclick: () => { overlay(() => {}).style.background = "#fff"; } }, "White light"),
      h("button", { class: "go red", onclick: () => { overlay(() => {}).style.background = "#ff1a00"; } }, "Red light"),
      h("p", { class: "note" }, "Red light lets your eyes stay adapted to the dark. Turn your screen brightness up; the screen stays on until you tap it."),
    ),
  },
  {
    id: "cpr", label: "CPR beat", glyph: "♥", blurb: "A steady 110 beats a minute to push to.",
    render: (ctx) => {
      const BPM = 110;
      let timer: ReturnType<typeof setInterval> | undefined, count = 0, total = 0, started = 0, pause = 0, release = () => {};
      let mode: "hands" | "30:2" = "hands";
      const dot = h("div", { class: "beat" }, h("span", {}, "push"));
      const status = h("p", { class: "readout" }, "ready");
      const sub = h("p", { class: "note center" }, "");
      const stop = () => { clearInterval(timer); timer = undefined; release(); go.textContent = "Start"; status.textContent = "stopped"; };
      const tick = () => {
        const now = Date.now();
        if (now < pause) return;
        count++; total++;
        dot.classList.remove("hit"); void dot.offsetWidth; dot.classList.add("hit");
        beep(count === 1 ? 1100 : 880, 60, 0.35);
        vibrate(40);
        status.textContent = mode === "30:2" ? `${count} / 30` : String(total);
        sub.textContent = `${total} compressions · ${two(Math.floor((now - started) / 60000))}:${two(Math.floor(((now - started) / 1000) % 60))}`;
        if (mode === "30:2" && count >= 30) {
          count = 0; pause = now + 6000;
          setTimeout(() => { if (timer) status.textContent = "2 breaths"; }, 600);
        }
      };
      const go = h("button", { class: "go", onclick: async () => {
        if (timer) return stop();
        release = await keepAwake();
        count = 0; total = 0; started = Date.now(); pause = 0;
        go.textContent = "Stop";
        tick();
        timer = setInterval(tick, 60000 / BPM);
      } }, "Start");
      const modes = h("div", { class: "seg" },
        h("button", { class: "on", onclick: (e) => { mode = "hands"; seg(e); } }, "Hands-only"),
        h("button", { onclick: (e) => { mode = "30:2"; seg(e); } }, "30 : 2"));
      const seg = (e: Event) => { modes.querySelectorAll("button").forEach((b) => b.classList.remove("on")); (e.currentTarget as HTMLElement).classList.add("on"); };
      return h("div", {},
        h("p", { class: "sos" }, h("strong", {}, `Call ${inIndia() ? "112" : "emergency services"} first, or have someone call while you start.`)),
        dot, status, sub, go,
        h("div", { class: "row" }, h("span", {}, "Rhythm"), modes),
        h("p", { class: "note" }, `The beat is ${BPM} a minute — inside the 100–120 a minute the CPR article gives. “30 : 2” pauses for two rescue breaths after every 30, for people trained to give them; otherwise keep to hands-only and don’t stop.`),
        readMore(ctx, "Cardiopulmonary resuscitation", "Automated external defibrillator", "Recovery position"),
      );
    },
  },
  {
    id: "compass", label: "Compass & way back", glyph: "➤", blurb: "GPS position, saved places, and the way back to them. No internet needed.",
    render: (ctx) => {
      const pos = h("p", { class: "readout small" }, "waiting for GPS…");
      const meta = h("p", { class: "note" }, "");
      const head = h("p", { class: "note" }, "");
      const list = h("div", { class: "places" });
      const name = h("input", { class: "field wide", placeholder: "Name this place — camp, car, home", maxlength: "40" });
      const draw = () => {
        const f = currentFix();
        if (f) {
          pos.textContent = formatLatLon(f);
          meta.textContent = `${f.lat.toFixed(5)}, ${f.lon.toFixed(5)} · ±${Math.round(f.acc)} m${f.alt !== null ? ` · altitude ${Math.round(f.alt)} m` : ""} · ${clock(f.at)}`;
        } else { pos.textContent = fixError ? "no position" : "waiting for GPS…"; meta.textContent = fixError; }
        head.textContent = heading === null ? "Compass: tap “Use compass” to point the arrows." : `Facing ${Math.round(heading)}° ${compassPoint(heading)}`;
        const places = load<Place[]>("places", []);
        fill(list, ...(places.length ? places.map((p, i) => {
          const d = f ? distanceKm(f, p) : null, b = f ? bearingDeg(f, p) : null;
          const rot = b === null ? null : heading === null ? b : b - heading;
          return h("div", { class: "place" },
            h("div", { class: "arrow", style: rot === null ? "opacity:.25" : `transform:rotate(${rot}deg)` }, "↑"),
            h("div", { class: "grow" },
              h("strong", {}, p.name),
              h("p", { class: "note" }, d === null ? "need a GPS fix" : `${formatDistance(d)} · ${Math.round(b!)}° ${compassPoint(b!)}${heading === null ? " (arrow assumes the top of the phone points north)" : ""}`)),
            h("button", { class: "x", "aria-label": `Forget ${p.name}`, onclick: () => { places.splice(i, 1); save("places", places); draw(); } }, "×"));
        }) : [h("p", { class: "note" }, "No saved places yet. Save where you are now — your camp, your car — and this will point you back.")]));
      };
      watchLocation(draw);
      headSubs.add(draw);
      const sms = h("a", { class: "go ghost", href: "#", onclick: (e) => {
        const f = currentFix();
        if (!f) { e.preventDefault(); return; }
        (e.currentTarget as HTMLAnchorElement).href = `sms:?&body=${encodeURIComponent(`My location: ${f.lat.toFixed(5)}, ${f.lon.toFixed(5)} (±${Math.round(f.acc)} m) at ${clock(f.at)}. ${formatLatLon(f)}. https://maps.google.com/?q=${f.lat.toFixed(5)},${f.lon.toFixed(5)}`)}`;
      } }, "Text my location (SMS)");
      draw();
      return h("div", {},
        pos, meta, head,
        h("div", { class: "btns" },
          h("button", { class: "go ghost", onclick: async () => { const err = await startHeading(); if (err) head.textContent = err; draw(); } }, "Use compass"),
          sms),
        h("p", { class: "note" }, "A text message travels over the phone network, not the internet: it can get through when data cannot."),
        h("h3", { class: "band" }, "Saved places"),
        h("div", { class: "row" }, name, h("button", { class: "go small", onclick: () => {
          const f = currentFix();
          if (!f) { meta.textContent = "No GPS fix yet — wait for one, then save."; return; }
          const places = load<Place[]>("places", []);
          places.unshift({ name: name.value.trim() || `Place ${places.length + 1}`, lat: f.lat, lon: f.lon, at: new Date().toISOString().slice(0, 16) });
          save("places", places.slice(0, 40)); name.value = ""; draw();
        } }, "Save here")),
        list,
        h("p", { class: "note" }, "Saved places stay on this device only. They are never copied into a shared library file."),
        readMore(ctx, "Army Survival Manual · 18. Field-expedient direction finding", "Magnetic declination", "Orienteering"),
      );
    },
  },
  {
    id: "sky", label: "Sun & moon", glyph: "☀", blurb: "Daylight left, sunrise and sunset, moon phase — and north from the Sun.",
    render: (ctx) => {
      const out = h("div", {});
      const lat = num({ step: "0.0001", placeholder: "latitude", "aria-label": "Latitude" });
      const lon = num({ step: "0.0001", placeholder: "longitude", "aria-label": "Longitude" });
      const where = (): (LatLon & { from: string }) | null => {
        const f = currentFix();
        if (f) return { lat: f.lat, lon: f.lon, from: "GPS" };
        if (lat.value && lon.value) return { lat: +lat.value, lon: +lon.value, from: "entered" };
        const p = load<Place[]>("places", [])[0];
        return p ? { lat: p.lat, lon: p.lon, from: `saved place “${p.name}”` } : null;
      };
      const draw = () => {
        const site = where();
        if (!site) { out.replaceChildren(h("p", { class: "note" }, "Waiting for GPS. Or type a latitude and longitude above — the times are only as good as the place.")); return; }
        const now = Date.now(), mid = new Date(); mid.setHours(0, 0, 0, 0);
        const d = sunDay(mid.getTime(), site);
        const s = sunNow(now, site);
        const ph = phase(sun(now), moon(now));
        const m = crossings(mid.getTime(), site, "moon", MOON_H0);
        const t = (v: number | null) => (v === null ? "—" : clock(v));
        let left = "";
        if (d.polar === "day") left = "The Sun does not set today.";
        else if (d.polar === "night") left = "The Sun does not rise today.";
        else if (d.sunrise && now < d.sunrise) left = `Sunrise in ${span(d.sunrise - now)}.`;
        else if (d.sunset && now < d.sunset) left = `${span(d.sunset - now)} of daylight left, and ${d.dusk ? span(d.dusk - now) : "—"} until it is dark.`;
        else left = "The Sun has set.";
        const az = s.az;
        const north = s.alt > 0
          ? (az <= 180 ? `Face the Sun: north is ${Math.round(az)}° to your left.` : `Face the Sun: north is ${Math.round(360 - az)}° to your right.`)
          : "The Sun is below the horizon. Use the stars instead.";
        fill(out,
          h("p", { class: "readout small" }, left),
          h("dl", { class: "times" },
            h("dt", {}, "First light"), h("dd", {}, t(d.dawn)),
            h("dt", {}, "Sunrise"), h("dd", {}, t(d.sunrise)),
            h("dt", {}, "Sun highest"), h("dd", {}, clock(d.noon)),
            h("dt", {}, "Sunset"), h("dd", {}, t(d.sunset)),
            h("dt", {}, "Last light"), h("dd", {}, t(d.dusk)),
            h("dt", {}, "Moon"), h("dd", {}, `${phaseName(ph)}, ${Math.round(ph.illuminated * 100)}% lit`),
            h("dt", {}, "Moonrise / set"), h("dd", {}, `${t(m.rise)} / ${t(m.set)}`),
          ),
          h("h3", { class: "band" }, "North from the Sun"),
          h("p", {}, s.alt > 0 ? `The Sun is ${Math.round(az)}° — ${compassPoint(az)} — and ${Math.round(s.alt)}° above the horizon. ` : "", north),
          h("p", { class: "note" }, `Location: ${site.from}, ${site.lat.toFixed(3)}, ${site.lon.toFixed(3)}. Times are this device’s clock. Positions from the same astronomy as LIMB, good to a few minutes; refraction makes sunrise a minute or two uncertain anyway.`),
          readMore(ctx, "Army Survival Manual · 18. Field-expedient direction finding", "Celestial navigation", "Twilight", "Lunar phase"),
        );
      };
      watchLocation(draw);
      lat.addEventListener("input", draw); lon.addEventListener("input", draw);
      draw();
      return h("div", {}, h("div", { class: "row" }, lat, lon), out);
    },
  },
  {
    id: "water", label: "Make water safe", glyph: "💧", blurb: "Bleach drops for any amount and strength, from the EPA's rule. Boiling times.",
    render: (ctx) => {
      const litres = num({ value: 1, min: 0, step: "0.5", "aria-label": "Litres of water" });
      const pct = num({ value: 6, min: 0, step: "0.25", "aria-label": "Bleach strength, percent" });
      const cloudy = h("input", { type: "checkbox" });
      const alt = num({ placeholder: "altitude, m", "aria-label": "Altitude in metres" });
      const out = h("div", {});
      const presets = h("div", { class: "seg" }, ...[4, 5, 6, 8.25].map((p) => h("button", { onclick: () => { pct.value = String(p); draw(); } }, `${p}%`)));
      const draw = () => {
        const d = bleachDose(+litres.value, +pct.value, cloudy.checked);
        const f = currentFix();
        const a = alt.value ? +alt.value : f?.alt ?? null;
        fill(out,
          // Nobody counts out 127 drops: past a few dozen, lead with teaspoons, as the EPA's own table does.
          !d.ok ? h("p", { class: "warn" }, d.note ?? "")
            : d.drops > 40 ? h("p", { class: "readout" }, `${tsp(d.teaspoons)} teaspoon${d.teaspoons > 1.01 ? "s" : ""}`)
            : h("p", { class: "readout" }, `${d.drops} drop${d.drops === 1 ? "" : "s"}`),
          d.ok && d.drops > 40 ? h("p", { class: "note center" }, `about ${d.drops} drops — a level teaspoon is easier`)
            : d.ok && d.teaspoons >= 0.25 ? h("p", { class: "note center" }, `or about ${tsp(d.teaspoons)} teaspoon`) : null,
          d.ok && d.note ? h("p", { class: "warn" }, d.note) : null,
          d.ok ? h("p", {}, "Stir and let stand for 30 minutes. “The water should have a slight chlorine odor. If it doesn’t, repeat the dosage and let stand for another 15 minutes before use.”") : null,
          h("p", { class: "warn" }, "Use plain chlorine bleach only. The EPA: “Do not use scented, color safe, or bleaches with added cleaners.”"),
          h("h3", { class: "band" }, "Or boil it"),
          h("p", { class: "readout small" }, `Rolling boil for ${boilMinutes(a)} minute${boilMinutes(a) === 1 ? "" : "s"}`),
          h("p", { class: "note" }, "EPA: “Bring water to a rolling boil for at least one minute. At altitudes above 5,000 feet (1,000 meters), boil water for three minutes.”",
            a !== null ? ` Your altitude: ${Math.round(a)} m.` : ""),
        );
      };
      [litres, pct, cloudy, alt].forEach((x) => x.addEventListener("input", draw));
      draw();
      const table = ctx.pack.data?.bleach ?? [];
      return h("div", {},
        h("label", { class: "row" }, h("span", {}, "Water, litres"), litres),
        h("label", { class: "row" }, h("span", {}, "Bleach strength, % (on the label)"), pct),
        presets,
        h("label", { class: "row" }, h("span", {}, "Cloudy, coloured or very cold water (doubles the dose)"), cloudy),
        h("label", { class: "row" }, h("span", {}, "Altitude, metres (for boiling)"), alt),
        out,
        table.length ? h("details", {}, h("summary", {}, "The EPA’s own table"),
          h("table", { class: "tbl" }, ...table.map((r, i) => h("tr", {}, ...r.map((c) => h(i ? "td" : "th", {}, c)))))) : null,
        h("p", { class: "note" }, "From the EPA rule: 8 drops of 6% bleach, or 6 drops of 8.25%, per gallon (3.785 L) — the same amount of chlorine, so any strength scales from it. If the water is cloudy, let it settle and filter it through a clean cloth first."),
        readMore(ctx, "EPA · Emergency disinfection of drinking water", "Army Survival Manual · 6. Water procurement", "Water purification", "Solar water disinfection"),
      );
    },
  },
  {
    id: "lightning", label: "Lightning distance", glyph: "⚡", blurb: "Tap at the flash, tap at the thunder.",
    render: (ctx) => {
      let flashAt = 0;
      const temp = num({ value: inIndia() ? 28 : 20, step: "1", "aria-label": "Air temperature °C" });
      const out = h("p", { class: "readout" }, "—");
      const hist = h("ol", { class: "hist" });
      const log: number[] = [];
      const btn = h("button", { class: "go big", onclick: () => {
        if (!flashAt) { flashAt = performance.now(); btn.textContent = "THUNDER!"; out.textContent = "counting…"; return; }
        const sec = (performance.now() - flashAt) / 1000; flashAt = 0; btn.textContent = "FLASH!";
        const km = lightningKm(sec, +temp.value || 20);
        log.unshift(km);
        out.textContent = `${km.toFixed(1)} km away`;
        hist.replaceChildren(...log.slice(0, 6).map((k, i) => h("li", {}, `${k.toFixed(1)} km${i < log.length - 1 ? (k < log[i + 1] - 0.2 ? " — closer" : k > log[i + 1] + 0.2 ? " — further" : " — same") : ""}`)));
      } }, "FLASH!");
      return h("div", {}, btn, out, hist,
        h("label", { class: "row" }, h("span", {}, "Air temperature °C"), temp),
        h("p", { class: "note" }, "Sound covers about 343 metres a second at 20 °C — roughly a kilometre every three seconds. If you can hear thunder at all, you are within reach of lightning."),
        readMore(ctx, "Lightning", "Lightning injury", "Thunderstorm"));
    },
  },
  {
    id: "heat", label: "Heat & cold", glyph: "🌡", blurb: "How hot it really feels, and wind chill — with the NWS danger bands.",
    render: (ctx) => {
      const t = num({ value: inIndia() ? 38 : 32, step: "0.5", "aria-label": "Air temperature °C" });
      const rh = num({ value: 50, min: 0, max: 100, step: "1", "aria-label": "Relative humidity %" });
      const ct = num({ value: -5, step: "0.5", "aria-label": "Air temperature °C" });
      const wind = num({ value: 20, min: 0, step: "1", "aria-label": "Wind km/h" });
      const hout = h("div", {}), cout = h("div", {});
      const draw = () => {
        const hi = heatIndexC(+t.value, +rh.value), cat = heatCategory(cToF(hi));
        fill(hout,
          h("p", { class: "readout", "data-level": String(cat.level) }, `feels like ${Math.round(hi)} °C`),
          h("p", { class: "center" }, h("strong", {}, cat.label), cat.effect ? ` — ${cat.effect}` : ""),
          h("p", { class: "note" }, "US National Weather Service heat index. It assumes shade and a light wind; full sun can add up to about 8 °C."));
        const wc = windChillC(+ct.value, +wind.value);
        cout.replaceChildren(wc === null
          ? h("p", { class: "note" }, "Wind chill is defined at 10 °C or colder with wind of at least 5 km/h.")
          : h("p", { class: "readout small" }, `feels like ${Math.round(wc)} °C`));
      };
      [t, rh, ct, wind].forEach((x) => x.addEventListener("input", draw));
      draw();
      return h("div", {},
        h("h3", { class: "band" }, "Heat"),
        h("label", { class: "row" }, h("span", {}, "Temperature °C"), t),
        h("label", { class: "row" }, h("span", {}, "Humidity %"), rh),
        hout,
        readMore(ctx, "Heat stroke", "Heat exhaustion", "Dehydration", "Oral rehydration therapy"),
        h("h3", { class: "band" }, "Cold"),
        h("label", { class: "row" }, h("span", {}, "Temperature °C"), ct),
        h("label", { class: "row" }, h("span", {}, "Wind km/h"), wind),
        cout,
        readMore(ctx, "Hypothermia", "Frostbite", "Army Survival Manual · 15. Cold weather survival"));
    },
  },
  {
    id: "units", label: "Units", glyph: "⇄", blurb: "Length, weight (incl. tola), volume, speed, area, temperature.",
    render: () => {
      const group = h("select", { class: "field" }, ...UNITS.map((g) => h("option", { value: g.id }, g.label)), h("option", { value: "temp" }, "Temperature"));
      const v = num({ value: 1, step: "any", "aria-label": "Value" });
      const from = h("select", { class: "field" }), to = h("select", { class: "field" });
      const out = h("p", { class: "readout small" }, "");
      const fill = () => {
        const keys = group.value === "temp" ? ["°C", "°F", "K"] : Object.keys(UNITS.find((g) => g.id === group.value)!.units);
        from.replaceChildren(...keys.map((k) => h("option", { value: k }, k)));
        to.replaceChildren(...keys.map((k) => h("option", { value: k }, k)));
        to.selectedIndex = Math.min(1, keys.length - 1);
        draw();
      };
      const draw = () => {
        const x = +v.value;
        let r: number;
        if (group.value === "temp") {
          const c = from.value === "°C" ? x : from.value === "°F" ? fToC(x) : x - 273.15;
          r = to.value === "°C" ? c : to.value === "°F" ? cToF(c) : c + 273.15;
        } else r = convert(x, UNITS.find((g) => g.id === group.value)!, from.value, to.value);
        out.textContent = `${x} ${from.value} = ${Number(r.toPrecision(6))} ${to.value}`;
      };
      group.addEventListener("change", fill);
      [v, from, to].forEach((x) => x.addEventListener("input", draw));
      fill();
      return h("div", {}, h("div", { class: "row" }, group, v), h("div", { class: "row" }, from, h("span", {}, "→"), to), out,
        h("p", { class: "note" }, "A tola is 11.66 g and a seer 933 g — the traditional Indian weights."));
    },
  },
  {
    id: "morse", label: "Morse", glyph: "−·", blurb: "Turn any message into light or sound, and the full code table.",
    render: () => {
      const text = h("input", { class: "field wide", value: "HELP", maxlength: "60", "aria-label": "Message" });
      const code = h("p", { class: "mono big-morse" }, toMorse("HELP"));
      text.addEventListener("input", () => { code.textContent = toMorse(text.value) || "—"; });
      return h("div", {},
        text, code,
        h("div", { class: "btns" },
          h("button", { class: "go", onclick: () => playMorse(text.value, { light: true, sound: true, colour: "#fff", loop: true }) }, "Flash it"),
          h("button", { class: "go ghost", onclick: () => playMorse(text.value, { light: false, sound: true, colour: "#fff", loop: false }) }, "Beep it once")),
        h("div", { class: "morse-grid" }, ...Object.entries(MORSE).map(([k, c]) => h("div", {}, h("strong", {}, k), " ", h("span", { class: "mono" }, c)))),
        h("p", { class: "note" }, "Timing: a dash is three dots long; a gap of one dot inside a letter, three between letters, seven between words."));
    },
  },
  {
    id: "numbers", label: "Emergency numbers", glyph: "☎", blurb: "India first, and every country Wikipedia lists. Tap to call.",
    render: (ctx) => {
      const rows = ctx.pack.data?.numbers ?? [];
      const tel = (s: string) => {
        const parts: Kid[] = [];
        let last = 0;
        for (const m of s.matchAll(/\b\d{2,6}\b/g)) {
          parts.push(s.slice(last, m.index), h("a", { class: "tel", href: `tel:${m[0]}` }, m[0]));
          last = (m.index ?? 0) + m[0].length;
        }
        parts.push(s.slice(last));
        return parts;
      };
      const rowEl = (r: (typeof rows)[number]) => {
        const same = r.police && r.police === r.ambulance && r.police === r.fire;
        return h("article", { class: "card" },
          h("strong", {}, r.country),
          same ? h("p", {}, "Police, ambulance, fire: ", ...tel(r.police))
            : h("p", {}, r.police ? h("span", {}, "Police ", ...tel(r.police), " · ") : null, r.ambulance ? h("span", {}, "Ambulance ", ...tel(r.ambulance), " · ") : null, r.fire ? h("span", {}, "Fire ", ...tel(r.fire)) : null),
          r.other ? h("p", { class: "note" }, ...tel(r.other)) : null);
      };
      const india = rows.find((r) => r.country === "India");
      const filter = h("input", { type: "search", class: "field wide", placeholder: "Country", "aria-label": "Find a country" });
      const list = h("div", {});
      const draw = () => {
        const f = filter.value.trim().toLowerCase();
        list.replaceChildren(...rows.filter((r) => !f || r.country.toLowerCase().includes(f)).slice(0, f ? 40 : 12).map(rowEl));
      };
      filter.addEventListener("input", draw);
      draw();
      const src = ctx.pack.sources.numbers;
      return h("div", {},
        india && inIndia() ? h("div", { class: "india" },
          h("p", { class: "band" }, "India"),
          h("a", { class: "call112", href: "tel:112" }, "112"),
          h("p", { class: "center" }, "One number for police, ambulance and fire."),
          india.other ? h("p", { class: "note" }, ...tel(india.other)) : null) : null,
        filter, list,
        h("p", { class: "note" }, "Calling needs a phone signal, not internet. Numbers change; this list is ",
          h("a", { href: src?.url ?? "#", target: "_blank", rel: "noopener" }, "Wikipedia’s"), ` at revision ${ctx.pack.data?.numbersRev}, CC BY-SA 4.0.`));
    },
  },
  {
    id: "kit", label: "Go-bag checklist", glyph: "☑", blurb: "Ready.gov's kit list, ticked off on this phone.",
    render: (ctx) => {
      const kit = ctx.pack.data?.kit ?? { basic: [], more: [], upkeep: [] };
      const ticked = new Set(load<string[]>("kit", []));
      const progress = h("p", { class: "readout small" }, "");
      const count = () => { progress.textContent = `${kit.basic.filter((x) => ticked.has(x)).length} of ${kit.basic.length} basics packed`; };
      const item = (x: string) => {
        const cb = h("input", { type: "checkbox", checked: ticked.has(x) || undefined });
        cb.addEventListener("change", () => { if (cb.checked) ticked.add(x); else ticked.delete(x); save("kit", [...ticked]); count(); });
        return h("label", { class: "check" }, cb, h("span", {}, x));
      };
      count();
      return h("div", {},
        progress,
        h("h3", { class: "band" }, "Basic kit"), ...kit.basic.map(item),
        h("h3", { class: "band" }, "Worth adding"), ...kit.more.map(item),
        h("h3", { class: "band" }, "Keeping it ready"), h("ul", {}, ...kit.upkeep.map((x) => h("li", {}, x))),
        h("p", { class: "note" }, "Ready.gov (FEMA), public domain — written for the US; swap in local equivalents. Ticks stay on this device only."),
        readMore(ctx, "Ready.gov · Build a disaster supplies kit", "Bug-out bag", "Army Survival Manual · 3. Survival planning and survival kits"));
    },
  },
  {
    id: "share", label: "Copy & share", glyph: "⧉", blurb: "Put the whole library — tools too — in one file to pass on.",
    render: (ctx) => copyBox(ctx),
  },
];

export function toolsView(ctx: Ctx) {
  // Opening a panel records it in the address, so back returns to the grid.
  const nav = (id?: string) => { const want = id ? `#tools/${id}` : "#tools"; if (location.hash !== want) { try { history.pushState(null, "", want); } catch { /* fine */ } } };
  const el = h("section", { class: "view" });
  const grid = () => h("div", {},
    h("p", { class: "note" }, "Everything here works with no internet. Location and compass use the phone’s own sensors."),
    h("div", { class: "tools" }, ...PANELS.map((p) => h("button", { class: "tool-tile", onclick: () => { nav(p.id); show(p.id); } },
      h("span", { class: "glyph", "aria-hidden": "true" }, p.glyph), h("strong", {}, p.label), h("span", { class: "blurb" }, p.blurb)))));
  function show(id?: string) {
    const p = PANELS.find((x) => x.id === id);
    if (!p) { el.replaceChildren(grid()); return; }
    el.replaceChildren(h("button", { class: "back", onclick: () => { nav(); show(); } }, "← tools"), h("h2", { class: "panel-h" }, p.label), p.render(ctx));
    window.scrollTo(0, 0);
  }
  show();
  return { el, show };
}
