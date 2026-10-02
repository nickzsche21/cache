/**
 * Search that needs no AI, no server and no index file.
 *
 * Project NOMAD's open feature request is "keyword search over knowledge base
 * documents without AI", and its most-discussed bug reports are AI installs
 * that never finish — one user's Wikipedia indexing ran for three weeks. This
 * is the other route: BM25 over passages, built in the browser in well under a
 * second, with NOMAD's own condition vocabulary as the synonym map so that
 * "period pain" finds menstrual cramps.
 *
 * Deliberately dependency-free: the same module is bundled into the app and
 * into the single-file copy that the app exports, which has to run from a USB
 * stick with nothing else around it.
 */

/* ── the pack ─────────────────────────────────────────────────────────────── */

export type Doc = { id: number; t: string; shelf: string; rev: number | null; ts: string | null; s: [string, string][] };
export type Remedy = {
  slug: string; name: string; commonNames: string[]; conditions: string[];
  uses: string; how: string; evidence: string; cautions: string; sourceUrl: string; kind: "home" | "natural";
};
export type Condition = { slug: string; label: string; category: string; terms: string[] };
export type Pack = {
  format: number; built: string;
  shelves: Record<string, string>;
  sources: Record<string, { name: string; license: string; url: string; commit?: string }>;
  conditions: Condition[]; remedies: Remedy[]; docs: Doc[];
};

/* ── words ────────────────────────────────────────────────────────────────── */

const STOP = new Set(
  ("a about above after again against all am an and any are as at be because been before being below between both but by " +
    "can could did do does doing down during each few for from further had has have having he her here hers herself him " +
    "himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other " +
    "our ours ourselves out over own same she should so some such than that the their theirs them themselves then there " +
    "these they this those through to too under until up very was we were what when where which while who whom why will " +
    "with would you your yours yourself yourselves also get got gets getting someone somebody something thing things " +
    "help please need needs want really without within")
    .split(" ")
);

const isCons = (w: string, i: number): boolean => {
  const c = w[i];
  if ("aeiou".includes(c)) return false;
  if (c === "y") return i === 0 ? true : !isCons(w, i - 1);
  return true;
};
/** Porter's m: the number of vowel–consonant sequences in a stem. */
const measure = (w: string) => {
  let n = 0, i = 0;
  const len = w.length;
  while (i < len && isCons(w, i)) i++;
  while (i < len) {
    while (i < len && !isCons(w, i)) i++;
    if (i >= len) break;
    while (i < len && isCons(w, i)) i++;
    n++;
  }
  return n;
};
const hasVowel = (w: string) => { for (let i = 0; i < w.length; i++) if (!isCons(w, i)) return true; return false; };
const doubleC = (w: string) => w.length > 1 && w[w.length - 1] === w[w.length - 2] && isCons(w, w.length - 1);
const cvc = (w: string) => {
  const n = w.length;
  if (n < 3) return false;
  if (!isCons(w, n - 1) || isCons(w, n - 2) || !isCons(w, n - 3)) return false;
  return !"wxy".includes(w[n - 1]);
};

function rule(w: string, pairs: [string, string][], cond: (stem: string) => boolean): string | null {
  for (const [suf, rep] of pairs) {
    if (w.endsWith(suf)) {
      const stem = w.slice(0, -suf.length);
      return cond(stem) ? stem + rep : w;
    }
  }
  return null;
}

