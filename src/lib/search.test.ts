import fs from "node:fs";
import path from "node:path";
import { stem, terms, build, search, snippet, chunk, citeUrl, type Pack } from "./search";

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean) => { if (c) pass++; else fails.push(n); };
const eq = (n: string, a: unknown, b: unknown) => ok(`${n} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`, a === b);

/* ── Porter's own published examples ────────────────────────────────────── */
const PORTER: [string, string][] = [
  ["caresses", "caress"], ["ponies", "poni"], ["ties", "ti"], ["cats", "cat"], ["feed", "feed"], ["agreed", "agre"],
  ["plastered", "plaster"], ["bled", "bled"], ["motoring", "motor"], ["sing", "sing"], ["conflated", "conflat"],
  ["troubled", "troubl"], ["sized", "size"], ["hopping", "hop"], ["tanned", "tan"], ["falling", "fall"],
  ["hissing", "hiss"], ["fizzed", "fizz"], ["failing", "fail"], ["filing", "file"], ["happy", "happi"], ["sky", "sky"],
  ["relational", "relat"], ["conditional", "condit"], ["rational", "ration"], ["digitizer", "digit"],
  ["operator", "oper"], ["feudalism", "feudal"], ["decisiveness", "decis"], ["hopefulness", "hope"],
  ["callousness", "callous"], ["formaliti", "formal"], ["sensitiviti", "sensit"], ["sensibiliti", "sensibl"],
  ["triplicate", "triplic"], ["formative", "form"], ["formalize", "formal"], ["electrical", "electr"],
  ["hopeful", "hope"], ["goodness", "good"], ["revival", "reviv"], ["allowance", "allow"], ["inference", "infer"],
  ["airliner", "airlin"], ["adjustable", "adjust"], ["defensible", "defens"], ["irritant", "irrit"],
  ["replacement", "replac"], ["adjustment", "adjust"], ["dependent", "depend"], ["adoption", "adopt"],
  ["communism", "commun"], ["activate", "activ"], ["effective", "effect"], ["bowdlerize", "bowdler"],
  ["probate", "probat"], ["rate", "rate"], ["cease", "ceas"], ["controll", "control"], ["roll", "roll"],
];
for (const [w, s] of PORTER) eq(`stem ${w}`, stem(w), s);
ok("bleeding and bleed meet", stem("bleeding") === stem("bleed"));
ok("burns and burn meet", stem("burns") === stem("burn"));
ok("question words are dropped", terms("how do I stop the bleeding").join(" ") === "stop bleed");

/* ── the real pack ──────────────────────────────────────────────────────── */
const pack = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../public/pack.json"), "utf8")) as Pack;
const t0 = performance.now();
const ix = build(pack);
const ms = performance.now() - t0;
ok(`the index builds fast enough to do on a phone (${ms.toFixed(0)} ms here)`, ms < 4000);
ok(`thousands of passages (${ix.chunks.length})`, ix.chunks.length > 4000);
ok("every passage is readable length", ix.chunks.every((c) => c.text.length > 0 && c.text.length < 2400));

/* ── it answers the questions people ask when things go wrong ───────────── */
const top = (q: string, n = 3) => search(ix, q).results.slice(0, n).map((r) => r.doc.t);
const expect = (q: string, wanted: string[], n = 3) => {
  const got = top(q, n);
  ok(`"${q}" → one of ${JSON.stringify(wanted)} in the top ${n} (got ${JSON.stringify(got)})`, got.some((t) => wanted.includes(t)));
};
expect("snake bite", ["Snakebite"], 1);
expect("how do I purify water", ["Water purification", "Portable water purification"]);
expect("someone is choking", ["Choking", "Abdominal thrusts", "Heimlich maneuver"]);
expect("cpr", ["Cardiopulmonary resuscitation"], 1);
expect("stop heavy bleeding", ["Bleeding", "Tourniquet", "Pressure bandage", "Emergency bleeding control", "Emergency tourniquet"]);
expect("hypothermia", ["Hypothermia"], 1);
expect("frostbite on fingers", ["Frostbite"], 2);
expect("heat stroke", ["Heat stroke", "Hyperthermia"]);
expect("diarrhea dehydration child", ["Oral rehydration therapy", "Diarrhea", "Dehydration"]);
expect("earthquake", ["Earthquake", "Earthquake preparedness"]);
expect("morse code sos", ["Morse code", "SOS"]);
expect("tie a bowline", ["Bowline"], 1);
expect("carbon monoxide generator", ["Carbon monoxide poisoning", "Engine–generator"]);
expect("start a fire without matches", ["Fire making", "Bow drill", "Ferrocerium", "Fire piston", "Hand drill", "Fire striker"], 5);
expect("find north without a compass", ["Natural navigation", "Polaris", "Celestial navigation", "Orienteering"], 5);

