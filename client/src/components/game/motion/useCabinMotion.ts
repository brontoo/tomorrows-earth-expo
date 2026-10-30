import { useLayoutEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { prefersReducedMotion } from '@/lib/journalMotion';
import { gameEase, gameBeats } from './gameMotion';

export function useCabinMotion(root: RefObject<HTMLElement | null>, held: boolean, caption: string, completed: boolean[]) {
  const priorStamps = useRef(completed);
  const stampKey = completed.map(Number).join('');
  useLayoutEffect(() => {
    if (held || prefersReducedMotion()) return;
    const context = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: gameEase.arrive } });
      tl.fromTo('.train-header > *', { opacity: 0, y: -9 }, { opacity: 1, y: 0, duration: .6, stagger: .09 }, .2)
        .fromTo('.train-ticket-heading', { opacity: 0, y: 7 }, { opacity: 1, y: 0, duration: .6 }, .35)
        .fromTo('.train-stop', { opacity: 0, y: 9 }, { opacity: 1, y: 0, duration: .5, stagger: gameBeats.station }, .44);
    }, root);
    return () => context.revert();
  }, [held, root]);
  useLayoutEffect(() => {
    if (held || prefersReducedMotion()) return;
    const context = gsap.context(() => {
      gsap.fromTo('.train-window-caption h1', { opacity: 0, y: 9 },
        { opacity: 1, y: 0, duration: .6, ease: gameEase.arrive });
    }, root);
    return () => context.revert();
  }, [caption, held, root]);
  useLayoutEffect(() => {
    const previous = priorStamps.current; priorStamps.current = completed;
    if (prefersReducedMotion()) return;
    const context = gsap.context(() => {
      completed.forEach((earned, index) => {
        if (earned && !previous[index]) gsap.fromTo(`.train-stop:nth-child(${index + 1}) .train-stamp`,
          { scale: 1.35, rotation: -18, opacity: .25 }, { scale: 1, rotation: -9, opacity: 1, duration: .7, ease: gameEase.arrive });
      });
    }, root);
    return () => context.revert();
  }, [stampKey, root]); // Only real passport changes trigger an earned stamp.
}
