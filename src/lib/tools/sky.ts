/**
 * Where the Sun and Moon are, which way the Moon's bright limb points, and the
 * angle that makes the whole thing look wrong.
 *
 * Low-precision series from Meeus, *Astronomical Algorithms*: the Sun to about
 * an arcminute, the Moon to a few arcminutes. That is far finer than the effect
 * being demonstrated, which is measured in whole degrees, and the page says so
 * rather than implying observatory accuracy.
 */

export const RAD = Math.PI / 180;
export const DEG = 180 / Math.PI;

const sin = (d: number) => Math.sin(d * RAD);
const cos = (d: number) => Math.cos(d * RAD);
export const norm360 = (d: number) => ((d % 360) + 360) % 360;
/** Wrap to (-180, 180]. Used for every angle difference on this page. */
export const norm180 = (d: number) => {
  const x = norm360(d);
  return x > 180 ? x - 360 : x;
};

/** Julian Day from a JS timestamp. */
export const toJD = (ms: number) => ms / 86400000 + 2440587.5;
/** Days since J2000.0. */
export const daysSinceJ2000 = (ms: number) => toJD(ms) - 2451545.0;

export type Equatorial = { ra: number; dec: number; dist: number };

/** Obliquity of the ecliptic. */
const obliquity = (d: number) => 23.4392911 - 3.563e-7 * d;

function eclipticToEquatorial(lon: number, lat: number, dist: number, d: number): Equatorial {
  const e = obliquity(d);
  const x = cos(lat) * cos(lon);
  const y = cos(e) * cos(lat) * sin(lon) - sin(e) * sin(lat);
  const z = sin(e) * cos(lat) * sin(lon) + cos(e) * sin(lat);
  return { ra: norm360(Math.atan2(y, x) * DEG), dec: Math.asin(z) * DEG, dist };
}

/** Sun, geometric. Distance in km. */
export function sun(ms: number): Equatorial {
  const d = daysSinceJ2000(ms);
  const L = norm360(280.46646 + 0.9856474 * d);
  const g = norm360(357.52911 + 0.9856003 * d);
  const lon = L + 1.914602 * sin(g) + 0.019993 * sin(2 * g) + 0.000289 * sin(3 * g);
  const r = 1.000001018 * (1 - 0.01671123 * 0.01671123) / (1 + 0.01671123 * cos(g + 1.914602 * sin(g)));
  return eclipticToEquatorial(norm360(lon), 0, r * 149597870.7, d);
}

/**
 * Moon. The principal periodic terms only — evection, variation, annual
 * equation and the main latitude terms — which is what gives a few arcminutes.
 */
export function moon(ms: number): Equatorial {
  const d = daysSinceJ2000(ms);
  const L = norm360(218.3164477 + 13.17639648 * d); // mean longitude
  const M = norm360(134.9633964 + 13.06499295 * d); // moon's mean anomaly
  const Ms = norm360(357.5291092 + 0.98560028 * d); // sun's mean anomaly
  const D = norm360(297.8501921 + 12.19074912 * d); // mean elongation
  const F = norm360(93.2720950 + 13.22935024 * d);  // argument of latitude

  const lon =
    L +
    6.288774 * sin(M) +
    1.274027 * sin(2 * D - M) +
    0.658314 * sin(2 * D) +
    0.213618 * sin(2 * M) -
    0.185116 * sin(Ms) -
    0.114332 * sin(2 * F) +
    0.058793 * sin(2 * D - 2 * M) +
    0.057066 * sin(2 * D - Ms - M) +
    0.053322 * sin(2 * D + M) +
    0.045758 * sin(2 * D - Ms) -
    0.040923 * sin(Ms - M) -
    0.034720 * sin(D) -
    0.030383 * sin(Ms + M);

  const lat =
    5.128122 * sin(F) +
    0.280602 * sin(M + F) +
    0.277693 * sin(M - F) +
    0.173237 * sin(2 * D - F) +
    0.055413 * sin(2 * D - M + F) +
    0.046271 * sin(2 * D - M - F) +
    0.032573 * sin(2 * D + F) +
    0.017198 * sin(2 * M + F);

  const dist =
    385000.56 -
    20905.355 * cos(M) -
    3699.111 * cos(2 * D - M) -
    2955.968 * cos(2 * D) -
    569.925 * cos(2 * M);

  return eclipticToEquatorial(norm360(lon), lat, dist, d);
}

/* ── the observer ─────────────────────────────────────────────────────────── */

