import { journeyScenes } from './journeyScenes';

export interface SpeedSegment { t0: number; duration: number; v0: number; v1: number; distance: number }
const ease = (u: number) => u * u * (3 - 2 * u);
const integral = (u: number) => u ** 3 - u ** 4 / 2;
/** Time allocated to artwork, not a CSS animation duration. Each segment has an exact distance integral. */
export function makePreviewProfile(path: number[]) {
  const segments: SpeedSegment[] = [];
  let time = 0, distance = 0;
  const append = (duration: number, v0: number, v1: number) => {
    segments.push({ t0: time, duration, v0, v1, distance });
    time += duration; distance += duration * (v0 + v1) / 2;
  };
  path.slice(0, -1).forEach((scene, index) => {
    const duration = index === path.length - 2 ? 3.8 : journeyScenes[scene].previewDuration;
    const entry = index === 0 ? 0 : 0.6;
    const exit = index === path.length - 2 ? 0 : 0.6;
    // 0.85 windows of world distance; landmarks ease down in their central 60%.
    const ramp = index === 0 ? 0.65 : 0.2;
    const brake = index === path.length - 2 ? 0.65 : 0.2;
    const center = (0.85 / duration - entry * ramp / 2 - exit * brake / 2) / (1 - (ramp + brake) / 2);
    append(duration * ramp, entry, center);
    append(duration * (1 - ramp - brake), center, center);
    append(duration * brake, center, exit);
  });
  return { segments, duration: time, distance };
}
export function previewMotionAt(time: number, profile: ReturnType<typeof makePreviewProfile>) {
  if (time >= profile.duration) return { distance: profile.distance, speed: 0, acceleration: 0, duration: profile.duration, phase: 'BRAKING' as const };
  const segment = profile.segments.find(s => time < s.t0 + s.duration) ?? profile.segments[profile.segments.length - 1];
  const u = Math.max(0, Math.min(1, (time - segment.t0) / segment.duration));
  const acceleration = (segment.v1 - segment.v0) * 6 * u * (1 - u) / segment.duration;
  return {
    distance: segment.distance + segment.duration * (segment.v0 * u + (segment.v1 - segment.v0) * integral(u)),
    speed: segment.v0 + (segment.v1 - segment.v0) * ease(u), acceleration,
    duration: profile.duration,
    phase: acceleration < -0.005 ? 'BRAKING' as const : acceleration > 0.005 ? 'ACCELERATING' as const : 'CRUISING' as const,
  };
}
