/** Chapter order and existing mission bindings are defined only here. */
export const chapters = [
  {
    id: "abu-dhabi",
    name: "Abu Dhabi",
    missionSlug: "water-detective",
    map: "/AD.svg",
    accent: "#8b9a85",
    description: "White domes, quiet water, and a city looking forward.",
  },
  {
    id: "dubai",
    name: "Dubai",
    missionSlug: "energy-smart-check",
    map: "/D.svg",
    accent: "#728e95",
    description: "A skyline of possibilities, shaped by tomorrow’s choices.",
  },
  {
    id: "sharjah",
    name: "Sharjah",
    missionSlug: "waste-sort-study",
    map: "/SHJ.svg",
    accent: "#aa9272",
    description: "Culture, craft, and the things we choose to keep.",
  },
  {
    id: "ajman",
    name: "Ajman",
    missionSlug: "micro-habitat-observer",
    map: "/AJ.svg",
    accent: "#ac7f61",
    description: "A coastal fort. A closer look at the life around us.",
  },
  {
    id: "umm-al-quwain",
    name: "Umm Al Quwain",
    missionSlug: "climate-evidence-basics",
    map: "/UMQ.svg",
    accent: "#6f9290",
    description: "Mangroves, sheltered lagoons, and stories in the evidence.",
  },
  {
    id: "ras-al-khaimah",
    name: "Ras Al Khaimah",
    missionSlug: "design-a-better-route",
    map: "/RAK.svg",
    accent: "#a56d54",
    description: "Folded mountains and thoughtful paths through the landscape.",
  },
  {
    id: "fujairah",
    name: "Fujairah",
    missionSlug: "one-week-impact-choice",
    map: "/FUJ.svg",
    accent: "#8b816f",
    description:
      "Where mountains meet the sea, and small habits become lasting change.",
  },
].map((chapter, index) => ({
  ...chapter,
  order: index + 1,
  video: `/book/${chapter.id}.mp4`,
  poster: `/book/${chapter.id}-rest.webp`,
  reference: `/book/${chapter.id}-reference.webp`,
  route: `/missions/${chapter.missionSlug}`,
  stamp: chapter.map,
}));
export type Chapter = (typeof chapters)[number];
export interface MissionCard {
  id: number;
  slug: string;
  title: string;
}
export interface MissionState {
  missionId: number;
  status: string;
}
export const isComplete = (status?: string) =>
  status === "completed" || status === "verified";
export function chapterProgress(
  missions: MissionCard[],
  states: MissionState[]
) {
  const completed = chapters.map(c => {
    const mission = missions.find(m => m.slug === c.missionSlug);
    return Boolean(
      mission &&
        isComplete(states.find(s => s.missionId === mission.id)?.status)
    );
  });
  const first = completed.findIndex(done => !done);
  return {
    completed,
    frontier: first < 0 ? chapters.length - 1 : first,
    count: completed.filter(Boolean).length,
  };
}
export type BookPhase =
  | "cover"
  | "opening"
  | "contents"
  | "turning"
  | "reveal"
  | "ready"
  | "stamping"
  | "stamps"
  | "final";
export interface BookState {
  phase: BookPhase;
  chapter: number;
  destination: "reveal" | "contents" | "stamps" | "final";
  serial: number;
}
export type BookEvent =
  | { type: "OPEN" }
  | { type: "SELECT"; index: number; frontier: number; completed?: boolean }
  | { type: "SPREAD"; spread: "contents" | "stamps" | "final" }
  | { type: "ANIMATED" }
  | { type: "REVEALED" }
  | { type: "STAMP" }
  | { type: "STAMPED" };
export function bookReducer(state: BookState, event: BookEvent): BookState {
  const busy = ["opening", "turning", "stamping"].includes(state.phase);
  switch (event.type) {
    case "OPEN":
      return state.phase === "cover"
        ? { ...state, phase: "opening", serial: state.serial + 1 }
        : state;
    case "SELECT":
      return busy ||
        !Number.isInteger(event.index) ||
        event.index < 0 ||
        event.index >= chapters.length ||
        (event.index > event.frontier && !event.completed)
        ? state
        : {
            phase: "turning",
            chapter: event.index,
            destination: "reveal",
            serial: state.serial + 1,
          };
    case "SPREAD":
      return busy || state.phase === "cover"
        ? state
        : {
            ...state,
            phase: "turning",
            destination: event.spread,
            serial: state.serial + 1,
          };
    case "ANIMATED":
      return state.phase === "opening"
        ? { ...state, phase: "contents" }
        : state.phase === "turning"
          ? { ...state, phase: state.destination }
          : state;
    case "REVEALED":
      return state.phase === "reveal" ? { ...state, phase: "ready" } : state;
    case "STAMP":
      return state.phase === "ready" ? { ...state, phase: "stamping" } : state;
    case "STAMPED":
      return state.phase === "stamping" ? { ...state, phase: "ready" } : state;
  }
}
