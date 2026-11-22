import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Bird,
  BookOpen,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Droplets,
  Fish,
  Leaf,
  Minus,
  Plus,
  Settings2,
  Shell,
  Sprout,
  Waves,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  forestDiscoveryIds,
  forestProgress,
  forestViews,
  type ForestAction,
  type ForestView,
} from "@shared/hiddenForest";
import {
  forestAreas,
  forestDiscoveries,
  forestInteractions,
  forestReferences,
} from "./forestContent";
import { enableForestAudio } from "./forestAudio";
import { readGuestForest, saveGuestForest } from "./forestSave";
import {
  forestSpecimens,
  forestSpecimenIds,
  type ForestSpecimen,
} from "./forestSpecimens";
import { mountMangroveWorld, type MangroveWorldHandle } from "./mangroveScene";
import "./abu-dhabi-world.css";

const specimenIcons = {
  leaf: Leaf,
  fish: Fish,
  feather: Bird,
  crab: Shell,
  habitat: Waves,
  roots: Sprout,
  droplet: Droplets,
  tide: Waves,
  carbon: Leaf,
  sediment: Shell,
};
const fallbackLink = "/eco-journey?chapter=abu-dhabi";
type Props = { onBack?: () => void };
type Drawer = "explore" | "atlas" | "gallery" | "settings";
const firstTide = 47;

export function ForestBack({ onBack }: Props) {
  return onBack ? (
    <button type="button" className="forest-back" onClick={onBack}>
      <ArrowLeft size={17} /> Back to Book
    </button>
  ) : (
    <Link className="forest-back" href={fallbackLink}>
      <ArrowLeft size={17} /> Back to Book
    </Link>
  );
}

export class ForestBoundary extends Component<
  Props & { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="forest-entry-fallback">
        <ForestBack onBack={this.props.onBack} />
        <p role="alert">
          The forest could not load. Reopen it from Abu Dhabi to try again.
        </p>
      </div>
    );
  }
}