/** Martin Porter's 1980 stemmer, the original algorithm. */
export function stem(word: string): string {
  let w = word;
  if (w.length <= 2) return w;

  // 1a
  if (w.endsWith("sses")) w = w.slice(0, -2);
  else if (w.endsWith("ies")) w = w.slice(0, -2);
  else if (w.endsWith("ss")) { /* keep */ }
  else if (w.endsWith("s")) w = w.slice(0, -1);

  // 1b
  let extra = false;
  if (w.endsWith("eed")) { if (measure(w.slice(0, -3)) > 0) w = w.slice(0, -1); }
  else if (w.endsWith("ed") && hasVowel(w.slice(0, -2))) { w = w.slice(0, -2); extra = true; }
  else if (w.endsWith("ing") && hasVowel(w.slice(0, -3))) { w = w.slice(0, -3); extra = true; }
  if (extra) {
    if (w.endsWith("at") || w.endsWith("bl") || w.endsWith("iz")) w += "e";
    else if (doubleC(w) && !"lsz".includes(w[w.length - 1])) w = w.slice(0, -1);
    else if (measure(w) === 1 && cvc(w)) w += "e";
  }

  // 1c
  if (w.endsWith("y") && hasVowel(w.slice(0, -1))) w = w.slice(0, -1) + "i";

  // 2
  const s2 = rule(w, [
    ["ational", "ate"], ["tional", "tion"], ["enci", "ence"], ["anci", "ance"], ["izer", "ize"], ["bli", "ble"],
    ["alli", "al"], ["entli", "ent"], ["eli", "e"], ["ousli", "ous"], ["ization", "ize"], ["ation", "ate"],
    ["ator", "ate"], ["alism", "al"], ["iveness", "ive"], ["fulness", "ful"], ["ousness", "ous"], ["aliti", "al"],
    ["iviti", "ive"], ["biliti", "ble"], ["logi", "log"],
  ], (st) => measure(st) > 0);
  if (s2) w = s2;

  // 3
  const s3 = rule(w, [
    ["icate", "ic"], ["ative", ""], ["alize", "al"], ["iciti", "ic"], ["ical", "ic"], ["ful", ""], ["ness", ""],
  ], (st) => measure(st) > 0);
  if (s3) w = s3;

  // 4
  for (const suf of ["al", "ance", "ence", "er", "ic", "able", "ible", "ant", "ement", "ment", "ent", "ion", "ou",
    "ism", "ate", "iti", "ous", "ive", "ize"]) {
    if (w.endsWith(suf)) {
      const st = w.slice(0, -suf.length);
      if (measure(st) > 1 && (suf !== "ion" || /[st]$/.test(st))) w = st;
      break;
    }
  }

  // 5a
  if (w.endsWith("e")) {
    const st = w.slice(0, -1), m = measure(st);
    if (m > 1 || (m === 1 && !cvc(st))) w = st;
  }
  // 5b
  if (measure(w) > 1 && doubleC(w) && w.endsWith("l")) w = w.slice(0, -1);
  return w;
}

const fold = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

export type Token = { term: string; start: number; end: number };

/** Words with their offsets, so a match can be highlighted where it actually is. */
export function tokens(text: string, keepStop = false): Token[] {
  const out: Token[] = [];
  const f = fold(text);
  const re = /[a-z0-9]+(?:'[a-z]+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(f))) {
    const raw = m[0].replace(/'s$/, "").replace(/'/g, "");
    if (!raw || (!keepStop && STOP.has(raw))) continue;
    out.push({ term: stem(raw), start: m.index, end: m.index + m[0].length });
  }
  return out;
}
export const terms = (text: string) => tokens(text).map((t) => t.term);

/** The query's own words before stemming, so neighbours can be tried joined. */
const rawWords = (text: string) =>
  (fold(text).match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? [])
    .map((w) => w.replace(/'s$/, "").replace(/'/g, ""))
    .filter((w) => w && !STOP.has(w));

/* ── passages ─────────────────────────────────────────────────────────────── */

export type Chunk = { doc: number; sec: number; heading: string; text: string };

/** Sections cut into passages of a readable size, on paragraph boundaries where possible. */
export function chunk(pack: Pack, target = 650): Chunk[] {
  const out: Chunk[] = [];
  pack.docs.forEach((d, di) => {
    d.s.forEach(([h, text], si) => {
      let buf = "";
      const push = () => { if (buf.trim()) out.push({ doc: di, sec: si, heading: h, text: buf.trim() }); buf = ""; };
      for (const para of text.split(/\n+/)) {
        if (buf && buf.length + para.length > target * 1.4) push();
        if (para.length > target * 1.6) {
          // A very long paragraph is split on sentences instead.
          for (const sent of para.split(/(?<=[.!?])\s+/)) {
            if (buf && buf.length + sent.length > target) push();
            buf += (buf ? " " : "") + sent;
          }
        } else buf += (buf ? "\n" : "") + para;
        if (buf.length >= target) push();
      }
      push();
    });
  });
  return out;
}

/* ── the index ────────────────────────────────────────────────────────────── */

