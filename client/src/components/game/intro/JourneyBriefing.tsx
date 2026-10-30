import { ArrowRight, MapPin } from "lucide-react";
import { stations } from "../train/journeyScenes";

export default function JourneyBriefing({
  onContinue,
}: {
  onContinue: () => void;
}) {
  return (
    <div className="intro-journey-brief">
      <div className="journey-brief-copy">
        <span className="journey-kicker">03 / YOUR TRAVEL BRIEFING</span>
        <h2 className="story-title">
          7 Emirates.
          <br />7 Stops.
          <br />
          <em>7 Eco Challenges.</em>
        </h2>
        <p className="story-desc">Your train is ready to depart.</p>
        <button
          type="button"
          className="intro-platform-link"
          onClick={onContinue}
        >
          Continue to the platform <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="journey-map-art">
        <span className="journey-map-label">
          <MapPin size={15} /> A ROUTE FULL OF DISCOVERIES
        </span>
        <img
          className="intro-uae-map"
          src="/new%20uae.svg"
          alt="Outline of the United Arab Emirates"
        />
        <ol
          className="intro-seven-stops"
          aria-label="Journey route across the Seven Emirates"
        >
          {stations.map((station, index) => (
            <li key={station.id}>
              <span aria-hidden="true">{index + 1}</span>
              {station.name}
            </li>
          ))}
        </ol>
        <span className="journey-map-caption">
          Abu Dhabi to Fujairah. One shared environment.
        </span>
      </div>
    </div>
  );
}
