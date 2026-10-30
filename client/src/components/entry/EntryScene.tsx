import { Link } from "wouter";
import { ArrowUpRight, Leaf, TrainFront, FlaskConical } from "lucide-react";
import "./entry.css";

export function EntryBrand() {
  return (
    <Link
      href="/"
      className="entry-brand"
      aria-label="Tomorrow's Earth Expo home"
    >
      <span className="entry-brand-icon">
        <Leaf size={23} strokeWidth={1.5} />
      </span>
      <span>
        Tomorrow’s Earth<span>EXPO · UM AL EMARAT SCHOOL</span>
      </span>
    </Link>
  );
}

export function EntryHeader({ login = false }: { login?: boolean }) {
  return (
    <header className="entry-header">
      <EntryBrand />
      <nav aria-label="Entrance navigation">
        {login ? (
          <Link href="/" className="entry-header-link">
            Choose an experience <ArrowUpRight size={16} />
          </Link>
        ) : (
          <Link href="/login" className="entry-header-link">
            Sign in <ArrowUpRight size={16} />
          </Link>
        )}
      </nav>
    </header>
  );
}

export function EntryScene({ compact = false }: { compact?: boolean }) {
  return (
    <figure className={`entry-scene ${compact ? "entry-scene-login" : ""}`}>
      <img
        className="entry-scene-art"
        src="/train/Gemini_Generated_Image_43lqmg43lqmg43lq.jpg.jpg"
        alt="Bu Ghosn welcomes you beside an open train door at a sunlit UAE station"
        fetchPriority="high"
      />
      <span className="entry-scene-label">
        <span /> NEXT DEPARTURE: A BETTER TOMORROW
      </span>
      <figcaption>
        <span>THE SEVEN EMIRATES JOURNEY</span>
        <p>
          A little curiosity.
          <br />A world of possibility.
        </p>
      </figcaption>
      <div className="entry-scene-stamp" aria-hidden="true">
        <Leaf size={22} />
        <span>7 EMIRATES</span>
        <i>one shared future</i>
      </div>
    </figure>
  );
}

export function ExperienceIcon({ expo = false }: { expo?: boolean }) {
  return expo ? (
    <FlaskConical size={25} strokeWidth={1.4} />
  ) : (
    <TrainFront size={25} strokeWidth={1.4} />
  );
}

export function EntryFooter() {
  return (
    <footer className="entry-footer">
      <span>A SMALL STEP. A LASTING IMPACT.</span>
      <span>
        Tomorrow’s Earth Expo <span aria-hidden="true">↗</span> 2026
      </span>
    </footer>
  );
}