export type Index = {
  pack: Pack;
  chunks: Chunk[];
  post: Map<string, number[]>; // term → [chunk, tf, chunk, tf, …]
  len: Float32Array;
  avg: number;
  titleTerms: Set<string>[]; // per doc
  vocab: string[];
  /** NOMAD's condition phrases, stemmed: a condition applies only when a whole phrase is asked. */
  phrases: { slug: string; stems: string[] }[];
};

export function build(pack: Pack): Index {
  const chunks = chunk(pack);
  const post = new Map<string, number[]>();
  const len = new Float32Array(chunks.length);
  let total = 0;

  chunks.forEach((c, i) => {
    const d = pack.docs[c.doc];
    // Title and heading words count in the passage too: a paragraph under
    // "Snakebite › Treatment" is about snakebite whether or not it says so.
    const words = [...terms(d.t), ...terms(c.heading), ...terms(c.text)];
    len[i] = words.length;
    total += words.length;
    const tf = new Map<string, number>();
    for (const w of words) tf.set(w, (tf.get(w) ?? 0) + 1);
    for (const [w, n] of tf) {
      let p = post.get(w);
      if (!p) post.set(w, (p = []));
      p.push(i, n);
    }
  });

  /* NOMAD's conditions, kept as whole phrases. Matching them word by word
     was wrong in a way that matters: "bite" belongs to "insect bites", so a
     snakebite pulled in insect-bite home remedies. A condition now applies
     only when every word of one of its phrases is in the question. */
  const phrases: Index["phrases"] = [];
  for (const c of pack.conditions) {
    for (const t of [c.label, ...c.terms]) {
      const st = terms(t);
      if (st.length) phrases.push({ slug: c.slug, stems: st });
    }
  }

  return {
    pack, chunks, post, len, avg: total / Math.max(1, chunks.length),
    titleTerms: pack.docs.map((d) => new Set(terms(d.t))),
    vocab: [...post.keys()].sort(),
    phrases,
  };
}

/* ── querying ─────────────────────────────────────────────────────────────── */

export type Hit = {
  chunk: number;
  score: number;
  /** Passage text with the matched words marked, as [start, end) offsets. */
  marks: [number, number][];
  snippet: { text: string; marks: [number, number][]; cut: [boolean, boolean] };
};
export type Result = { doc: Doc; docIndex: number; score: number; hits: Hit[] };
export type Answer = { results: Result[]; remedies: Remedy[]; expanded: string[]; conditions: Condition[] };

const K1 = 1.2, B = 0.75;

/* Section headings carry meaning. In a library people open when something is
   going wrong, a passage under "Treatment" or "First aid" is worth more than
   an equally wordy one under "History" — so it gets a modest lift. This only
   reorders passages; it cannot make an unrelated article rank. */
const ACTIONABLE = /\b(treatment|first aid|management|emergency|what to do|prehospital|therapy|signs and symptoms|symptoms)\b/i;

function prefixes(ix: Index, t: string, max = 6): string[] {
  if (t.length < 4) return [];
  // Binary search into the sorted vocabulary for words that start with t.
  let lo = 0, hi = ix.vocab.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (ix.vocab[mid] < t) lo = mid + 1; else hi = mid; }
  const out: string[] = [];
  for (let i = lo; i < ix.vocab.length && out.length < max && ix.vocab[i].startsWith(t); i++) {
    if (ix.vocab[i] !== t) out.push(ix.vocab[i]);
  }
  return out;
}

