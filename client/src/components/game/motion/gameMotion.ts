/** Live-game adaptation of claude-motion's pacing/continuity principles.
 * Named beats keep visual actions and audio cues on the same timeline.
 * Physical train movement continues to belong exclusively to TrainJourneyEngine.
 */
import { CustomEase } from 'gsap/CustomEase';
import gsap from 'gsap';

gsap.registerPlugin(CustomEase);
export const gameEase = {
  arrive: CustomEase.create('eco-arrive', '0.16,1,0.3,1'),
  leave: CustomEase.create('eco-leave', '0.6,0,0.9,0.35'),
  travel: CustomEase.create('eco-travel', '0.65,0,0.35,1'),
};
export const gameBeats = {
  reveal: .72, exit: .32, word: .09, station: .065,
  intro: { guide: .52, mission: 5.5, briefing: 11, platform: 18.5 },
  boarding: { inviteOut: .22, push: 1.25, doorwayAt: .88, cover: .62, reveal: .85 },
} as const;
