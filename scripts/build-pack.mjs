/**
 * Builds public/pack.json — the library CACHE carries.
 *
 *   Wikipedia   A curated shelf of survival, first-aid and preparedness
 *               articles, each pinned to the exact revision it was taken from
 *               (CC BY-SA 4.0). Every passage the app shows cites title,
 *               revision id and date.
 *   NOMAD       Project NOMAD's curated collections (Apache-2.0 repo):
 *               conditions.json as the synonym map for plain-language search,
 *               and the home and natural remedy cards — themselves US
 *               government public domain (CDC, NIH, MedlinePlus, FDA, NCCIH).
 *
 * The shelves follow NOMAD's own priorities (kiwix-categories.json: Medicine,
 * Survival & Preparedness) but are sized for a phone: a pack that has to fit
 * in a browser and copy itself over Bluetooth, not a 250 GB drive.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wikiCache = path.join(root, ".cache/wiki");
const nomadDir = path.join(root, ".cache/nomad");
fs.mkdirSync(wikiCache, { recursive: true });

const UA = "CACHE-pack-builder/0.1 (https://github.com/nickzsche21/cache; offline survival library)";
const API = "https://en.wikipedia.org/w/api.php";

/* Shelves and their seed articles. Category members are added on top. */
const SHELVES = {
  "first-aid": {
    label: "First aid",
    seeds: [
      "Cardiopulmonary resuscitation", "Automated external defibrillator", "Choking", "Abdominal thrusts",
      "Recovery position", "Bleeding", "Tourniquet", "Pressure bandage", "Wound", "Burn", "Bone fracture",
      "Splint (medicine)", "Sprain", "Shock (circulatory)", "Anaphylaxis", "Epinephrine autoinjector",
      "Concussion", "Seizure", "Stroke", "Myocardial infarction", "Drowning", "Triage", "Primary survey",
      "Head injury", "Spinal cord injury", "Dislocation", "Eye injury", "Nosebleed", "Fainting",
      "Hyperventilation", "Asthma attack", "Hypoglycemia", "Diabetic ketoacidosis", "Poisoning",
      "Dressing (medical)", "Antiseptic", "Wound healing", "First aid kit", "Childbirth", "Electrical injury",
    ],
    categories: ["Category:First aid"],
  },
  "environment": {
    label: "Heat, cold & bites",
    seeds: [
      "Hypothermia", "Frostbite", "Trench foot", "Heat stroke", "Heat exhaustion", "Heat cramps", "Dehydration",
      "Sunburn", "Altitude sickness", "Snakebite", "Spider bite", "Bee sting", "Tick", "Lyme disease",
      "Tick-borne disease", "Rabies", "Tetanus", "Scorpion sting", "Jellyfish", "Lightning injury",
      "Carbon monoxide poisoning", "Mosquito-borne disease", "Malaria", "Dengue fever", "Plant poisoning",
      "Mushroom poisoning", "Poison ivy", "Hypernatremia", "Hyponatremia",
    ],
    categories: ["Category:Wilderness medical emergencies"],
  },
  "illness": {
    label: "Illness & hygiene",
    seeds: [
      "Oral rehydration therapy", "Diarrhea", "Cholera", "Dysentery", "Food poisoning", "Botulism", "Typhoid fever",
      "Gastroenteritis", "Fever", "Infection", "Sepsis", "Cellulitis", "Hand washing", "Sanitation", "Latrine",
      "Pit latrine", "Composting toilet", "Open defecation", "Pneumonia", "Influenza", "Common cold",
      "Measles", "Hepatitis A", "Leptospirosis", "Scabies", "Head louse infestation", "Vaccination",
    ],
    categories: [],
  },
  "everyday": {
    label: "Everyday ailments",
    // One article for each of Project NOMAD's 36 conditions, so a question its
    // vocabulary recognises lands on reading as well as on remedy cards.
    seeds: [
      "Pain", "Headache", "Myalgia", "Arthralgia", "Dysmenorrhea", "Cough", "Nasal congestion", "Sore throat",
      "Allergy", "Heartburn", "Indigestion", "Nausea", "Vomiting", "Constipation", "Motion sickness", "Flatulence",
      "Bloating", "Rash", "Itch", "Contact dermatitis", "Athlete's foot", "Dermatophytosis", "Xeroderma", "Acne",
      "Dry eye syndrome", "Earache", "Earwax", "Canker sore", "Herpes labialis", "Toothache", "Insomnia",
      "Hemorrhoid", "Vaginal yeast infection", "Pinworm infection", "Cheilitis", "Allergic conjunctivitis",
    ],
    categories: [],
  },
  "water": {
    label: "Water",
    seeds: [
      "Water purification", "Portable water purification", "Solar water disinfection", "Water chlorination",
      "Boiling", "Water filter", "Drinking water", "Waterborne diseases", "Rainwater harvesting",
      "Solar still", "Iodine", "Sodium hypochlorite", "Well", "Water scarcity",
    ],
    categories: [],
  },
  "food": {
    label: "Food",
    seeds: [
      "Food preservation", "Canning", "Home canning", "Drying (food)", "Smoking (cooking)", "Salting (food)",
      "Pickling", "Fermentation in food processing", "Foraging", "Hunting", "Fishing", "Trapping", "Snare",
      "Food storage", "Emergency rations", "Malnutrition", "Starvation", "Scurvy", "Edible mushroom",
      "Insects as food", "Survival garden", "Seed saving", "Root cellar",
    ],
    categories: [],
  },
  "shelter": {
    label: "Shelter & fire",
    seeds: [
      "Emergency shelter", "Lean-to", "Debris hut", "Snow cave", "Quinzhee", "Igloo", "Bivouac shelter",
      "Space blanket", "Tarp tent", "Campfire", "Fire making", "Fire triangle", "Ferrocerium", "Bow drill",
      "Fire piston", "Tinder", "Kindling", "Fire striker", "Hand drill", "Layered clothing", "Wildfire",
    ],
    categories: [],
  },
  "navigation": {
    label: "Navigation & signals",
    seeds: [
      "Survival skills", "Wilderness survival", "Survival kit", "Bug-out bag", "Rule of three (survival)",
      "Orienteering", "Compass", "Map", "Topographic map", "Dead reckoning", "Celestial navigation",
      "Polaris", "Southern Cross", "Natural navigation", "Signal mirror", "Distress signal", "Mayday",
      "SOS", "Ground-to-air emergency code", "Whistle", "Search and rescue", "Personal locator beacon",
      "Emergency position-indicating radiobeacon", "Flare", "Knot", "Bowline", "Clove hitch", "Square knot",
      "Taut-line hitch", "Trucker's hitch", "Figure-eight knot", "Sheet bend",
    ],
    categories: ["Category:Survival skills"],
  },
  "disasters": {
    label: "Disasters & weather",
    seeds: [
      "Earthquake", "Earthquake preparedness", "Flood", "Flash flood", "Tropical cyclone", "Tornado",
      "Tsunami", "Heat wave", "Blizzard", "Lightning", "Landslide", "Volcano", "Drought", "Ice storm",
      "Emergency management", "Emergency evacuation", "Disaster", "Power outage", "Weather forecasting",
      "Barometer", "Cloud", "Heat index", "Wind chill", "Storm surge", "Fallout shelter", "Nuclear fallout",
      "Potassium iodide", "Pandemic",
    ],
    categories: [],
  },
  "comms": {
    label: "Radio & power",
    seeds: [
      "Amateur radio", "Amateur radio emergency communications", "Citizens band radio", "Family Radio Service",
      "General Mobile Radio Service", "NOAA Weather Radio", "Emergency Alert System", "Morse code",
      "Crystal radio", "Satellite phone", "Walkie-talkie", "Mesh networking", "Solar panel", "Lead–acid battery",
      "Lithium-ion battery", "Engine-generator", "Inverter (electrical)", "Hand-cranked radio", "Radio propagation",
    ],
    categories: [],
  },
};

