import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { prefersReducedMotion } from '@/lib/journalMotion';
import { gameEase, gameBeats } from './gameMotion';

/** Keep the challenge mounted for its short exit; a quick reopen cancels that exit. */
export function MotionPanel({ show, children }: { show: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(show);
  const entered = useRef(false);
  const node = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (show) setMounted(true); }, [show]);
  useLayoutEffect(() => {
    if (!mounted || !node.current) return;
    const reduced = prefersReducedMotion();
    const panel = node.current;
    const timeline = gsap.timeline();
    if (show) {
      const fresh = !entered.current; entered.current = true;
      if (fresh) gsap.set(panel, { autoAlpha: 0, y: reduced ? 0 : 16, rotation: reduced ? 0 : -.7 });
      timeline.to(panel, { autoAlpha: 1, y: 0, rotation: 0, duration: reduced ? .1 : gameBeats.reveal, ease: gameEase.arrive });
      const content = panel.querySelectorAll('.train-guide-copy > *, .train-actions > *');
      if (fresh && !reduced) gsap.set(content, { opacity: 0, y: 8 });
      timeline.to(content, { opacity: 1, y: 0, duration: reduced ? .1 : .48,
        stagger: fresh && !reduced ? .075 : 0, ease: gameEase.arrive }, fresh && !reduced ? .14 : 0);
    } else {
      timeline.to(panel, { autoAlpha: 0, y: reduced ? 0 : 8, duration: reduced ? .08 : gameBeats.exit / 1.4,
        ease: gameEase.leave, onComplete: () => { entered.current = false; setMounted(false); } });
    }
    return () => { timeline.kill(); };
  }, [show, mounted]);
  if (!mounted) return null;
  return <div ref={node} id="train-challenge" className="train-station-panel" aria-live="polite" aria-atomic="true" aria-hidden={!show} inert={!show}>{children}</div>;
}