function WorldSession({
  onBack,
  student,
  scope,
}: Props & { student: boolean; scope: string }) {
  const utils = trpc.useUtils();
  const mine = trpc.hiddenForest.mine.useQuery(
    { cacheScope: scope },
    { enabled: student, retry: false }
  );
  const incoming = trpc.hiddenForest.observe.useMutation();
  const [local, setLocal] = useState<ForestAction[]>(() =>
    student ? [] : readGuestForest()
  );
  const pending = useRef(new Set<ForestAction>());
  const progress = student
    ? (mine.data ?? forestProgress([]))
    : forestProgress(local);
  const known = useRef(new Set(progress.actions));
  known.current = new Set(progress.actions);

  const host = useRef<HTMLDivElement>(null),
    overlay = useRef<HTMLElement>(null);
  const world = useRef<MangroveWorldHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [issue, setIssue] = useState("");
  const [saveIssue, setSaveIssue] = useState("");
  const [drawer, setDrawer] = useState<Drawer>("explore");
  const [view, setView] = useState<ForestView>("canopy");
  const [specimen, setSpecimen] = useState<ForestSpecimen>("perch");
  const [exhibitState, setExhibitState] = useState<
    "loading" | "ready" | "failed"
  >("ready");
  const [tide, setTide] = useState(firstTide);
  const [selected, setSelected] = useState<ForestAction | null>(null);
  const [inspected, setInspected] = useState<string | null>(null);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const tideAnim = useRef<number | null>(null);
  const [playingTide, setPlayingTide] = useState(false);
  const audio = useRef<ReturnType<typeof enableForestAudio> | null>(null);
  const [sound, setSound] = useState(false);
  const [wind, setWind] = useState(60),
    [cues, setCues] = useState(55);
  const [stamp, setStamp] = useState(0);
  const previousCount = useRef(progress.discoveries.length);
  const hydrated = useRef(!student);

  function record(action: ForestAction) {
    if (known.current.has(action) || pending.current.has(action)) return;
    if (!student) {
      const saved = saveGuestForest(action);
      setLocal(old => forestProgress([...old, ...saved]).actions);
      return;
    }
    pending.current.add(action);
    void utils.hiddenForest.mine
      .cancel({ cacheScope: scope })
      .then(() => incoming.mutateAsync({ action }))
      .then(result => {
        utils.hiddenForest.mine.setData({ cacheScope: scope }, previous =>
          forestProgress([...(previous?.actions ?? []), ...result.actions])
        );
        setSaveIssue("");
      })
      .catch(() => {
        setSaveIssue(
          "This observation could not be saved. Repeat it to retry."
        );
      })
      .finally(() => pending.current.delete(action));
  }

  const recordRef = useRef(record);
  recordRef.current = record;
  const cancelTide = useCallback(() => {
    if (tideAnim.current !== null) cancelAnimationFrame(tideAnim.current);
    tideAnim.current = null;
    setPlayingTide(false);
  }, []);

  function showDrawer(next: Drawer) {
    if (drawer === next) return;
    if (next === "gallery") {
      cancelTide();
      setSelected(null);
      world.current?.setSpecimen(specimen);
      audio.current?.setUnderwater(false);
    } else if (drawer === "gallery") {
      world.current?.setSpecimen(null);
      audio.current?.setUnderwater(view === "underwater");
    }
    setDrawer(next);
  }

  function selectView(next: ForestView) {
    if (next === view) return;
    cancelTide();
    setSelected(null);
    setView(next);
    world.current?.setView(next);
    audio.current?.setUnderwater(next === "underwater");
    record(`visit-${next}`);
  }

  function interact(action: ForestAction) {
    const area = forestViews.find(key =>
      forestAreas[key].interactions.some(item => item.action === action)
    );
    if (area) selectView(area);
    setSelected(action);
    world.current?.inspect(action);
    record(action);
  }
  const interactRef = useRef(interact);
  interactRef.current = interact;

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    overlay.current
      ?.querySelector<HTMLElement>(".forest-back")
      ?.focus({ preventScroll: true });
    let handle: MangroveWorldHandle | undefined;
    try {
      handle = mountMangroveWorld(
        node,
        action => interactRef.current(action),
        () => {
          setReady(true);
          recordRef.current("visit-canopy");
        },
        setIssue,
        setExhibitState
      );
      world.current = handle;
    } catch {
      setIssue(
        "WebGL is unavailable on this device. The scientific controls and atlas are still accessible."
      );
      setReady(true);
      recordRef.current("visit-canopy");
    }
    return () => {
      handle?.dispose();
      world.current = null;
      if (tideAnim.current !== null) cancelAnimationFrame(tideAnim.current);
      audio.current?.close();
      audio.current = null;
    };
  }, []);

  useEffect(() => {
    world.current?.setReducedMotion(reduced);
  }, [reduced]);

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    const count = progress.discoveries.length;
    if (!hydrated.current) {
      if (mine.data) {
        previousCount.current = count;
        hydrated.current = true;
      }
      return;
    }
    if (count > previousCount.current) {
      setStamp(value => value + 1);
      audio.current?.discover();
    }
    previousCount.current = count;
  }, [mine.data, progress.discoveries.length]);

  function tideTo(value: number) {
    setTide(value);
    world.current?.setTide(value);
    audio.current?.setTide(value);
    if (value <= 15) record("observe-low-tide");
    if (value >= 85) record("observe-high-tide");
  }

  function animateTide() {
    if (playingTide) {
      cancelTide();
      return;
    }
    if (reduced) {
      tideTo(tide > 50 ? 10 : 90);
      return;
    }
    const start = performance.now(),
      origin = tide;
    setPlayingTide(true);
    const tick = (now: number) => {
      const position = Math.min(1, (now - start) / 9000);
      const value =
        position <= 0.35
          ? origin + (10 - origin) * (position / 0.35)
          : 10 + (90 - 10) * ((position - 0.35) / 0.65);
      tideTo(Math.round(value));
      if (position < 1) tideAnim.current = requestAnimationFrame(tick);
      else cancelTide();
    };
    tideAnim.current = requestAnimationFrame(tick);
  }

  async function toggleSound() {
    if (audio.current) {
      audio.current.close();
      audio.current = null;
      setSound(false);
      return;
    }
    let next: ReturnType<typeof enableForestAudio>;
    try {
      next = enableForestAudio();
    } catch {
      setIssue("Audio is unavailable in this browser.");
      return;
    }
    audio.current = next;
    try {
      await next.wake;
      if (audio.current !== next) return;
      next.setAmbience(wind);
      next.setCues(cues);
      next.setUnderwater(view === "underwater");
      next.setTide(tide);
      next.transition();
      setSound(true);
    } catch {
      if (audio.current === next) {
        next.close();
        audio.current = null;
        setIssue("Audio could not start in this browser.");
      }
    }
  }

  const information = selected ? forestInteractions[selected] : undefined;
  const detail = inspected && forestDiscoveryIds.find(id => id === inspected);
  const selectedCard = detail ? forestDiscoveries[detail] : undefined;
  const galleryModel = forestSpecimens[specimen];
  const tideLabel =
    tide <= 15 ? "Low tide" : tide >= 85 ? "High tide" : "Between tides";
  return (
    <section
      ref={overlay}
      className={`forest-world ${ready ? "is-ready" : "is-entering"}`}
      data-from-book={onBack ? "true" : undefined}
      data-reduced-motion={reduced ? "true" : undefined}
      role={onBack ? "dialog" : undefined}
      aria-modal={onBack ? true : undefined}
      aria-labelledby="hidden-forest-title"
      onKeyDown={event => {
        if (!onBack) return;
        if (event.key === "Escape") {
          event.preventDefault();
          onBack();
        }
        if (event.key !== "Tab") return;
        const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
          "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled)"
        );
        const edge = event.shiftKey
          ? focusable[0]
          : focusable[focusable.length - 1];
        const destination = event.shiftKey
          ? focusable[focusable.length - 1]
          : focusable[0];
        if (document.activeElement === edge) {
          event.preventDefault();
          destination?.focus();
        }
      }}
    >
      <div className="forest-scene" ref={host} aria-hidden="true" />
      <header className="forest-header">
        <ForestBack onBack={onBack} />
        <div className="forest-title">
          <div>ABU DHABI</div>
          <h1 id="hidden-forest-title">The Hidden Forest</h1>
        </div>
        <nav className="forest-tabs" aria-label="Forest controls">
          <button
            type="button"
            aria-pressed={drawer === "explore"}
            onClick={() => showDrawer("explore")}
          >
            <Sprout size={17} /> Explore
          </button>
          <button
            type="button"
            aria-pressed={drawer === "atlas"}
            onClick={() => showDrawer("atlas")}
          >
            <BookOpen size={17} /> Atlas
          </button>
          <button
            type="button"
            aria-label="Gallery"
            title="Model gallery"
            className="forest-gallery-tab"
            disabled={!ready}
            aria-pressed={drawer === "gallery"}
            onClick={() => showDrawer("gallery")}
          >
            <Box size={17} /> <span>Gallery</span>
          </button>
          <button
            type="button"
            aria-label="Settings"
            aria-pressed={drawer === "settings"}
            onClick={() => showDrawer("settings")}
          >
            <Settings2 size={18} />
          </button>
        </nav>
      </header>
      {!ready && (
        <p className="forest-loading" role="status">
          Opening the mangrove forest…
        </p>
      )}
      {issue && (
        <p className="forest-issue" role="status">
          {issue}
        </p>
      )}
      {ready && (
        <>
          <aside
            className="forest-controls"
            aria-label={
              drawer === "explore"
                ? "Explore the forest"
                : drawer === "atlas"
                  ? "Living Atlas"
                  : drawer === "gallery"
                    ? "Model gallery"
                    : "Forest settings"
            }
          >
            {drawer === "explore" && (
              <>
                <label className="forest-area-picker">
                  Exploration area
                  <select
                    value={view}
                    onChange={event =>
                      selectView(event.currentTarget.value as ForestView)
                    }
                  >
                    {forestViews.map(id => (
                      <option key={id} value={id}>
                        {forestAreas[id].label}
                      </option>
                    ))}
                  </select>
                </label>
                <h2>{forestAreas[view].label}</h2>
                <div className="forest-interactions">
                  {forestAreas[view].interactions.map(item => (
                    <button
                      key={item.action}
                      type="button"
                      aria-pressed={selected === item.action}
                      onClick={() =>
                        interact(
                          selected === "reveal-lateral-roots" &&
                            item.action === selected
                            ? "inspect-pneumatophores"
                            : item.action
                        )
                      }
                    >
                      {selected === "reveal-lateral-roots" &&
                      item.action === selected
                        ? "Hide underground roots"
                        : item.label}
                    </button>
                  ))}
                </div>
                {view === "tides" && (
                  <div className="forest-tide">
                    <label htmlFor="forest-tide">
                      Tide level <strong>{tideLabel}</strong>
                    </label>
                    <input
                      id="forest-tide"
                      type="range"
                      min="0"
                      max="100"
                      aria-valuetext={tideLabel}
                      value={tide}
                      onChange={event => {
                        cancelTide();
                        tideTo(Number(event.currentTarget.value));
                      }}
                    />
                    <button type="button" onClick={animateTide}>
                      {playingTide
                        ? "Pause tide"
                        : reduced
                          ? "Show next tide"
                          : "Animate tide"}
                    </button>
                  </div>
                )}
                {information && (
                  <p className="forest-note" role="status">
                    {information.detail}{" "}
                    <a
                      href={forestReferences[information.source].url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Scientific source
                    </a>
                  </p>
                )}
              </>
            )}
            {drawer === "atlas" && (
              <>
                <div className="forest-atlas-heading">
                  <h2>Living Atlas</h2>
                  <span>{progress.discoveries.length} / 12</span>
                </div>
                <p className="forest-note">
                  {student
                    ? mine.isError
                      ? "Atlas progress is temporarily unavailable."
                      : "Your observations are saved to your account."
                    : "Guest discoveries stay on this browser."}
                </p>
                <div className="forest-collection">
                  {forestDiscoveryIds.map(id => {
                    const card = forestDiscoveries[id],
                      Icon =
                        specimenIcons[
                          card.specimen as keyof typeof specimenIcons
                        ];
                    const found = progress.discoveries.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={!found}
                        aria-pressed={inspected === id}
                        onClick={() => setInspected(id)}
                      >
                        <Icon size={20} />
                        {found ? card.title : "Undiscovered"}
                      </button>
                    );
                  })}
                </div>
                {selectedCard && (
                  <p className="forest-note">
                    <strong>{selectedCard.title}</strong>
                    <br />
                    {selectedCard.description}{" "}
                    <a
                      href={forestReferences[selectedCard.source].url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Scientific source
                    </a>
                  </p>
                )}
                {progress.legacySeal && (
                  <p className="forest-seal">
                    <Sprout size={22} /> Abu Dhabi Legacy Seal
                  </p>
                )}
              </>
            )}
            {drawer === "gallery" && (
              <div aria-busy={exhibitState === "loading"}>
                <label className="forest-area-picker">
                  Gallery model
                  <select
                    value={specimen}
                    onChange={event => {
                      const next = event.currentTarget.value as ForestSpecimen;
                      setSpecimen(next);
                      world.current?.setSpecimen(next);
                    }}
                  >
                    {forestSpecimenIds.map(id => (
                      <option key={id} value={id}>
                        {forestSpecimens[id].name}
                      </option>
                    ))}
                  </select>
                </label>
                <h2>{galleryModel.name}</h2>
                {exhibitState === "loading" && (
                  <p role="status">Loading 3D model…</p>
                )}
                {exhibitState === "failed" && (
                  <button
                    type="button"
                    onClick={() => world.current?.setSpecimen(specimen)}
                  >
                    Retry 3D preview
                  </button>
                )}
                <p className="forest-note">{galleryModel.detail}</p>
                {"credit" in galleryModel && (
                  <p className="forest-note">
                    <a
                      href={galleryModel.credit.source}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {galleryModel.credit.author}
                    </a>
                    {" · "}
                    <a
                      href={galleryModel.credit.license}
                      target="_blank"
                      rel="noreferrer"
                    >
                      CC BY 4.0
                    </a>
                    {" · Textures resized for the browser"}
                  </p>
                )}
              </div>
            )}
            {drawer === "settings" && (
              <>
                <h2>Settings</h2>
                <button
                  type="button"
                  aria-pressed={sound}
                  onClick={() => void toggleSound()}
                >
                  {sound ? "Mute all sound" : "Enable sound"}
                </button>
                <label className="forest-setting">
                  Ambience
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={wind}
                    onChange={event => {
                      const volume = Number(event.currentTarget.value);
                      setWind(volume);
                      audio.current?.setAmbience(volume);
                    }}
                  />
                </label>
                <label className="forest-setting">
                  Discovery sounds
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={cues}
                    onChange={event => {
                      const volume = Number(event.currentTarget.value);
                      setCues(volume);
                      audio.current?.setCues(volume);
                    }}
                  />
                </label>
                <label className="forest-check">
                  <input
                    type="checkbox"
                    checked={reduced}
                    onChange={event => {
                      cancelTide();
                      setReduced(event.currentTarget.checked);
                    }}
                  />{" "}
                  Reduce motion
                </label>
              </>
            )}
            {saveIssue && (
              <p className="forest-note" role="status">
                {saveIssue}
              </p>
            )}
          </aside>
          <nav
            className="forest-orbit"
            aria-label="Keyboard and pointer camera controls"
          >
            <button
              title="Orbit left"
              aria-label="Orbit left"
              onClick={() => world.current?.orbit(-0.24, 0)}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              title="Tilt up"
              aria-label="Tilt up"
              onClick={() => world.current?.orbit(0, -0.16)}
            >
              <ChevronUp size={20} />
            </button>
            <button
              title="Tilt down"
              aria-label="Tilt down"
              onClick={() => world.current?.orbit(0, 0.16)}
            >
              <ChevronDown size={20} />
            </button>
            <button
              title="Orbit right"
              aria-label="Orbit right"
              onClick={() => world.current?.orbit(0.24, 0)}
            >
              <ChevronRight size={20} />
            </button>
            <button
              title="Zoom in"
              aria-label="Zoom in"
              onClick={() => world.current?.zoom(0.81)}
            >
              <Plus size={19} />
            </button>
            <button
              title="Zoom out"
              aria-label="Zoom out"
              onClick={() => world.current?.zoom(1.23)}
            >
              <Minus size={19} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (drawer === "gallery") world.current?.setSpecimen(specimen);
                else world.current?.setView(view);
              }}
            >
              Reset
            </button>
          </nav>
          <div className="forest-record" key={stamp} role="status">
            {stamp > 0 &&
              `${progress.discoveries.length} of 12 discoveries recorded`}
          </div>
        </>
      )}
    </section>
  );
}

export default function AbuDhabiWorld(props: Props) {
  const auth = useAuthContext();
  const student = auth.isAuthenticated && auth.user?.role === "student";
  const scope = student ? String(auth.user?.id) : "guest";
  return (
    <ForestBoundary onBack={props.onBack}>
      <WorldSession
        key={scope}
        student={student}
        scope={scope}
        onBack={props.onBack}
      />
    </ForestBoundary>
  );
}
