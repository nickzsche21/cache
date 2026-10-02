# CACHE

**A survival library that copies itself — and a toolkit that works with the network down.**

Open it once and it works in airplane mode. Press one button and everything — the library, the
search, every tool, and that same button — becomes **one HTML file** you can AirDrop, Bluetooth or
carry on a USB stick to someone with no internet. It opens in any browser, and it can make copies
of itself.

**Live:** https://cache-orcin-gamma.vercel.app

---

## What is inside

**Library — 774 documents, about 28,500 passages**

- **749 Wikipedia articles** across 15 shelves: first aid, heat, cold and bites (including India's
  “big four” snakes), illness (dengue, chikungunya, leptospirosis, typhoid, malaria…), everyday
  ailments, **India**, **pregnancy & children**, **mind**, water, food (pot-in-pot refrigerators,
  haybox cooking, food safety), shelter & fire, navigation & signals, disasters & weather (monsoon,
  cyclones, floods, heat waves), radio & power, **repair & tools**, and reference. Every passage is
  cited to the exact revision it was taken from.
- **The US Army Survival Manual, FM 21-76 (1992), complete** — 23 chapters: psychology, medicine,
  shelters, water, fire, food, plants, dangerous animals, direction finding, signalling, desert,
  tropical, cold and sea survival. Public domain. Its figures and tables did not survive
  digitisation, and some of its medicine is dated; the page says so wherever it shows it.
- **EPA** emergency water disinfection and **Ready.gov**'s disaster kit, quoted verbatim.
- **38 remedy cards** and the condition vocabulary from **Project NOMAD** (CDC/NIH/NCCIH guidance).
- **Emergency numbers for 252 countries**, India first.

**Tools — all offline, all checked against their sources**

| | |
| --- | --- |
| **SOS light** | Flashes SOS or any message in Morse with the screen; sound and vibration. Capped at ~2 flashes a second, under the 3 Hz photosensitivity threshold. |
| **Flashlight** | Full-screen white, or red to keep night vision. Keeps the screen on. |
| **CPR beat** | 110 a minute (inside the 100–120 the CPR article gives), hands-only or 30 : 2. |
| **Compass & way back** | GPS position (GPS needs no internet), compass, saved places with distance and an arrow back, and **text my location over SMS** — which travels on the phone network when data is down. |
| **Sun & moon** | First light, sunrise, sunset, last light, daylight left, moon phase and rise/set — and **north from the Sun**. |
| **Make water safe** | Bleach drops for any volume and any strength on the label, from the EPA's rule; boiling time by altitude. |
| **Lightning distance** | Tap the flash, tap the thunder. |
| **Heat & cold** | NWS heat index with its danger bands; wind chill. |
| **Units** | Including tola and seer. |
| **Morse** | Any message to light or sound, and the full code table. |
| **Emergency numbers** | 112 and India's helplines up front; every country, tap to call. |
| **Go-bag checklist** | Ready.gov's list, ticked off on the phone. |

**Me** — a medical card for whoever helps you, notes, saved places and the checklist. **They stay in
this browser only and are never included when the library is copied** — a test checks that a copy's
library is byte-identical to the original and that nothing personal is anywhere else in the file.

## Checked against the sources, not assumed

- **Sunrise and sunset**: Mumbai on the equinox comes out at 06:40 IST, equator day length 12.12 h,
  polar night in Tromsø in December — and on the day it shipped, Mumbai's 06:29 / 18:26 against the
  published 06:27 / 18:25.
- **Water**: reproduces the EPA's table exactly — 8 drops of 6% or 6 of 8.25% per gallon, 1/3 and 2/3
  teaspoon for 4 and 8 gallons. Large volumes are given in teaspoons, because nobody counts 127 drops.
- **Heat index** matches the NWS chart (95 / 109 / 121 °F); **wind chill** the NWS formula.

Two bugs worth recording. Matching NOMAD's conditions word by word made a **snakebite** return
**insect-bite home remedies**; conditions now need a whole phrase. And a Wikipedia footnote, “[45]”,
lost its brackets and became a **tap-to-call link** on India's emergency numbers; footnotes are now
stripped at build time. Both are pinned by tests.

## Why

[Project NOMAD](https://github.com/Crosstalk-Solutions/project-nomad) (Apache-2.0) is an offline
knowledge server — Debian, Docker, optional GPU AI. Its most-discussed issues are installs failing,
and two of its requests — keyword search without AI, and citations with source and date — are what
a phone-sized tool does well. CACHE takes NOMAD's curation and drops the server.

## How it travels

The library (17 MB of text) is gzipped and base64-encoded inside the file — 7.7 MB — and unpacked in
the browser. Base64 has no angle brackets, so no article can break out of its tag. The search index
is built on the device in slices, so the tools work while it reads. A copy is the page's own four
parts (style, program, library, generation record) written into a new file, one generation later.

## What this is not

A reference and a toolkit, not a medic. **If someone may be dying, call your emergency number first
(112 in India).** GPS and compass need the browser's permission; calls and SMS need a phone signal.
Keyword search, not an AI; English only; a few hundred megabytes short of all of Wikipedia.

## Build

```bash
npm install
npm run pack    # Wikipedia (revision-pinned), FM 21-76, EPA, Ready.gov, NOMAD, emergency numbers
npm run build   # → dist/index.html (generation 0), sw.js, manifest
npm test        # 249 assertions
```

## Licences

Code: MIT. Wikipedia text and the emergency-number table: **CC BY-SA 4.0**, shared alike, with
per-article attribution. FM 21-76, EPA and Ready.gov text: US government works, public domain.
Remedy cards and condition vocabulary: Project NOMAD collections (Apache-2.0 repository; remedy text
US government public domain), pinned to the commit in `.cache/nomad/COMMIT`. Copies keep these
notices.
