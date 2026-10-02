import { h, fill, load, save } from "../dom";
import type { Ctx } from "../ctx";
import { inIndia } from "../../lib/tools/field";

type Card = { name: string; blood: string; allergies: string; conditions: string; medicines: string; contact1: string; contact2: string; notes: string };
type Note = { id: number; text: string; at: string };
const EMPTY: Card = { name: "", blood: "", allergies: "", conditions: "", medicines: "", contact1: "", contact2: "", notes: "" };

/**
 * Things about you. They live in this browser's storage and nowhere else: no
 * server, and a copy of the library is built from the page's own parts, never
 * from these keys — so handing someone the library never hands them this.
 */
export function meView(ctx: Ctx) {
  const el = h("section", { class: "view" });
  const field = (card: Card, k: keyof Card, label: string, multi = false, ph = "") => {
    const input = multi
      ? h("textarea", { class: "field wide", rows: "2", placeholder: ph }, card[k])
      : h("input", { class: "field wide", value: card[k], placeholder: ph });
    input.addEventListener("input", () => { card[k] = (input as HTMLInputElement).value; save("card", card); });
    return h("label", { class: "stack" }, h("span", {}, label), input);
  };

  function showCard(card: Card) {
    const big = h("div", { class: "ice", role: "dialog", "aria-label": "Medical card" },
      h("p", { class: "ice-h" }, "MEDICAL INFORMATION"),
      card.name ? h("p", { class: "ice-name" }, card.name) : null,
      ...([["Blood type", card.blood], ["Allergies", card.allergies], ["Conditions", card.conditions], ["Medicines", card.medicines],
        ["Emergency contact", card.contact1], ["Second contact", card.contact2], ["Notes", card.notes]] as const)
        .filter(([, v]) => v.trim()).map(([k, v]) => h("div", { class: "ice-row" }, h("span", {}, k), h("strong", {}, v))),
      h("p", { class: "note" }, "Tap to close."));
    big.addEventListener("click", () => big.remove());
    document.body.append(big);
  }

  function render() {
    const card = { ...EMPTY, ...load<Card>("card", EMPTY) };
    const notes = load<Note[]>("notes", []);
    const noteBox = h("textarea", { class: "field wide", rows: "3", placeholder: "A note — what happened, what you have, who you saw" });
    fill(el,
      h("p", { class: "note" }, "Everything on this tab stays on this device, in this browser. It is never sent anywhere and never included when you copy the library."),
      h("h2", { class: "band" }, "Medical card"),
      h("p", { class: "note" }, "For whoever helps you if you can’t speak. Show it full-screen."),
      field(card, "name", "Name"),
      field(card, "blood", "Blood type", false, "e.g. O+"),
      field(card, "allergies", "Allergies", true, "medicines, foods, stings"),
      field(card, "conditions", "Conditions", true, "diabetes, asthma, epilepsy, pregnancy…"),
      field(card, "medicines", "Medicines you take", true),
      field(card, "contact1", "Emergency contact", false, "name and number"),
      field(card, "contact2", "Second contact", false, "name and number"),
      field(card, "notes", "Anything else", true),
      h("button", { class: "go", onclick: () => showCard({ ...EMPTY, ...load<Card>("card", EMPTY) }) }, "Show my card"),
      h("h2", { class: "band" }, "Notes"),
      noteBox,
      h("button", { class: "go small", onclick: () => {
        if (!noteBox.value.trim()) return;
        notes.unshift({ id: Date.now(), text: noteBox.value.trim(), at: new Date().toLocaleString() });
        save("notes", notes.slice(0, 300)); render();
      } }, "Save note"),
      ...notes.map((n, i) => h("article", { class: "card" },
        h("p", { class: "note" }, n.at),
        h("p", { class: "pre" }, n.text),
        h("button", { class: "linkish", onclick: () => { notes.splice(i, 1); save("notes", notes); render(); } }, "delete"))),
      h("h2", { class: "band" }, "Saved places & checklist"),
      h("div", { class: "btns" },
        h("button", { class: "go ghost", onclick: () => ctx.go("tools", "compass") }, "Saved places"),
        h("button", { class: "go ghost", onclick: () => ctx.go("tools", "kit") }, "Go-bag checklist")),
      inIndia() ? h("p", { class: "note" }, "In India, 112 reaches police, ambulance and fire.") : null,
    );
  }
  render();
  return { el, refresh: render };
}
