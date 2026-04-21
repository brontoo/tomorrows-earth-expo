import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

interface PremiumCountdownProps {
  targetDateISO?: string;
  className?: string;
}

function getCountdownParts(targetTimeMs: number): CountdownParts {
  const diff = Math.max(0, targetTimeMs - Date.now());

  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  };
}

function formatValue(unit: keyof CountdownParts, value: number) {
  if (unit === "days") return String(value).padStart(2, "0");
  return String(value).padStart(2, "0");
}

interface CountdownCellProps {
  value: string;
  label: string;
  pulse?: boolean;
  onCardMouseMove: (event: MouseEvent<HTMLElement>) => void;
  onCardMouseLeave: (event: MouseEvent<HTMLElement>) => void;
}

function CountdownCell({ value, label, pulse = false, onCardMouseMove, onCardMouseLeave }: CountdownCellProps) {
  const [currentValue, setCurrentValue] = useState(value);
  const [incomingValue, setIncomingValue] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "start" | "active">("idle");
  const animationTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (value === currentValue) return;

    setIncomingValue(value);
    setPhase("start");

    const frame = window.requestAnimationFrame(() => {
      setPhase("active");
    });

    animationTimeout.current = window.setTimeout(() => {
      setCurrentValue(value);
      setIncomingValue(null);
      setPhase("idle");
      animationTimeout.current = null;
    }, 620);

    return () => {
      window.cancelAnimationFrame(frame);
      if (animationTimeout.current) {
        window.clearTimeout(animationTimeout.current);
      }
    };
  }, [value, currentValue]);

  return (
    <article
      className={`pc-card ${pulse ? "pc-seconds" : ""}`}
      onMouseMove={onCardMouseMove}
      onMouseLeave={onCardMouseLeave}
    >
      <div className="pc-value-stack" aria-live="polite">
        <span className={`pc-value pc-current ${phase !== "idle" ? "pc-exit-active" : ""}`}>
          {currentValue}
        </span>
        {incomingValue && (
          <span
            className={`pc-value pc-next ${phase === "start" ? "pc-enter" : ""} ${phase === "active" ? "pc-enter-active" : ""}`}
          >
            {incomingValue}
          </span>
        )}
      </div>
      <span className="pc-label">{label}</span>
    </article>
  );
}

export default function PremiumCountdown({
  targetDateISO = "2026-05-20T09:00:00+04:00",
  className,
}: PremiumCountdownProps) {
  const targetDateMs = useMemo(() => new Date(targetDateISO).getTime(), [targetDateISO]);
  const [parts, setParts] = useState<CountdownParts>(() => getCountdownParts(targetDateMs));

  useEffect(() => {
    const tick = () => setParts(getCountdownParts(targetDateMs));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetDateMs]);

  const updatePointerEffects = (event: MouseEvent<HTMLElement>) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const px = (x / rect.width) * 100;
    const py = (y / rect.height) * 100;

    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = Math.sqrt(cx * cx + cy * cy);
    const proximity = Math.max(0, 1 - distance / maxDistance);

    element.style.setProperty("--pc-mx", `${px}%`);
    element.style.setProperty("--pc-my", `${py}%`);
    element.style.setProperty("--pc-glow", String(proximity));

    const tiltX = ((y / rect.height) - 0.5) * -4;
    const tiltY = ((x / rect.width) - 0.5) * 4;
    element.style.setProperty("--pc-rx", `${tiltX.toFixed(2)}deg`);
    element.style.setProperty("--pc-ry", `${tiltY.toFixed(2)}deg`);
  };

  const resetPointerEffects = (event: MouseEvent<HTMLElement>) => {
    const element = event.currentTarget;
    element.style.setProperty("--pc-glow", "0");
    element.style.setProperty("--pc-rx", "0deg");
    element.style.setProperty("--pc-ry", "0deg");
  };

  return (
    <div className={`pc-wrap ${className ?? ""}`}>
      <div className="pc-grid">
        <CountdownCell
          value={formatValue("days", parts.days)}
          label="Days"
          onCardMouseMove={updatePointerEffects}
          onCardMouseLeave={resetPointerEffects}
        />
        <CountdownCell
          value={formatValue("hours", parts.hours)}
          label="Hours"
          onCardMouseMove={updatePointerEffects}
          onCardMouseLeave={resetPointerEffects}
        />
        <CountdownCell
          value={formatValue("minutes", parts.minutes)}
          label="Minutes"
          onCardMouseMove={updatePointerEffects}
          onCardMouseLeave={resetPointerEffects}
        />
        <CountdownCell
          value={formatValue("seconds", parts.seconds)}
          label="Seconds"
          pulse
          onCardMouseMove={updatePointerEffects}
          onCardMouseLeave={resetPointerEffects}
        />
      </div>
    </div>
  );
}
