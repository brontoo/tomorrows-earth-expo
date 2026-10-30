export const PREVIEW_KEY = 'uaeTrainPreviewSeen:v1';
export const journeyKey = (profile: string) => `uaeTrainJourney:v1:${profile}`;
export function readStorage(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function writeStorage(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* Private mode still supports the current journey. */ }
}
export function readJourney(profile: string) {
  try {
    const data = JSON.parse(readStorage(journeyKey(profile)) ?? '{}');
    return { boarded: data.boarded === true, station: Number.isInteger(data.station) ? Math.max(0, Math.min(6, data.station)) : 0 };
  } catch { return { boarded: false, station: 0 }; }
}
export function saveJourney(profile: string, station: number) {
  writeStorage(journeyKey(profile), JSON.stringify({ boarded: true, station }));
}
export interface MissionCard { id: number; slug: string; title: string; description?: string }
export interface MissionState { missionId: number; status: string }
export const isComplete = (status?: string) => status === 'completed' || status === 'verified';