/* Category pages bring in brands, organisations, people and individual
   incidents alongside the how-to articles. Those are not knowledge you can act
   on, so they are named and dropped rather than filtered by a guess. */
const EXCLUDE = new Set([
  "Act+Fast Anti Choking Trainer", "Band-Aid", "Burnol", "Casualties Union", "Compeed", "Cotton pad", "E-textiles",
  "First Aid Council of India", "French Civil Protection", "Henry Heimlich", "Inadine", "Medical Tactical Training Program",
  "MedicAlert", "Moulage", "Pac-Kit First Aid Kits", "Saving Londoners' Lives", "Star of Life", "VITAband",
  "Wilderness first aid certification in the US", "Rescue of Bat 21 Bravo", "Ersatz good", "Camping and Woodcraft",
  "Alarm signal (animal communication)", "Choking rescue training devices", "Street medic", "Lifeguard",
]);
const EVENT = /^\d{4}\b|\bFlight \d+\b|\bcrash\b/i;

const SKIP_SECTIONS = /^(see also|references|external links|further reading|notes|bibliography|sources|citations|footnotes|gallery|works cited|explanatory notes|literature)$/i;
const MIN_CHARS = 1500;
const MAX_DOCS = 420;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...params })}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, { headers: { "user-agent": UA } });
    if (r.ok) {
      const j = await r.json();
      if (!j.error) return j;
      if (j.error.code !== "maxlag") throw new Error(j.error.info);
    }
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`gave up: ${url}`);
}

async function categoryMembers(cat) {
  const j = await api({ action: "query", list: "categorymembers", cmtitle: cat, cmnamespace: "0", cmlimit: "200" });
  return j.query.categorymembers.map((m) => m.title);
}

