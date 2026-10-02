# CACHE

**A survival library that copies itself.**

Open it once and it works in airplane mode. Press one button and the whole library — every article,
the search, and that same button — becomes **one HTML file** you can AirDrop, Bluetooth, or carry on a
USB stick to someone with no internet. It opens in any browser, and it can make copies of itself.

**Live:** (deploying)

---

## Why

[Project NOMAD](https://github.com/Crosstalk-Solutions/project-nomad) (Apache-2.0, ~39k stars) is
an offline knowledge server: Wikipedia, medical references and local AI on a Debian box running
Docker. People clearly want it. Its most-discussed issues are also almost all the same thing — the
install failing:

- “Fresh Install: Ollama will not install” (37 comments), “Ollama docker will not function” (26),
  “AI install failing” (18), “ERR_CONNECTION_REFUSED” (16), containers that never become healthy
- “Wikipedia Indexing for over 3 weeks”
- macOS / ARM support, and the chat layout breaking on phones

And two of its feature requests are exactly what a phone-sized tool can do well:

- **“Keyword search over knowledge base documents without AI”** (open)
- **“Surface source document + date as citations under AI chat answers”**

CACHE is the other end of the same idea. No server, no Docker, no GPU, no install — and a way to pass
it on after the network is gone, which a server cannot do.

## What it carries

- **317 Wikipedia articles** on first aid, heat and cold, bites, illness and hygiene, water, food,
  shelter and fire, navigation and signals, disasters and weather, radio and power — plus one article
  for each of NOMAD's 36 everyday conditions. **Every passage is cited to the exact revision** it was
  taken from (title, revision id, date).
- **38 remedy cards** from NOMAD's own collections — CDC, NIH, MedlinePlus, FDA and NCCIH guidance,
  US government public domain — each with its caution line.
- **NOMAD's condition vocabulary** as the synonym map: “period pain” is read as menstrual cramps,
  “stuffy nose” as nasal congestion.

About 6.9 MB, 2.4 MB compressed.

## Search without AI

BM25 over 10,000 passages with Porter stemming, built in the browser in well under a second and
answered in about 20 ms. Adjacent words are also tried joined (“snake bite” finds *Snakebite*),
unknown words fall back to prefixes, and passages under Treatment / First aid / Management get a
modest lift.

One bug is worth recording because it would have been dangerous: matching NOMAD's conditions word by
word made “bite” a synonym of “insect” and “sting”, so **a snakebite was served insect-bite home
remedies**. Conditions now apply only when a whole phrase is asked. A test pins it.

## How a copy copies

A CACHE file is four parts: stylesheet, program, library, and a small record of its generation. The
button reads those back out of its own page and writes them into a new file one generation later.
Nothing is fetched. **The website is generation 0 of that same file** — the tests check that a copy
differs from the site only in its generation record, and that library, program and style are
byte-identical through two generations.

Inlining 7 MB of arbitrary article text into a `<script>` needs care. Every `<` in the library is
escaped, so no article can close the tag early; and `assemble()` refuses a program containing a
comment opener, which would switch the HTML parser into a state where `</script>` stops working —
a guard that, written naively, contained the very four characters it checks for.

Checked in a real browser: the site reloads and searches with its server **killed**; the copy
button's exact output, opened on a separate origin, makes **one** network request (itself), searches,
and produces generation 2.

## What this is not

A reference library, not a medic. **If someone may be dying, call your local emergency number
first.** It is English-only, keyword search rather than an AI, and a few hundred articles rather than
all of Wikipedia. It does not read Kiwix ZIM files; NOMAD is still the right tool for a 250 GB shelf.

## Build

```bash
npm install
npm run pack    # fetch Wikipedia articles (revision-pinned) + NOMAD collections → public/pack.json
npm run build   # → dist/index.html (generation 0), sw.js, manifest
npm test        # 133 assertions
```

## Licences

Code: MIT. Article text: Wikipedia, **CC BY-SA 4.0** — `public/pack.json` and every copy are shared
under the same licence, with per-article attribution. Remedy cards and condition vocabulary:
[Project NOMAD collections](https://github.com/Crosstalk-Solutions/project-nomad/tree/main/collections)
(Apache-2.0 repository; remedy text is US government public domain), pinned to the commit in
`.cache/nomad/COMMIT`. Copies keep these notices.
