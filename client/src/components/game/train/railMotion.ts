/** One world-distance model for both suspension impulses and audible wheel pairs. */
export const RAIL_SPACING = 0.24;
export const AXLE_OFFSET = 0.055;
export interface RailContact { distance: number; weight: number }
export function railContactsBetween(from: number, to: number): RailContact[] {
  if (to <= from) return [];
  const contacts: RailContact[] = [];
  const start = Math.max(1, Math.floor(from / RAIL_SPACING));
  for (let joint = start; joint <= Math.floor(to / RAIL_SPACING); joint++) {
    const distance = joint * RAIL_SPACING;
    if (distance > from && distance <= to) contacts.push({ distance, weight: 1 });
    const rear = distance + AXLE_OFFSET;
    if (rear > from && rear <= to) contacts.push({ distance: rear, weight: 0.72 });
  }
  return contacts;
}