async function article(title) {
  const file = path.join(wikiCache, encodeURIComponent(title) + ".json");
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const j = await api({
    action: "query", prop: "extracts|revisions|pageprops", explaintext: "1", exsectionformat: "wiki",
    rvprop: "timestamp|ids", redirects: "1", titles: title,
  });
  const p = j.query.pages[0];
  const out = p.missing ? null : {
    title: p.title, pageid: p.pageid, extract: p.extract ?? "",
    revid: p.revisions?.[0]?.revid ?? null, ts: p.revisions?.[0]?.timestamp ?? null,
    disambiguation: Boolean(p.pageprops && "disambiguation" in p.pageprops),
  };
  fs.writeFileSync(file, JSON.stringify(out));
  await sleep(120);
  return out;
}

/** Wikipedia plain text, split at its own section markers, with the reference sections dropped. */
function sections(text) {
  const out = [];
  let h = "", buf = [], skip = false;
  const flush = () => {
    const body = buf.join("\n").replace(/\{\\displaystyle[^}]*\}/g, "").replace(/\n{3,}/g, "\n\n").trim();
    if (!skip && body.length > 40) out.push({ h, text: body });
    buf = [];
  };
  for (const line of text.split("\n")) {
    const m = /^(={2,6})\s*(.*?)\s*\1\s*$/.exec(line);
    if (m) {
      flush();
      const depth = m[1].length;
      if (depth === 2) skip = SKIP_SECTIONS.test(m[2]);
      h = m[2];
      continue;
    }
    buf.push(line);
  }
  flush();
  return out;
}

const seen = new Map();
let fetched = 0, kept = 0, dropped = { short: 0, disambig: 0, list: 0, missing: 0 };

for (const [shelf, def] of Object.entries(SHELVES)) {
  const titles = [...def.seeds];
  for (const c of def.categories) {
    try { titles.push(...(await categoryMembers(c))); } catch (e) { console.warn(`category ${c}: ${e.message}`); }
  }
  for (const t of titles) {
    if (seen.size >= MAX_DOCS) break;
    if (/^List of /i.test(t)) { dropped.list++; continue; }
    if (EXCLUDE.has(t) || EVENT.test(t)) { dropped.noise = (dropped.noise ?? 0) + 1; continue; }
    let a;
    try { a = await article(t); fetched++; } catch (e) { console.warn(`${t}: ${e.message}`); continue; }
    if (!a) { dropped.missing++; continue; }
    if (seen.has(a.title)) continue;
    if (a.disambiguation) { dropped.disambig++; continue; }
    const secs = sections(a.extract);
    const chars = secs.reduce((n, s) => n + s.text.length, 0);
    if (chars < MIN_CHARS) { dropped.short++; continue; }
    seen.set(a.title, {
      id: a.pageid, t: a.title, shelf, rev: a.revid, ts: a.ts?.slice(0, 10) ?? null,
      s: secs.map((x) => [x.h, x.text]),
    });
    kept++;
    if (kept % 50 === 0) console.log(`  … ${kept} articles`);
  }
}

const nomad = (f) => JSON.parse(fs.readFileSync(path.join(nomadDir, f), "utf8"));
const conditions = nomad("conditions.json");
const home = nomad("home_remedies.json");
const natural = nomad("natural_remedies.json");
const commit = fs.readFileSync(path.join(nomadDir, "COMMIT"), "utf8").trim();

const pack = {
  format: 1,
  built: new Date().toISOString().slice(0, 10),
  shelves: Object.fromEntries(Object.entries(SHELVES).map(([k, v]) => [k, v.label])),
  sources: {
    wikipedia: { name: "Wikipedia", license: "CC BY-SA 4.0", url: "https://en.wikipedia.org" },
    nomad: {
      name: "Project NOMAD collections", license: "Apache-2.0 (repository)",
      url: `https://github.com/Crosstalk-Solutions/project-nomad/tree/${commit}/collections`, commit,
    },
    home: { name: home.source.name, license: home.source.license, url: home.source.url },
    natural: { name: natural.source.name, license: natural.source.license, url: natural.source.url },
  },
  conditions: conditions.conditions.map((c) => ({ slug: c.slug, label: c.label, category: c.category, terms: c.searchTerms })),
  remedies: [
    ...home.remedies.map((r) => ({ ...r, kind: "home" })),
    ...natural.remedies.map((r) => ({ ...r, kind: "natural" })),
  ],
  docs: [...seen.values()],
};

fs.writeFileSync(path.join(root, "public/pack.json"), JSON.stringify(pack));
const bytes = fs.statSync(path.join(root, "public/pack.json")).size;
console.log(`articles ${kept} (fetched ${fetched}; dropped`, dropped, `)`);
console.log(`remedies ${pack.remedies.length}, conditions ${pack.conditions.length}`);
console.log(`pack ${(bytes / 1e6).toFixed(2)} MB`);
console.log("by shelf:", Object.fromEntries(Object.keys(SHELVES).map((k) => [k, pack.docs.filter((d) => d.shelf === k).length])));