export type Site = { lat: number; lon: number };
/** Altitude above the horizon and azimuth measured from north, through east. */
export type Horizontal = { alt: number; az: number };

/** Greenwich mean sidereal time, degrees. */
export function gmst(ms: number): number {
  const d = daysSinceJ2000(ms);
  return norm360(280.46061837 + 360.98564736629 * d);
}

/** Local hour angle of a body, degrees, positive west of the meridian. */
export const hourAngle = (ms: number, site: Site, eq: Equatorial) =>
  norm180(gmst(ms) + site.lon - eq.ra);

export function toHorizontal(ms: number, site: Site, eq: Equatorial): Horizontal {
  const H = hourAngle(ms, site, eq);
  const alt = Math.asin(sin(site.lat) * sin(eq.dec) + cos(site.lat) * cos(eq.dec) * cos(H)) * DEG;
  const az = norm360(
    Math.atan2(sin(H), cos(H) * sin(site.lat) - Math.tan(eq.dec * RAD) * cos(site.lat)) * DEG + 180
  );
  return { alt, az };
}

/**
 * Parallactic angle: how much the equatorial frame is rotated relative to the
 * observer's up. This is the term that makes the effect depend on latitude,
 * which is the part the HN thread kept getting stuck on.
 */
export function parallactic(ms: number, site: Site, eq: Equatorial): number {
  const H = hourAngle(ms, site, eq);
  return Math.atan2(sin(H), Math.tan(site.lat * RAD) * cos(eq.dec) - sin(eq.dec) * cos(H)) * DEG;
}

/* ── the bright limb ──────────────────────────────────────────────────────── */

/** Angular separation between two points on the sphere, degrees. */
export function separation(a: Equatorial, b: Equatorial): number {
  const c = sin(a.dec) * sin(b.dec) + cos(a.dec) * cos(b.dec) * cos(a.ra - b.ra);
  return Math.acos(Math.min(1, Math.max(-1, c))) * DEG;
}

/** Position angle of the Moon's bright limb, measured from celestial north. */
export function brightLimbPA(s: Equatorial, m: Equatorial): number {
  const dRa = s.ra - m.ra;
  return norm360(
    Math.atan2(cos(s.dec) * sin(dRa), sin(s.dec) * cos(m.dec) - cos(s.dec) * sin(m.dec) * cos(dRa)) * DEG
  );
}

export type Phase = { elongation: number; phaseAngle: number; illuminated: number; waxing: boolean };

export function phase(s: Equatorial, m: Equatorial): Phase {
  const psi = separation(s, m);
  // Meeus 48.3 — the Sun is far but not infinitely far.
  const i = Math.atan2(s.dist * sin(psi), m.dist - s.dist * cos(psi)) * DEG;
  return {
    elongation: psi,
    phaseAngle: i,
    illuminated: (1 + cos(i)) / 2,
    waxing: norm180(m.ra - s.ra) > 0,
  };
}

/* ── the sky as seen ──────────────────────────────────────────────────────── */

/** A unit vector in the observer's frame: x east, y north, z up. */
export type Vec = [number, number, number];

export const toVec = (h: Horizontal): Vec => [
  cos(h.alt) * sin(h.az),
  cos(h.alt) * cos(h.az),
  sin(h.alt),
];

export const fromVec = (v: Vec): Horizontal => ({
  alt: Math.asin(Math.min(1, Math.max(-1, v[2]))) * DEG,
  az: norm360(Math.atan2(v[0], v[1]) * DEG),
});

/** The point `deg` degrees along the great circle from a towards b. */
export function alongGreatCircle(a: Horizontal, b: Horizontal, deg: number): Horizontal {
  const va = toVec(a), vb = toVec(b);
  const dot = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const omega = Math.acos(dot);
  if (omega < 1e-9) return a;
  const t = Math.min(1, (deg * RAD) / omega);
  const s1 = Math.sin((1 - t) * omega) / Math.sin(omega);
  const s2 = Math.sin(t * omega) / Math.sin(omega);
  return fromVec([
    s1 * va[0] + s2 * vb[0],
    s1 * va[1] + s2 * vb[1],
    s1 * va[2] + s2 * vb[2],
  ]);
}

