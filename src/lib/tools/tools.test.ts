import { sunDay, crossings, phase, sun, moon, phaseName, sunNow, SUN_H0 } from "./sky";
import {
  distanceKm, bearingDeg, compassPoint, formatLatLon, bleachDose, boilMinutes, heatIndexF, heatCategory, windChillF,
  speedOfSound, lightningKm, toMorse, morseTiming, convert, UNITS, inIndia, LITRES_PER_GALLON,
} from "./field";

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean) => { if (c) pass++; else fails.push(n); };
const near = (n: string, a: number, b: number, tol: number) => ok(`${n} (got ${a.toFixed(3)}, want ${b} ±${tol})`, Math.abs(a - b) <= tol);
const H = 3_600_000;

/* ── sunrise and sunset, checked against physics ────────────────────────── */
{
  const eq = sunDay(Date.UTC(2026, 2, 20, 0) - 0 * H, { lat: 0, lon: 0 });
  // At the equator on an equinox, refraction and the Sun's radius add about seven minutes to twelve hours.
  near("equator equinox day length (hours)", (eq.sunset! - eq.sunrise!) / H, 12.12, 0.05);
  ok("civil dawn comes before sunrise", eq.dawn! < eq.sunrise!);
  ok("and civil dusk after sunset", eq.dusk! > eq.sunset!);
  near("equatorial civil twilight lasts about 22 minutes", (eq.sunrise! - eq.dawn!) / 60000, 22, 3);

  // Mumbai, 20 March: published sunrise is about 06:40 IST.
  const mumbai = { lat: 19.076, lon: 72.8777 };
  const istMidnight = Date.UTC(2026, 2, 19, 18, 30); // 00:00 IST on the 20th
  const m = sunDay(istMidnight, mumbai);
  const ist = (t: number) => new Date(t + 5.5 * H).toISOString().slice(11, 16);
  ok(`Mumbai sunrise on the equinox is about 06:40 IST (got ${ist(m.sunrise!)})`, m.sunrise! - istMidnight > 6.55 * H && m.sunrise! - istMidnight < 6.85 * H);
  ok(`and sunset about 18:50 IST (got ${ist(m.sunset!)})`, m.sunset! - istMidnight > 18.7 * H && m.sunset! - istMidnight < 19.0 * H);

  // Tromsø, 69.6°N: polar night in December, midnight sun in June.
  const tromso = { lat: 69.65, lon: 18.96 };
  const dec = sunDay(Date.UTC(2026, 11, 21, 0), tromso);
  ok(`Tromsø has no sunrise at midwinter (polar ${dec.polar})`, dec.sunrise === null && dec.polar === "night");
  const jun = sunDay(Date.UTC(2026, 5, 21, 0), tromso);
  ok(`and no sunset at midsummer (polar ${jun.polar})`, jun.sunset === null && jun.polar === "day");

  // Longer days in summer than winter at Delhi.
  const delhi = { lat: 28.61, lon: 77.21 };
  const s = sunDay(Date.UTC(2026, 5, 20, 18, 30), delhi), w = sunDay(Date.UTC(2026, 11, 20, 18, 30), delhi);
  ok(`Delhi's June day is longer than its December day (${((s.sunset! - s.sunrise!) / H).toFixed(1)} h vs ${((w.sunset! - w.sunrise!) / H).toFixed(1)} h)`,
    s.sunset! - s.sunrise! > w.sunset! - w.sunrise! + 3 * H);

  // At sunrise the Sun is in the east, give or take the season.
  const az = sunNow(m.sunrise!, mumbai).az;
  ok(`the equinox Sun rises due east (azimuth ${az.toFixed(1)}°)`, az > 87 && az < 93);
  ok("the threshold is the standard −0.833°", SUN_H0 === -0.833);
  ok("a moonrise and moonset are found most days", crossings(Date.UTC(2026, 9, 1), mumbai, "moon", 0.125).rise !== null);
}

/* ── the Moon's phase in words ──────────────────────────────────────────── */
{
  let full = 0, nu = 0;
  for (let d = 0; d < 60 * 24; d += 6) {
    const t = Date.UTC(2026, 0, 1) + d * H;
    const p = phase(sun(t), moon(t));
    if (p.illuminated > 0.985) { full++; ok("near-total illumination reads as full moon", phaseName(p) === "full moon"); }
    if (p.illuminated < 0.01) { nu++; ok("near-zero illumination reads as new moon", phaseName(p) === "new moon"); }
  }
  ok(`two months contain full and new moons (${full}, ${nu})`, full > 0 && nu > 0);
}

/* ── navigation ─────────────────────────────────────────────────────────── */
near("one degree of longitude at the equator (km)", distanceKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }), 111.19, 0.05);
near("Mumbai to Delhi (km)", distanceKm({ lat: 19.076, lon: 72.8777 }, { lat: 28.6139, lon: 77.209 }), 1150, 15);
near("due north is 0°", bearingDeg({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }), 0, 1e-9);
near("due east is 90°", bearingDeg({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }), 90, 1e-9);
near("due south is 180°", bearingDeg({ lat: 10, lon: 5 }, { lat: 5, lon: 5 }), 180, 1e-9);
ok("Delhi is north-north-east of Mumbai", compassPoint(bearingDeg({ lat: 19.076, lon: 72.8777 }, { lat: 28.6139, lon: 77.209 })) === "NNE");
ok("compass points wrap", compassPoint(0) === "N" && compassPoint(359) === "N" && compassPoint(22.5) === "NNE" && compassPoint(180) === "S");
ok("coordinates format as DMS", formatLatLon({ lat: 19.076, lon: -72.8777 }) === "19°04′33.6″N 72°52′39.7″W");

