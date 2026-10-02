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
      "Laceration", "Abrasion (medicine)", "Puncture wound", "Stab wound", "Gunshot wound", "Amputation", "Crush injury", "Compartment syndrome", "Chest trauma", "Pneumothorax", "Flail chest", "Abdominal trauma", "Internal bleeding", "Hypovolemic shock", "Traumatic brain injury", "Skull fracture", "Rib fracture", "Hip fracture", "Wrist fracture", "Ankle fracture", "Blister", "Splinter", "Foreign body", "Corneal abrasion", "Chemical burn", "Smoke inhalation", "Cardiac arrest", "Angina", "Heart arrhythmia", "Hypertensive crisis", "Transient ischemic attack", "Status epilepticus", "Hyperglycemia", "Pulmonary embolism", "Deep vein thrombosis", "Appendicitis", "Kidney stone disease", "Ectopic pregnancy", "Airway obstruction", "Dental trauma", "Gangrene", "Necrotizing fasciitis", "Mass-casualty incident", "Simple triage and rapid treatment", "Glasgow Coma Scale", "Vital signs", "Pulse", "Blood pressure", "Respiratory rate", "Capillary refill", "Pulse oximetry", "Rule of nines", "Fluid replacement", "Sling (medicine)", "Cervical collar", "Stretcher", "Rescue breathing",
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
      "Heat syncope", "Miliaria", "Immersion foot syndromes", "Chilblains", "Photokeratitis", "Avalanche", "Decompression sickness", "High-altitude pulmonary edema", "High-altitude cerebral edema", "Wasp", "Hornet", "Fire ant", "Leech", "Bed bug", "Mosquito", "Aedes aegypti", "Anopheles", "Dog bite", "Animal bite", "Shark attack", "Crocodile attack", "Bear attack", "Indian cobra", "Bungarus caeruleus", "Russell's viper", "Echis carinatus", "King cobra", "Big four (Indian snakes)", "Antivenom", "Hottentotta tamulus", "Box jellyfish", "Portuguese man o' war", "Stingray injury",
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
      "Dengue fever", "Chikungunya", "Zika fever", "Japanese encephalitis", "Scrub typhus", "Typhus", "Tuberculosis", "COVID-19", "Hepatitis B", "Hepatitis E", "HIV/AIDS", "Meningitis", "Encephalitis", "Urinary tract infection", "Conjunctivitis", "Mumps", "Chickenpox", "Shingles", "Whooping cough", "Diphtheria", "Polio", "Impetigo", "Boil", "Abscess", "Helminthiasis", "Hookworm infection", "Ascariasis", "Giardiasis", "Amoebiasis", "Norovirus", "Rotavirus", "Antibiotic", "Antimicrobial resistance", "Paracetamol", "Ibuprofen", "Aspirin", "Hydrogen peroxide", "Povidone-iodine", "Isopropyl alcohol", "Hand sanitizer", "Surgical mask", "N95 respirator", "Quarantine", "Disinfectant", "Antimalarial medication", "Mosquito net", "Insect repellent", "DEET", "Icaridin", "Permethrin", "Nipah virus infection", "Visceral leishmaniasis", "Leprosy", "Rheumatic fever",
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
  "india": {
    label: "India",
    seeds: [
      "Emergency telephone number", "112 (emergency telephone number)", "National Disaster Management Authority (India)",
      "National Disaster Response Force", "India Meteorological Department", "Accredited Social Health Activist",
      "Primary Health Centre (India)", "Universal Immunisation Programme", "Snakebite", "Big four (Indian snakes)",
      "Dengue fever", "Leptospirosis", "Heat wave", "Monsoon of South Asia", "Floods in India",
      "North Indian Ocean tropical cyclone", "Indian numbering system", "Indian Standard Time",
    ],
    categories: [],
  },
  "children": {
    label: "Pregnancy & children",
    seeds: [
      "Pregnancy", "Prenatal care", "Breastfeeding", "Infant formula", "Neonatal jaundice", "Umbilical cord",
      "Kangaroo care", "Sudden infant death syndrome", "Colic", "Teething", "Irritant diaper dermatitis", "Croup",
      "Bronchiolitis", "Febrile seizure", "Kwashiorkor", "Marasmus", "Stunted growth", "Vitamin A deficiency",
      "Iron-deficiency anemia", "Anemia", "Iodine deficiency", "Rickets", "Postpartum depression",
      "Postpartum bleeding", "Pre-eclampsia", "Gestational diabetes", "Morning sickness", "Miscarriage",
      "Preterm birth", "Low birth weight", "Neonatal sepsis", "Child development", "Infant", "Toddler",
    ],
    categories: [],
  },
  "mind": {
    label: "Mind",
    seeds: [
      "Psychological first aid", "Panic attack", "Anxiety", "Acute stress reaction", "Post-traumatic stress disorder",
      "Grief", "Major depressive disorder", "Suicide prevention", "Self-harm", "Sleep hygiene", "Sleep deprivation",
      "Occupational burnout", "Mindfulness", "Diaphragmatic breathing", "Loneliness", "Psychological resilience",
      "Survivor guilt", "Crisis intervention", "Alcohol withdrawal syndrome", "Opioid overdose", "Naloxone",
      "Drug withdrawal", "Fight-or-flight response",
    ],
    categories: [],
  },
  "repair": {
    label: "Repair & tools",
    seeds: [
      "Duct tape", "Cable tie", "Rope", "Parachute cord", "Lashing (ropework)", "Rope splicing", "Sewing",
      "Stitch (textile arts)", "Darning", "Soldering", "Multimeter", "Screwdriver", "Pliers", "Wrench", "Hammer",
      "Saw", "Hacksaw", "Drill", "Axe", "Machete", "Knife", "Sharpening", "Sharpening stone", "Sandpaper",
      "Adhesive", "Epoxy", "Cyanoacrylate", "Plumbing", "Tap (valve)", "Flat tire", "Bicycle tire",
      "Bucket toilet", "Greywater", "Compost", "Soap", "Sanitary napkin", "Menstrual cup", "Battery recycling",
    ],
    categories: [],
  },
  "reference": {
    label: "Reference",
    seeds: [
      "Metric system", "Imperial units", "United States customary units", "Conversion of units", "Celsius",
      "Fahrenheit", "Litre", "Kilogram", "Metre", "Time zone", "Coordinated Universal Time", "Sunrise", "Sunset",
      "Twilight", "Lunar phase", "Tide", "Body mass index", "Heart rate", "Human body temperature", "Blood type",
      "Blood donation", "ABO blood group system", "Rh blood group system", "Speed of sound", "Speed of light",
    ],
    categories: [],
  },
  "water": {
    label: "Water",
    seeds: [
      "Ceramic water filter", "Biosand filter", "Slow sand filter", "Flocculation", "Aluminium sulfate", "Water storage", "Water tank", "Groundwater", "Spring (hydrology)", "Fog collection", "Desalination", "Distillation", "Arsenic contamination of groundwater", "Fluorosis", "Hand pump", "Rainwater tank", "Water pollution in India", "Water supply and sanitation in India",
      "Water purification", "Portable water purification", "Solar water disinfection", "Water chlorination",
      "Boiling", "Water filter", "Drinking water", "Waterborne diseases", "Rainwater harvesting",
      "Solar still", "Iodine", "Sodium hypochlorite", "Well", "Water scarcity",
    ],
    categories: [],
  },
  "food": {
    label: "Food",
    seeds: [
      "Rice", "Lentil", "Dal", "Chapati", "Flatbread", "Sprouting", "Pressure cooking", "Haybox", "Solar cooker", "Rocket stove", "Three-stone fire", "Kerosene stove", "Liquefied petroleum gas", "Biogas", "Food safety", "Food spoilage", "Mold", "Aflatoxin", "Food allergy", "Lactose intolerance", "Nutrition", "Food energy", "Protein (nutrient)", "Vitamin", "Hardtack", "Pemmican", "Jerky", "Ghee", "Dahi (curd)", "Yogurt", "Refrigerator", "Pot-in-pot refrigerator", "Evaporative cooler", "Powdered milk", "Milk", "Water activity", "Vacuum packing", "Dehydrated food",
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
      "Tent", "Tarpaulin", "Hammock", "Sleeping bag", "Fire safety", "Fire extinguisher", "Fire blanket", "Smoke detector", "Carbon monoxide detector", "Fire escape", "Structure fire", "Fire class", "Stop, drop and roll", "Flashover", "Backdraft", "Smoke", "Fire drill", "Match", "Lighter", "Flint", "Candle", "Oil lamp", "Kerosene lamp", "Lantern", "Flashlight", "Headlamp",
      "Emergency shelter", "Lean-to", "Debris hut", "Snow cave", "Quinzhee", "Igloo", "Bivouac shelter",
      "Space blanket", "Tarp tent", "Campfire", "Fire making", "Fire triangle", "Ferrocerium", "Bow drill",
      "Fire piston", "Tinder", "Kindling", "Fire striker", "Hand drill", "Layered clothing", "Wildfire",
    ],
    categories: [],
  },
  "navigation": {
    label: "Navigation & signals",
    seeds: [
      "Cardinal direction", "Magnetic declination", "True north", "Bearing (angle)", "Latitude", "Longitude", "Geographic coordinate system", "Global Positioning System", "Satellite navigation", "Pace count beads", "Contour line", "Scale (map)", "Sun compass", "Gnomon", "Orion (constellation)", "Big Dipper", "NATO phonetic alphabet", "Flag semaphore", "Smoke signal", "Heliograph", "Pan-pan", "Cell Broadcast", "Hiking", "Trail blazing",
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
      "Cyclone", "Urban flooding", "Mudflow", "Cloudburst", "Cold wave", "Fog", "Dust storm", "Hail", "Thunderstorm", "Aftershock", "Drop, Cover and Hold On", "Seismic retrofit", "Lahar", "Pyroclastic flow", "Chemical hazard", "Gas leak", "Dangerous goods", "Acute radiation syndrome", "Shelter in place", "Crowd collapses and crushes", "Structural collapse", "Epidemic", "Contact tracing", "Emergency kit", "Monsoon", "Monsoon of South Asia", "Climate of India", "Floods in India", "North Indian Ocean tropical cyclone", "Heat wave", "Air quality index", "Air pollution in India", "Atmospheric pressure", "Humidity", "Dew point", "Beaufort scale", "Saffir–Simpson scale", "Cumulonimbus cloud", "Thunder", "Weather lore", "Rain gauge",
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
      "Power bank", "Rechargeable battery", "Alkaline battery", "Nickel–metal hydride battery", "Battery charger", "Solar charger", "Charge controller", "Photovoltaics", "Uninterruptible power supply", "Automotive battery", "Jump start (vehicle)", "Voltage", "Electric current", "Ohm's law", "Watt", "Ampere hour", "Electrical wiring", "Fuse (electrical)", "Circuit breaker", "Residual-current device", "Ground (electricity)", "Two-way radio", "PMR446", "Shortwave radio", "AM broadcasting", "FM broadcasting", "All India Radio", "Amateur radio in India", "Text messaging", "Mobile phone signal", "Bluetooth", "LoRa",
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
const MAX_DOCS = 1400;

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
  await sleep(60);
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
      id: a.pageid, t: a.title, shelf, src: "wp", rev: a.revid, ts: a.ts?.slice(0, 10) ?? null,
      s: secs.map((x) => [x.h, x.text]),
    });
    kept++;
    if (kept % 50 === 0) console.log(`  … ${kept} articles`);
  }
}