/** Points along the great circle from a to b — the actual path across the sky. */
export function greatCircle(a: Horizontal, b: Horizontal, steps = 96): Horizontal[] {
  const va = toVec(a), vb = toVec(b);
  const dot = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const omega = Math.acos(dot);
  const out: Horizontal[] = [];
  if (omega < 1e-9) return [a, b];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const s1 = Math.sin((1 - t) * omega) / Math.sin(omega);
    const s2 = Math.sin(t * omega) / Math.sin(omega);
    out.push(fromVec([
      s1 * va[0] + s2 * vb[0],
      s1 * va[1] + s2 * vb[1],
      s1 * va[2] + s2 * vb[2],
    ]));
  }
  return out;
}

/**
 * Initial bearing of the great circle from a to b, measured clockwise from up.
 *
 * This is the direction the bright limb genuinely faces. Everything about the
 * illusion is the difference between this and the direction a straight line
 * drawn on a flat picture seems to go.
 */
export function bearing(a: Horizontal, b: Horizontal): number {
  const dAz = (b.az - a.az) * RAD;
  const y = Math.sin(dAz) * cos(b.alt);
  const x = cos(a.alt) * sin(b.alt) - sin(a.alt) * cos(b.alt) * Math.cos(dAz);
  return norm360(Math.atan2(y, x) * DEG);
}


/* ── added for CACHE: the day's events, found by watching the sky ─────────────
   Rather than closed-form sunrise equations, these step through the day a
   minute at a time and find where the altitude crosses the threshold. Slower,
   but it is the same position code LIMB validated against the solstices and the
   synodic month, and it handles polar day and polar night without special
   cases: if the line is never crossed, there is no sunrise. */

/** Standard altitudes: refraction and the Sun's radius; civil twilight; the Moon's parallax minus refraction and radius. */
export const SUN_H0 = -0.833;
export const CIVIL_H0 = -6;
export const MOON_H0 = 0.125;

export type Crossings = { rise: number | null; set: number | null };

/** First upward and downward crossing of `h0` within [from, from + 24h). */
export function crossings(from: number, site: Site, body: "sun" | "moon", h0: number, stepMin = 2): Crossings {
  const alt = (t: number) => toHorizontal(t, site, body === "sun" ? sun(t) : moon(t)).alt - h0;
  let rise: number | null = null, set: number | null = null;
  let t0 = from, a0 = alt(t0);
  const end = from + 86_400_000;
  while (t0 < end && (rise === null || set === null)) {
    const t1 = Math.min(end, t0 + stepMin * 60_000), a1 = alt(t1);
    if ((a0 < 0) !== (a1 < 0)) {
      // Bisect to the second.
      let lo = t0, hi = t1, alo = a0;
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2, am = alt(mid);
        if ((alo < 0) === (am < 0)) { lo = mid; alo = am; } else hi = mid;
      }
      const t = Math.round((lo + hi) / 2);
      if (a0 < 0 && rise === null) rise = t;
      if (a0 >= 0 && set === null) set = t;
    }
    t0 = t1; a0 = a1;
  }
  return { rise, set };
}

export type SunDay = {
  dawn: number | null; sunrise: number | null; noon: number; sunset: number | null; dusk: number | null;
  /** All day above the horizon, or all day below it. */
  polar: "day" | "night" | null;
};

/** Sun events for the 24 hours starting at `dayStart` (pass local midnight). */
export function sunDay(dayStart: number, site: Site): SunDay {
  const r = crossings(dayStart, site, "sun", SUN_H0);
  const c = crossings(dayStart, site, "sun", CIVIL_H0);
  let noon = dayStart, best = -99;
  for (let t = dayStart; t < dayStart + 86_400_000; t += 300_000) {
    const a = toHorizontal(t, site, sun(t)).alt;
    if (a > best) { best = a; noon = t; }
  }
  let polar: SunDay["polar"] = null;
  if (r.rise === null && r.set === null) polar = toHorizontal(noon, site, sun(noon)).alt > SUN_H0 ? "day" : "night";
  return { dawn: c.rise, sunrise: r.rise, noon, sunset: r.set, dusk: c.set, polar };
}

export function phaseName(p: Phase): string {
  const k = p.illuminated;
  if (k < 0.03) return "new moon";
  if (k > 0.97) return "full moon";
  if (Math.abs(k - 0.5) < 0.06) return p.waxing ? "first quarter" : "last quarter";
  if (k < 0.5) return p.waxing ? "waxing crescent" : "waning crescent";
  return p.waxing ? "waxing gibbous" : "waning gibbous";
}

/** Where the Sun is right now: the basis of finding north from it. */
export const sunNow = (ms: number, site: Site) => toHorizontal(ms, site, sun(ms));
export const moonNow = (ms: number, site: Site) => toHorizontal(ms, site, moon(ms));
