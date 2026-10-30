import { stations } from '../train/journeyScenes';

export default function JourneyBriefing({ onContinue }: { onContinue: () => void }) {
  return <div className="intro-journey-brief">
    <span className="intro-annotation">YOUR TRAVEL BRIEFING</span>
    <h2 className="story-title">7 Emirates. <span>7 Stops.</span> <span>7 Eco Challenges.</span></h2>
    <img className="intro-uae-map" src="/new%20uae.svg" alt="Outline of the United Arab Emirates" />
    <ol className="intro-seven-stops" aria-label="Journey route across the Seven Emirates">
      {stations.map((station, index) => <li key={station.id}><span aria-hidden="true">{index + 1}</span>{station.name}</li>)}
    </ol>
    <p className="story-desc">Your train is ready to depart.</p>
    <button type="button" className="intro-platform-link" onClick={onContinue}>Continue to the platform <span aria-hidden="true">→</span></button>
  </div>;
}