/* ── US Army FM 21-76, Survival (1992) ────────────────────────────────────────
   Public domain (US government work). The archive.org text is clean OCR of a
   PDF reprint: lines hard-wrapped, a running header and "Page n of 233" on
   every page, and stray spaces inside contractions ("can' t"). Rebuilt here
   into chapters and sections. Its figures and tables did not survive OCR, so
   a passage that says "see Figure 6-1" has nothing to point at — the page
   says so where it shows the manual. */
const FM_URL = "https://archive.org/download/USArmyFM2176/USArmyFM2176_djvu.txt";
async function fm2176() {
  const file = path.join(root, ".cache/fm2176.txt");
  if (!fs.existsSync(file)) {
    const r = await fetch(FM_URL, { headers: { "user-agent": UA } });
    if (!r.ok) throw new Error(`FM 21-76: HTTP ${r.status}`);
    fs.writeFileSync(file, await r.text());
  }
  const lines = fs.readFileSync(file, "utf8").split("\n").map((l) => l.replace(/\s+$/, ""));
  const start = lines.findIndex((l) => /^CHAPTER 1 - INTRODUCTION$/.test(l.trim()));
  const body = lines.slice(start).filter((l) => !/^FM 21-76 US ARMY SURVIVAL MANUAL Reprinted/.test(l.trim()) && !/^Page \d+ of \d+$/.test(l.trim()));

  const title = (t) => t.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()).replace(/\b(nbc|cpr|abc|sos)\b/gi, (m) => m.toUpperCase());
  const fix = (t) => t.replace(/(\w)' (t|s|re|ve|ll|d|m)\b/g, "$1'$2").replace(/\s+([,.;:])/g, "$1").replace(/\s{2,}/g, " ").trim();

  // A heading is a whole line in capitals. It often sits directly on top of
  // its first paragraph with no blank line between, so headings are found
  // line by line, before lines are grouped into paragraphs.
  const CAPS = /^[A-Z0-9][A-Z0-9 ,&/'()\-]{2,64}$/;
  const isHeading = (l) => CAPS.test(l) && /[A-Z]{3}/.test(l) && !/^(CAUTION|WARNING|NOTE|DANGER)$/.test(l) && !/^CHAPTER \d+/.test(l);

  // Paragraphs: runs of non-empty lines. A paragraph broken by a page header
  // continues in lower case, so it is stitched back together.
  const paras = [];
  let cur = [];
  const flush = () => { if (cur.length) { paras.push(cur); cur = []; } };
  for (const raw of body) {
    const l = raw.trim();
    if (!l) { flush(); continue; }
    if (isHeading(l) || /^CHAPTER \d+ - /.test(l) || /^(CAUTION|WARNING|DANGER)$/.test(l)) { flush(); paras.push([l]); continue; }
    cur.push(l);
  }
  flush();
  const joined = [];
  for (const p of paras) {
    const text = p.reduce((acc, line) => (acc.endsWith("-") ? acc + line : acc ? acc + " " + line : line), "");
    const prev = joined[joined.length - 1];
    const single = p.length === 1;
    const heading = single && (isHeading(text) || /^CHAPTER \d+ - /.test(text));
    if (prev && !prev.heading && !heading && /^[a-z(]/.test(text) && !/[.:!?)"]$/.test(prev.text)) prev.text += " " + text;
    else joined.push({ text, lines: p.length, heading });
  }

  const docs = [];
  let doc = null, sec = null;
  for (const p of joined) {
    const ch = /^CHAPTER (\d+) - (.+)$/.exec(p.text);
    if (ch) {
      doc = { id: 900000 + Number(ch[1]), t: `Army Survival Manual · ${ch[1]}. ${title(ch[2])}`, shelf: "manual", src: "fm",
        chapter: Number(ch[1]), s: [] };
      sec = ["", ""]; doc.s.push(sec); docs.push(doc);
      continue;
    }
    if (!doc) continue;
    const t = fix(p.text);
    if (p.heading) { sec = [title(t), ""]; doc.s.push(sec); continue; }
    if (/^(CAUTION|WARNING|DANGER)$/.test(t)) { sec[1] += (sec[1] ? "\n" : "") + `${t}:`; continue; }
    sec[1] += (sec[1] && !/:$/.test(sec[1]) ? "\n" : sec[1] ? " " : "") + t;
  }
  for (const d of docs) d.s = d.s.filter(([, t]) => t.trim().length > 30).map(([h, t]) => [h, t.trim()]);
  return docs.filter((d) => d.s.length);
}

/* ── EPA: emergency disinfection of drinking water (public domain) ────────── */
const EPA_URL = "https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water";
const READY_URL = "https://www.ready.gov/kit";
async function page(url, name) {
  const file = path.join(root, `.cache/${name}.html`);
  if (!fs.existsSync(file)) {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (CACHE pack builder)" } });
    if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
    fs.writeFileSync(file, await r.text());
  }
  return fs.readFileSync(file, "utf8");
}
const unhtml = (h) => h.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, "").replace(/<br\s*\/?>/g, "\n").replace(/<\/(p|li|h\d|tr|div)>/g, "\n")
  .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "’").replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#\d+;/g, "").replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n").trim();
/* Superscripts in these tables are only ever footnote markers and "citation
   needed" tags. Left in, a footnote "[45]" loses its brackets and becomes a
   number — and the app makes numbers into tap-to-call links. */
const cells = (row) => [...row.matchAll(/<t([hd])([^>]*)>([\s\S]*?)<\/t[hd]>/g)].map((m) => ({
  text: unhtml(m[3].replace(/<style[\s\S]*?<\/style>/g, "").replace(/<sup[\s\S]*?<\/sup>/g, "")).replace(/\[\d+\]/g, "").replace(/\s+/g, " ").replace(/\s+([;,.])/g, "$1").trim(),
  span: Number((/colspan="?(\d+)/.exec(m[2]) ?? [])[1] ?? 1),
}));

async function epa() {
  const h = await page(EPA_URL, "epa");
  const main = (/<main[\s\S]*?<\/main>/.exec(h) ?? [h])[0];
  const table = [...main.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => cells(m[1]).map((c) => c.text)).filter((r) => r.length === 3);
  // Section text between headings, in reading order.
  const text = unhtml(main).split("\n").map((l) => l.trim()).filter((l) => l.length > 2);
  const secs = [];
  let sec = ["", ""];
  for (const l of text) {
    if (/^(Boiling|Disinfecting|Additional|Prepare|Disinfect|How to|Water storage|Use a|Use only)/i.test(l) && l.length < 80 && !/[.]$/.test(l)) {
      if (sec[1]) secs.push(sec);
      sec = [l, ""];
    } else sec[1] += (sec[1] ? "\n" : "") + l;
  }
  if (sec[1]) secs.push(sec);
  const keep = secs.filter(([, t]) => /boil|bleach|chlorine|disinfect|water/i.test(t) && t.length > 80).slice(0, 12);
  return {
    doc: { id: 910001, t: "EPA · Emergency disinfection of drinking water", shelf: "water", src: "epa", url: EPA_URL, s: keep },
    table,
  };
}

async function ready() {
  const h = await page(READY_URL, "ready");
  const main = (/<main[\s\S]*?<\/main>/.exec(h) ?? [h])[0];
  const i = main.toLowerCase().indexOf("basic disaster supplies kit");
  const items = [...main.slice(i).matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => unhtml(m[1]).replace(/\s+/g, " ").trim());
  const stop = items.findIndex((x) => /graphics$/i.test(x));
  const list = items.slice(0, stop > 0 ? stop : items.length).filter((x) => x.length > 3);
  const basic = list.slice(0, 14), more = list.slice(14, 30), upkeep = list.slice(30);
  return {
    doc: { id: 910002, t: "Ready.gov · Build a disaster supplies kit", shelf: "disasters", src: "ready", url: READY_URL,
      s: [["Basic disaster supplies kit", basic.join("\n")], ["Additional emergency supplies", more.join("\n")], ["Maintaining your kit", upkeep.join("\n")]] },
    kit: { basic, more, upkeep },
  };
}

/* ── Emergency numbers, every country Wikipedia lists ────────────────────── */
async function emergencyNumbers() {
  const file = path.join(root, ".cache/emergency-numbers.json");
  if (!fs.existsSync(file)) {
    const j = await api({ action: "parse", page: "List of emergency telephone numbers", prop: "text|revid" });
    fs.writeFileSync(file, JSON.stringify({ html: j.parse.text, rev: j.parse.revid }));
  }
  const { html, rev } = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = [];
  for (const t of html.matchAll(/<table class="wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/g)) {
    const trs = [...t[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => cells(m[1]));
    const head = trs[0]?.map((c) => c.text.toLowerCase()) ?? [];
    if (!head[0]?.startsWith("country")) continue;
    for (const r of trs.slice(1)) {
      // Expand colspans: "112" spanning police, ambulance and fire is one number for all three.
      const flat = r.flatMap((c) => Array(c.span).fill(c.text));
      if (!flat[0]) continue;
      rows.push({ country: flat[0], police: flat[1] ?? "", ambulance: flat[2] ?? "", fire: flat[3] ?? "", other: flat[4] ?? "" });
    }
  }
  return { rev, rows };
}

const nomad = (f) => JSON.parse(fs.readFileSync(path.join(nomadDir, f), "utf8"));
const conditions = nomad("conditions.json");
const home = nomad("home_remedies.json");
const natural = nomad("natural_remedies.json");
const commit = fs.readFileSync(path.join(nomadDir, "COMMIT"), "utf8").trim();

const manual = await fm2176();
const epaData = await epa();
const readyData = await ready();
const numbers = await emergencyNumbers();

const pack = {
  format: 2,
  built: new Date().toISOString().slice(0, 10),
  shelves: { ...Object.fromEntries(Object.entries(SHELVES).map(([k, v]) => [k, v.label])), manual: "Army Survival Manual" },
  sources: {
    wikipedia: { name: "Wikipedia", license: "CC BY-SA 4.0", url: "https://en.wikipedia.org" },
    nomad: {
      name: "Project NOMAD collections", license: "Apache-2.0 (repository)",
      url: `https://github.com/Crosstalk-Solutions/project-nomad/tree/${commit}/collections`, commit,
    },
    home: { name: home.source.name, license: home.source.license, url: home.source.url },
    natural: { name: natural.source.name, license: natural.source.license, url: natural.source.url },
    fm: { name: "US Army Field Manual FM 21-76, Survival (1992)", license: "Public domain (US government work)", url: "https://archive.org/details/USArmyFM2176" },
    epa: { name: "US EPA, Emergency Disinfection of Drinking Water", license: "Public domain (US government work)", url: EPA_URL },
    ready: { name: "Ready.gov (FEMA), Build a Kit", license: "Public domain (US government work)", url: READY_URL },
    numbers: { name: "Wikipedia, List of emergency telephone numbers", license: "CC BY-SA 4.0",
      url: `https://en.wikipedia.org/w/index.php?title=List_of_emergency_telephone_numbers&oldid=${numbers.rev}` },
  },
  data: { bleach: epaData.table, kit: readyData.kit, numbers: numbers.rows, numbersRev: numbers.rev },
  conditions: conditions.conditions.map((c) => ({ slug: c.slug, label: c.label, category: c.category, terms: c.searchTerms })),
  remedies: [
    ...home.remedies.map((r) => ({ ...r, kind: "home" })),
    ...natural.remedies.map((r) => ({ ...r, kind: "natural" })),
  ],
  docs: [...seen.values(), ...manual, epaData.doc, readyData.doc],
};

fs.writeFileSync(path.join(root, "public/pack.json"), JSON.stringify(pack));
const bytes = fs.statSync(path.join(root, "public/pack.json")).size;
console.log(`articles ${kept} (fetched ${fetched}; dropped`, dropped, `)`);
console.log(`remedies ${pack.remedies.length}, conditions ${pack.conditions.length}`);
console.log(`manual: ${manual.length} chapters, ${manual.reduce((n, d) => n + d.s.length, 0)} sections, ${manual.reduce((n, d) => n + d.s.reduce((m, x) => m + x[1].length, 0), 0)} chars`);
console.log(`EPA table rows ${epaData.table.length}, sections ${epaData.doc.s.length}; kit ${readyData.kit.basic.length}+${readyData.kit.more.length}; numbers ${numbers.rows.length} countries`);
console.log(`pack ${(bytes / 1e6).toFixed(2)} MB`);
console.log("by shelf:", Object.fromEntries(Object.keys(pack.shelves).map((k) => [k, pack.docs.filter((d) => d.shelf === k).length])));
