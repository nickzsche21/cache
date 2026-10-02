/**
 * Field arithmetic: the small calculations that matter when there is nobody to
 * ask. Every constant here is from a named source, and the tests check the
 * functions against that source's own published figures.
 */

/* ── navigation ───────────────────────────────────────────────────────────── */

const R_EARTH_KM = 6371.0088; // IUGG mean radius
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export type LatLon = { lat: number; lon: number };

/** Great-circle distance, haversine. */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial compass bearing from a to b, degrees clockwise from true north. */
export function bearingDeg(a: LatLon, b: LatLon): number {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

const POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export const compassPoint = (d: number) => POINTS[Math.round((((d % 360) + 360) % 360) / 22.5) % 16];

export function dms(v: number, pos: string, neg: string): string {
  const a = Math.abs(v), d = Math.floor(a), mf = (a - d) * 60, m = Math.floor(mf), s = (mf - m) * 60;
  return `${d}°${String(m).padStart(2, "0")}′${s.toFixed(1).padStart(4, "0")}″${v >= 0 ? pos : neg}`;
}
export const formatLatLon = (p: LatLon) => `${dms(p.lat, "N", "S")} ${dms(p.lon, "E", "W")}`;

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(2)} km`;
  return `${km.toFixed(km < 100 ? 1 : 0)} km`;
}

/* ── water: US EPA, Emergency Disinfection of Drinking Water ───────────────
   "8 drops of 6% bleach, or 6 drops of 8.25% bleach, to each gallon of water.
   Double the amount of bleach if the water is cloudy, colored, or very cold."
   Those two figures are one constant — drops × strength — so any concentration
   on an Indian label scales from it. */
export const LITRES_PER_GALLON = 3.785411784;
export const EPA_DROPS_PER_GALLON_AT_6 = 8;
/** EPA's large-volume figures: 8 gallons takes 2/3 teaspoon of 6% bleach. */
export const EPA_TSP_PER_GALLON_AT_6 = 2 / 3 / 8;

export type Dose = { drops: number; teaspoons: number; doubled: boolean; standMinutes: number; ok: boolean; note?: string };

export function bleachDose(litres: number, percent: number, cloudy = false): Dose {
  if (!(litres > 0) || !(percent > 0)) return { drops: 0, teaspoons: 0, doubled: cloudy, standMinutes: 30, ok: false, note: "Enter the amount of water and the bleach strength from the label." };
  if (percent > 15) return { drops: 0, teaspoons: 0, doubled: cloudy, standMinutes: 30, ok: false, note: "That is stronger than household bleach. Check the label — household bleach is usually 4–8.25%." };
  const gallons = litres / LITRES_PER_GALLON;
  const k = (6 / percent) * (cloudy ? 2 : 1);
  return {
    drops: Math.max(1, Math.round(EPA_DROPS_PER_GALLON_AT_6 * gallons * k)),
    teaspoons: EPA_TSP_PER_GALLON_AT_6 * gallons * k,
    doubled: cloudy,
    standMinutes: 30,
    ok: true,
    note: percent < 4 ? "Weak bleach: the dose is large. Make sure it is plain, unscented chlorine bleach." : undefined,
  };
}

/** EPA: "Bring water to a rolling boil for at least one minute. At altitudes above 5,000 feet (1,000 meters), boil water for three minutes." */
export const boilMinutes = (altitudeM: number | null) => (altitudeM !== null && altitudeM > 1000 ? 3 : 1);

/* ── heat and cold: US National Weather Service ─────────────────────────────
   Heat index: Rothfusz regression with the NWS adjustments, falling back to
   Steadman's simple form below 80°F as the NWS procedure does. Wind chill:
   the 2001 NWS/Environment Canada formula, defined at or below 50°F with wind
   of at least 3 mph. */
export const cToF = (c: number) => (c * 9) / 5 + 32;
export const fToC = (f: number) => ((f - 32) * 5) / 9;

export function heatIndexF(T: number, RH: number): number {
  const simple = 0.5 * (T + 61 + (T - 68) * 1.2 + RH * 0.094);
  if ((simple + T) / 2 < 80) return simple;
  let HI = -42.379 + 2.04901523 * T + 10.14333127 * RH - 0.22475541 * T * RH - 0.00683783 * T * T
    - 0.05481717 * RH * RH + 0.00122874 * T * T * RH + 0.00085282 * T * RH * RH - 0.00000199 * T * T * RH * RH;
  if (RH < 13 && T >= 80 && T <= 112) HI -= ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  else if (RH > 85 && T >= 80 && T <= 87) HI += ((RH - 85) / 10) * ((87 - T) / 5);
  return HI;
}
export const heatIndexC = (c: number, rh: number) => fToC(heatIndexF(cToF(c), rh));

/** NWS heat index categories, in °F. */
export function heatCategory(hiF: number): { level: 0 | 1 | 2 | 3 | 4; label: string; effect: string } {
  if (hiF < 80) return { level: 0, label: "No heat advisory band", effect: "" };
  if (hiF < 90) return { level: 1, label: "Caution", effect: "Fatigue possible with prolonged exposure and activity." };
  if (hiF < 103) return { level: 2, label: "Extreme caution", effect: "Heat stroke, heat cramps or heat exhaustion possible with prolonged exposure and activity." };
  if (hiF < 125) return { level: 3, label: "Danger", effect: "Heat cramps or heat exhaustion likely; heat stroke possible with prolonged exposure and activity." };
  return { level: 4, label: "Extreme danger", effect: "Heat stroke highly likely." };
}

export function windChillF(T: number, mph: number): number | null {
  if (T > 50 || mph < 3) return null;
  const v = Math.pow(mph, 0.16);
  return 35.74 + 0.6215 * T - 35.75 * v + 0.4275 * T * v;
}
export const windChillC = (c: number, kmh: number) => {
  const f = windChillF(cToF(c), kmh / 1.609344);
  return f === null ? null : fToC(f);
};

/* ── lightning ────────────────────────────────────────────────────────────
   Sound in dry air: 331.3·√(1 + T/273.15) m/s — about 343 m/s at 20 °C, so
   three seconds is roughly a kilometre. */
export const speedOfSound = (tempC = 20) => 331.3 * Math.sqrt(1 + tempC / 273.15);
export const lightningKm = (seconds: number, tempC = 20) => (seconds * speedOfSound(tempC)) / 1000;

/* ── Morse (ITU-R M.1677-1) ───────────────────────────────────────────────── */
export const MORSE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-",
  L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-",
  W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....", "6": "-....", "7": "--...",
  "8": "---..", "9": "----.", ".": ".-.-.-", ",": "--..--", "?": "..--..", "/": "-..-.", "-": "-....-", "@": ".--.-.",
};
export const toMorse = (text: string) =>
  text.toUpperCase().split(/\s+/).filter(Boolean).map((w) => [...w].map((c) => MORSE[c] ?? "").filter(Boolean).join(" ")).join(" / ");

/**
 * On/off timing in units: dot 1, dash 3, gap inside a letter 1, between
 * letters 3, between words 7. SOS is sent as one character, without the
 * letter gaps — the procedural signal ...---...
 */
export function morseTiming(text: string, prosignSOS = true): { on: boolean; units: number }[] {
  const out: { on: boolean; units: number }[] = [];
  const push = (on: boolean, units: number) => {
    const last = out[out.length - 1];
    if (last && last.on === on) last.units += units; else out.push({ on, units });
  };
  const words = text.toUpperCase().trim().split(/\s+/).filter(Boolean);
  words.forEach((w, wi) => {
    const letters = prosignSOS && w === "SOS" ? ["...---..."] : [...w].map((c) => MORSE[c]).filter(Boolean);
    letters.forEach((code, li) => {
      [...code].forEach((sym, si) => {
        push(true, sym === "." ? 1 : 3);
        if (si < code.length - 1) push(false, 1);
      });
      if (li < letters.length - 1) push(false, 3);
    });
    push(false, wi < words.length - 1 ? 7 : 7);
  });
  return out;
}

/* ── units ────────────────────────────────────────────────────────────────── */
export type UnitGroup = { id: string; label: string; units: Record<string, number> };
export const UNITS: UnitGroup[] = [
  { id: "length", label: "Length", units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, inch: 0.0254, foot: 0.3048, yard: 0.9144, mile: 1609.344, "nautical mile": 1852 } },
  { id: "mass", label: "Weight", units: { g: 0.001, kg: 1, tonne: 1000, ounce: 0.028349523125, pound: 0.45359237, "tola": 0.0116638125, "seer": 0.93310 } },
  { id: "volume", label: "Volume", units: { ml: 0.001, litre: 1, "cubic metre": 1000, teaspoon: 0.00492892159375, tablespoon: 0.01478676478125, cup: 0.2365882365, "US gallon": 3.785411784, "imperial gallon": 4.54609 } },
  { id: "speed", label: "Speed", units: { "km/h": 1 / 3.6, "m/s": 1, mph: 0.44704, knot: 1852 / 3600 } },
  { id: "area", label: "Area", units: { "m²": 1, hectare: 10000, "km²": 1e6, acre: 4046.8564224, "sq ft": 0.09290304 } },
];
export function convert(v: number, group: UnitGroup, from: string, to: string): number {
  return (v * group.units[from]) / group.units[to];
}
export const TEMPERATURE = {
  c: { f: cToF, k: (c: number) => c + 273.15 },
  f: { c: fToC, k: (f: number) => fToC(f) + 273.15 },
};

/* ── where you probably are ───────────────────────────────────────────────── */
export function inIndia(tz = Intl.DateTimeFormat().resolvedOptions().timeZone, lang = typeof navigator !== "undefined" ? navigator.language : ""): boolean {
  return tz === "Asia/Kolkata" || tz === "Asia/Calcutta" || /-IN$/i.test(lang);
}
