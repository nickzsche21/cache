import type { Index, Pack } from "../lib/search";
import type { Meta } from "./replicate";

export type Tab = "ask" | "tools" | "library" | "me";

export type Host = {
  kind: "site" | "copy";
  offline: () => "ready" | "pending" | "unavailable";
  onOfflineChange?: (cb: () => void) => void;
};

/** What every view can reach: the library, the index when it is ready, and a way to move around. */
export type Ctx = {
  pack: Pack;
  meta: Meta;
  host: Host;
  index: () => Index | null;
  progress: () => number;
  onIndexed: (cb: () => void) => void;
  go: (tab: Tab, sub?: string) => void;
  read: (docIndex: number, query?: string) => void;
  ask: (q: string) => void;
  docByTitle: (title: string) => number;
};