export function search(ix: Index, query: string, limit = 8): Answer {
  const raw = rawWords(query);
  const q = raw.map(stem);
  const weights = new Map<string, number>();
  const add = (t: string, w: number) => weights.set(t, Math.max(weights.get(t) ?? 0, w));
  const expanded: string[] = [];

  /* Each word of the question is a unit that can be satisfied by any of its
     alternatives: itself, a joined form with a neighbour, or — for a stem the
     library has never seen — words that begin with it. */
  const units: Set<string>[] = q.map((t) => new Set([t]));
  q.forEach((t, i) => {
    add(t, 1);
    if (!ix.post.has(t)) for (const p of prefixes(ix, t)) { add(p, 0.75); units[i].add(p); expanded.push(p); }
  });
  // "snake bite" is also "snakebite"; "sun burn" is also "sunburn".
  for (let i = 0; i + 1 < raw.length; i++) {
    const j = stem(raw[i] + raw[i + 1]);
    if (ix.post.has(j)) { add(j, 1); units[i].add(j); units[i + 1].add(j); expanded.push(j); }
  }

  const asked = new Set(q);
  const slugs = new Set<string>();
  for (const ph of ix.phrases) if (ph.stems.every((w) => asked.has(w))) slugs.add(ph.slug);
  // A recognised condition lends its other phrases as weaker search terms.
  for (const ph of ix.phrases) {
    if (!slugs.has(ph.slug)) continue;
    for (const w of ph.stems) if (!asked.has(w)) { add(w, 0.55); expanded.push(w); }
  }

  const N = ix.chunks.length;
  const scores = new Map<number, number>();
  const matched = new Map<number, Set<string>>();
  for (const [t, w] of weights) {
    const p = ix.post.get(t);
    if (!p) continue;
    const df = p.length / 2;
    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    for (let i = 0; i < p.length; i += 2) {
      const c = p[i], tf = p[i + 1];
      const s = w * idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * ix.len[c]) / ix.avg)));
      scores.set(c, (scores.get(c) ?? 0) + s);
      let m = matched.get(c);
      if (!m) matched.set(c, (m = new Set()));
      m.add(t);
    }
  }

  // Reward passages that answer more of the question, and articles whose
  // title is the question: "snake bite" should open on Snakebite.
  for (const [c, s] of scores) {
    const m = matched.get(c)!;
    const covered = units.filter((u) => [...u].some((t) => m.has(t))).length;
    const coverage = units.length ? covered / units.length : 0;
    const title = ix.titleTerms[ix.chunks[c].doc];
    const inTitle = units.filter((u) => [...u].some((t) => title.has(t))).length;
    const act = ACTIONABLE.test(ix.chunks[c].heading) ? 1.3 : 1;
    scores.set(c, s * act * (0.6 + 0.8 * coverage) * (1 + (0.6 * inTitle) / Math.max(1, units.length)));
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 120);
  const byDoc = new Map<number, Result>();
  for (const [c, score] of ranked) {
    const di = ix.chunks[c].doc;
    let r = byDoc.get(di);
    if (!r) byDoc.set(di, (r = { doc: ix.pack.docs[di], docIndex: di, score: 0, hits: [] }));
    if (r.hits.length >= 2) continue;
    r.hits.push(hitFor(ix, c, score, new Set(weights.keys())));
    r.score = Math.max(r.score, score);
  }
  const results = [...byDoc.values()].sort((a, b) => b.score - a.score).slice(0, limit);

  const conditions = ix.pack.conditions.filter((c) => slugs.has(c.slug));
  const remedies = ix.pack.remedies.filter((r) => r.conditions.some((c) => slugs.has(c)));
  return { results, remedies, expanded: [...new Set(expanded)], conditions };
}

function hitFor(ix: Index, c: number, score: number, wanted: Set<string>): Hit {
  const text = ix.chunks[c].text;
  const marks: [number, number][] = tokens(text).filter((t) => wanted.has(t.term)).map((t) => [t.start, t.end]);
  return { chunk: c, score, marks, snippet: snippet(text, marks) };
}

/** The densest window of matches, about two hundred and eighty characters wide. */
export function snippet(text: string, marks: [number, number][], width = 280): Hit["snippet"] {
  if (text.length <= width) return { text, marks, cut: [false, false] };
  let best = 0, bestCount = -1;
  for (let i = 0; i < marks.length; i++) {
    const start = Math.max(0, marks[i][0] - 40);
    const count = marks.filter((m) => m[0] >= start && m[1] <= start + width).length;
    if (count > bestCount) { bestCount = count; best = start; }
  }
  // Start on a word boundary, and end on one.
  let start = best;
  while (start > 0 && /\S/.test(text[start - 1])) start--;
  let end = Math.min(text.length, start + width);
  while (end < text.length && /\S/.test(text[end])) end++;
  return {
    text: text.slice(start, end),
    marks: marks.filter((m) => m[0] >= start && m[1] <= end).map(([a, b]) => [a - start, b - start] as [number, number]),
    cut: [start > 0, end < text.length],
  };
}

/** A permanent link to the exact revision a passage came from. */
export const citeUrl = (d: Doc) =>
  d.rev ? `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(d.t.replace(/ /g, "_"))}&oldid=${d.rev}`
    : `https://en.wikipedia.org/wiki/${encodeURIComponent(d.t.replace(/ /g, "_"))}`;