/* ── water, against the EPA's own table ─────────────────────────────────── */
{
  const gal = LITRES_PER_GALLON;
  ok(`EPA: 1 gallon, 6% bleach → 8 drops (got ${bleachDose(gal, 6).drops})`, bleachDose(gal, 6).drops === 8);
  ok(`EPA: 1 gallon, 8.25% bleach → 6 drops (got ${bleachDose(gal, 8.25).drops})`, bleachDose(gal, 8.25).drops === 6);
  ok(`EPA: 1 litre, 6% → 2 drops (got ${bleachDose(1, 6).drops})`, bleachDose(1, 6).drops === 2);
  ok(`EPA: 2 gallons, 6% → 16 drops (got ${bleachDose(2 * gal, 6).drops})`, bleachDose(2 * gal, 6).drops === 16);
  ok(`EPA: 2 gallons, 8.25% → 12 drops (got ${bleachDose(2 * gal, 8.25).drops})`, bleachDose(2 * gal, 8.25).drops === 12);
  near("EPA: 4 gallons, 6% → 1/3 teaspoon", bleachDose(4 * gal, 6).teaspoons, 1 / 3, 1e-9);
  near("EPA: 8 gallons, 6% → 2/3 teaspoon", bleachDose(8 * gal, 6).teaspoons, 2 / 3, 1e-9);
  near("EPA: 8 gallons, 8.25% → 1/2 teaspoon", bleachDose(8 * gal, 8.25).teaspoons, 0.5, 0.03);
  ok("cloudy water doubles the dose", bleachDose(gal, 6, true).drops === 16 && bleachDose(gal, 6, true).doubled);
  ok("a 4% Indian bleach scales up", bleachDose(gal, 4).drops === 12);
  ok("then let it stand 30 minutes", bleachDose(1, 6).standMinutes === 30);
  ok("nonsense in, a reason out", !bleachDose(0, 6).ok && !bleachDose(1, 0).ok && !bleachDose(1, 40).ok);
  ok("boil one minute low down, three above 1,000 m", boilMinutes(200) === 1 && boilMinutes(1500) === 3 && boilMinutes(null) === 1);
}

/* ── heat and cold, against the NWS chart ───────────────────────────────── */
near("NWS: 90°F at 50% → 95", heatIndexF(90, 50), 95, 1);
near("NWS: 100°F at 40% → 109", heatIndexF(100, 40), 109, 1);
near("NWS: 96°F at 65% → 121", heatIndexF(96, 65), 121, 1);
near("NWS: 80°F at 40% → 80", heatIndexF(80, 40), 80, 1);
ok("95 is extreme caution", heatCategory(95).label === "Extreme caution");
ok("109 is danger", heatCategory(109).label === "Danger");
ok("130 is extreme danger", heatCategory(130).label === "Extreme danger");
near("NWS: 0°F, 15 mph → −19", windChillF(0, 15)!, -19, 0.6);
near("NWS: 30°F, 20 mph → 17", windChillF(30, 20)!, 17, 0.6);
near("NWS: −10°F, 10 mph → −28", windChillF(-10, 10)!, -28, 0.6);
ok("wind chill is undefined in warm air or still air", windChillF(60, 10) === null && windChillF(20, 2) === null);

/* ── lightning ──────────────────────────────────────────────────────────── */
near("sound at 20 °C (m/s)", speedOfSound(20), 343.2, 0.3);
near("three seconds is about a kilometre", lightningKm(3), 1.03, 0.01);

/* ── Morse ──────────────────────────────────────────────────────────────── */
ok("SOS", toMorse("sos") === "... --- ...");
ok("words are separated", toMorse("help me") === ".... . .-.. .--. / -- .");
{
  const t = morseTiming("SOS");
  const units = t.reduce((n, x) => n + x.units, 0);
  ok(`SOS as one signal is 30 units including the word gap (got ${units})`, units === 30);
  ok("it starts on and alternates", t[0].on && t.every((x, i) => i === 0 || x.on !== t[i - 1].on));
  const e = morseTiming("E");
  ok("E is one unit on, then the word gap", e.length === 2 && e[0].units === 1 && e[1].units === 7);
}

/* ── units ──────────────────────────────────────────────────────────────── */
const g = (id: string) => UNITS.find((u) => u.id === id)!;
near("a mile in km", convert(1, g("length"), "mile", "km"), 1.609344, 1e-12);
near("a tola in grams", convert(1, g("mass"), "tola", "g"), 11.6638125, 1e-9);
near("a US gallon in litres", convert(1, g("volume"), "US gallon", "litre"), 3.785411784, 1e-12);
near("a knot in km/h", convert(1, g("speed"), "knot", "km/h"), 1.852, 1e-12);

/* ── India first ────────────────────────────────────────────────────────── */
ok("Asia/Kolkata is India", inIndia("Asia/Kolkata", "en-US"));
ok("and so is an en-IN browser anywhere", inIndia("UTC", "en-IN"));
ok("London is not", !inIndia("Europe/London", "en-GB"));

console.log(fails.length ? `✗ ${fails.length} failed of ${pass + fails.length}` : `✓ ${pass} assertions pass`);
for (const f of fails) console.log("  ✗", f);
process.exit(fails.length ? 1 : 0);