/* ── NOMAD's vocabulary does the work a model would ─────────────────────── */
{
  const a = search(ix, "period pain");
  ok(`"period pain" is recognised as menstrual cramps (got ${a.conditions.map((c) => c.slug)})`, a.conditions.some((c) => c.slug === "menstrual-cramps"));
  ok(`and brings back remedy cards (${a.remedies.length})`, a.remedies.length > 0);
  ok(`and an article about it, not noise (got ${a.results.slice(0, 2).map((r) => r.doc.t)})`, a.results.slice(0, 2).some((r) => r.doc.t === "Dysmenorrhea"));
  const b = search(ix, "stuffy nose");
  ok(`"stuffy nose" → nasal congestion (got ${b.conditions.map((c) => c.slug)})`, b.conditions.some((c) => c.slug === "nasal-congestion"));
  ok("an unrelated question brings no remedies", search(ix, "tie a bowline").remedies.length === 0);
  // The regression that matters: word-level synonyms once turned a snakebite
  // into an insect bite and offered insect-bite home remedies for it.
  const sb = search(ix, "snake bite");
  ok(`a snakebite is not an insect bite (conditions: ${sb.conditions.map((c) => c.slug)})`, sb.conditions.length === 0);
  ok("so it offers no insect-bite remedies", sb.remedies.length === 0);
  ok(`but a bee sting is (${search(ix, "bee sting").conditions.map((c) => c.slug)})`, search(ix, "bee sting").conditions.some((c) => c.slug === "insect-bites-stings"));
}

/* ── words the library never saw ────────────────────────────────────────── */
{
  const a = search(ix, "purify");
  ok(`an unseen stem falls back to prefixes (expanded ${a.expanded.length})`, a.results.length > 0);
  ok("nonsense returns nothing rather than something", search(ix, "zzqxv wqpzl").results.length === 0);
  ok("an empty question returns nothing", search(ix, "   ").results.length === 0);
  ok("a question made of stopwords returns nothing", search(ix, "how do I").results.length === 0);
}

/* ── what it shows ──────────────────────────────────────────────────────── */
{
  const r = search(ix, "snake bite").results[0];
  ok(`a snakebite opens on what to do about it (first passage under "${ix.chunks[r.hits[0].chunk].heading}")`,
    /treatment|first aid|management|symptom/i.test(ix.chunks[r.hits[0].chunk].heading));
  ok("each result carries at most two passages", search(ix, "water").results.every((x) => x.hits.length <= 2));
  const h = r.hits[0];
  ok("snippets are short", h.snippet.text.length <= 340);
  ok("and marked where the words are", h.snippet.marks.length > 0);
  ok("every mark lands on a matching word", h.snippet.marks.every(([a, b]) => /snake|bite|bitten/i.test(h.snippet.text.slice(a, b))));
  ok("citations pin the revision", /oldid=\d+$/.test(citeUrl(r.doc)));
  ok("and carry a date", /^\d{4}-\d{2}-\d{2}$/.test(r.doc.ts ?? ""));
  const s = snippet("a ".repeat(400) + "target " + "b ".repeat(400), [[800, 806]]);
  ok("a snippet centres on the match", s.text.includes("target") && s.cut[0] && s.cut[1]);
}

/* ── the pack ───────────────────────────────────────────────────────────── */
ok(`NOMAD's remedies are aboard (${pack.remedies.length})`, pack.remedies.length === 38);
ok(`every NOMAD condition has reading to go with it (${pack.docs.filter((d) => d.shelf === "everyday").length})`, pack.docs.filter((d) => d.shelf === "everyday").length >= 30);
ok("every remedy cites its source", pack.remedies.every((r) => /^https?:\/\//.test(r.sourceUrl)));
ok("every remedy says what to watch for", pack.remedies.every((r) => r.cautions.length > 10));
ok("NOMAD's collections are pinned to a commit", /^[0-9a-f]{40}$/.test(pack.sources.nomad.commit ?? ""));
ok("chunking keeps every section", chunk(pack).length >= pack.docs.reduce((n, d) => n + d.s.length, 0));

console.log(fails.length ? `✗ ${fails.length} failed of ${pass + fails.length}` : `✓ ${pass} assertions pass`);
for (const f of fails) console.log("  ✗", f);
process.exit(fails.length ? 1 : 0);
