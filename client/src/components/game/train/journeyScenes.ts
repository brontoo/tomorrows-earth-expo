/** Supplied artwork, in archive order. Original filenames are intentionally retained. */
export type Transition = 'tunnel' | 'passing-train' | 'wall' | 'haze';
export interface JourneyScene {
  id: string;
  image: string;
  emirate: number;
  type: 'intro' | 'landmark' | 'transition' | 'outro';
  direction: 'left';
  baseDuration: number;
  speedMultiplier: number;
  transition: Transition;
  label: string;
  station: boolean;
}
const artwork: [string, number, JourneyScene['type'], string, Transition][] = [
  ['01-TRANSITION 00.jpg', 0, 'intro', 'The desert approach', 'wall'],
  ['02- AD1.jpg', 0, 'landmark', 'Abu Dhabi skyline and Sheikh Zayed Grand Mosque', 'wall'],
  ['03- TRANSITION 01.jpg', 0, 'transition', 'Abu Dhabi waterfront', 'wall'],
  ['04- AD2.jpg', 0, 'landmark', 'Louvre Abu Dhabi', 'passing-train'],
  ['05- TRANSITION 02A.jpg', 1, 'transition', 'Desert road to Dubai', 'wall'],
  ['06- .jpg', 1, 'transition', 'Dubai on the horizon', 'wall'],
  ['07- D1.jpg', 1, 'landmark', 'Burj Khalifa and Downtown Dubai', 'wall'],
  ['08- TRANSITION 03.jpg', 1, 'transition', 'Through the city', 'passing-train'],
  ['09- D2.jpg', 1, 'landmark', 'Dubai coastline and Dubai Frame', 'wall'],
  ['10- TRANSITION 04.jpg', 2, 'transition', 'Coastal mangroves toward Sharjah', 'wall'],
  ['11- SHJ1.jpg', 2, 'landmark', 'Sharjah waterfront', 'wall'],
  ['12- TRANSITION 05.jpg', 2, 'transition', 'Sharjah corniche', 'wall'],
  ['13- SHJ2.jpg', 2, 'landmark', 'Sharjah heritage and mosque', 'passing-train'],
  ['14- TRANSITION 06.jpg', 3, 'transition', 'The coast toward Ajman', 'wall'],
  ['15- AJ1.jpg', 3, 'landmark', 'Ajman fort and coast', 'wall'],
  ['16- TRANSITION 07.jpg', 3, 'transition', 'Ajman coastal mangroves', 'wall'],
  ['17- AJ2.jpg', 3, 'landmark', 'Ajman mangrove boardwalk', 'wall'],
  ['18- TRANSITION 08.jpg', 4, 'transition', 'Tidal islands toward Umm Al Quwain', 'haze'],
  ['19- UMQ1.jpg', 4, 'landmark', 'Umm Al Quwain harbour', 'wall'],
  ['20- TRANSITION 09.jpg', 4, 'transition', 'Mangrove channels', 'wall'],
  ['21- UMQ2.jpg', 4, 'landmark', 'Umm Al Quwain coastal fort', 'passing-train'],
  ['22- TRANSITION 02A - Copy.jpg', 5, 'transition', 'Inland desert approach', 'wall'],
  ['23- RAK1.jpg', 5, 'landmark', 'Ras Al Khaimah mountain valley', 'tunnel'],
  ['24- TRANSITION 02A - Copy - Copy - Copy.jpg', 5, 'transition', 'Desert landscape', 'wall'],
  ['25- RAK2.jpg', 5, 'landmark', 'Ras Al Khaimah heritage fort', 'tunnel'],
  ['26- TRANSITION 02A - Copy.jpg', 6, 'transition', 'Across the desert toward Fujairah', 'wall'],
  ['27- FUJ1.jpg', 6, 'landmark', 'Fujairah mosque and mountains', 'tunnel'],
  ['28- TRANSITION 02A - Copy.jpg', 6, 'transition', 'The final desert passage', 'wall'],
  ['29- FUJ2.jpg', 6, 'outro', 'Fujairah fort, mountains and eastern sea', 'tunnel'],
];
export const journeyScenes: JourneyScene[] = artwork.map(([file, emirate, type, label, transition], i) => ({
  id: `scene-${i + 1}`, image: `/train/${encodeURIComponent(file)}`, emirate, type,
  direction: 'left', baseDuration: type === 'landmark' || type === 'outro' ? 1.1 : 0.8,
  speedMultiplier: type === 'landmark' || type === 'outro' ? 0.88 : 1.12,
  transition, label, station: [1, 6, 10, 14, 18, 22, 28].includes(i),
}));

/** One source of ordering, mission binding, station artwork and map silhouettes. */
export const stations = [
  { id: 'abu-dhabi', name: 'Abu Dhabi', scene: 1, missionSlug: 'water-detective', map: '/AD.svg' },
  { id: 'dubai', name: 'Dubai', scene: 6, missionSlug: 'energy-smart-check', map: '/D.svg' },
  { id: 'sharjah', name: 'Sharjah', scene: 10, missionSlug: 'waste-sort-study', map: '/SHJ.svg' },
  { id: 'ajman', name: 'Ajman', scene: 14, missionSlug: 'micro-habitat-observer', map: '/AJ.svg' },
  { id: 'umm-al-quwain', name: 'Umm Al Quwain', scene: 18, missionSlug: 'climate-evidence-basics', map: '/UMQ.svg' },
  { id: 'ras-al-khaimah', name: 'Ras Al Khaimah', scene: 22, missionSlug: 'design-a-better-route', map: '/RAK.svg' },
  { id: 'fujairah', name: 'Fujairah', scene: 28, missionSlug: 'one-week-impact-choice', map: '/FUJ.svg' },
] as const;
export const CABIN_IMAGE = '/train/main%20fram.jpg';
export const CABIN_SIZE = { width: 2752, height: 1536 };
/** Measured from the connected white placeholder in the supplied cabin JPEG. */
export const WINDOW = { x: 469, y: 99, width: 1827, height: 1151 };
