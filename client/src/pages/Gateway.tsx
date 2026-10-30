import { Link } from "wouter";
import { ArrowRight, Compass, Sprout, Ticket } from "lucide-react";
import {
  EntryHeader,
  EntryScene,
  EntryFooter,
  ExperienceIcon,
} from "@/components/entry/EntryScene";

export default function Gateway() {
  return (
    <div className="entry-page entry-gateway">
      <EntryHeader />
      <main id="main-content" className="entry-gate-main">
        <section className="entry-gate-intro" aria-labelledby="entry-title">
          <div className="entry-kicker">
            <span /> WELCOME TO THE FIELD STATION
          </div>
          <h1 id="entry-title">
            Tomorrow
            <br />
            starts <em>with you.</em>
          </h1>
          <p className="entry-lead">
            A journey to explore. An idea to bring to life.
            <br className="entry-desktop-break" /> Choose your way to make a
            difference.
          </p>
          <div
            className="entry-mini-route"
            aria-label="Explore, discover, make an impact"
          >
            <span>
              <Compass size={17} /> Explore
            </span>
            <i />
            <span>
              <Sprout size={17} /> Discover
            </span>
            <i />
            <span>
              <Ticket size={17} /> Leave your mark
            </span>
          </div>
          <span className="entry-margin-note" aria-hidden="true">
            For the planet.
            <br />
            For our tomorrow.
          </span>
        </section>
        <EntryScene />
        <section
          className="entry-experiences"
          aria-labelledby="experience-heading"
        >
          <div className="entry-section-label">
            <h2 id="experience-heading">CHOOSE YOUR EXPERIENCE</h2>
            <span>Two paths. One shared future.</span>
          </div>
          <div className="entry-choice-grid">
            <Link
              href="/login?redirectTo=%2Feco-journey"
              className="entry-choice entry-choice-game"
            >
              <span className="entry-choice-number">01 / THE ADVENTURE</span>
              <span className="entry-choice-icon">
                <ExperienceIcon />
              </span>
              <h3>Take the Eco Train</h3>
              <p>
                Seven Emirates. Eco challenges. A passport full of discoveries.
              </p>
              <span className="entry-choice-action">
                Start your journey <ArrowRight size={19} />
              </span>
            </Link>
            <Link
              href="/login?redirectTo=%2Fdashboard"
              className="entry-choice entry-choice-expo"
            >
              <span className="entry-choice-number">02 / THE IDEAS</span>
              <span className="entry-choice-icon">
                <ExperienceIcon expo />
              </span>
              <h3>Explore the Expo</h3>
              <p>
                Student projects, fresh ideas, and the people shaping what’s
                next.
              </p>
              <span className="entry-choice-action">
                Enter the Expo <ArrowRight size={19} />
              </span>
            </Link>
          </div>
        </section>
      </main>
      <EntryFooter />
    </div>
  );
}
