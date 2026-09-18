import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import GestureModeToggle from "@/components/GestureModeToggle";
import { useGesture, type GestureCommand } from "@/contexts/GestureContext";
import { ArrowLeft, ArrowRight, Hand, MousePointer2 } from "lucide-react";

const commands: GestureCommand[] = [
  "POINT", "SELECT", "GRAB", "RELEASE", "SWIPE_LEFT", "SWIPE_RIGHT",
  "SWIPE_UP", "SWIPE_DOWN", "ZOOM_IN", "ZOOM_OUT", "BACK", "PAUSE",
];

const demoSlides = [
  { title: "Water futures", text: "Explore how every drop connects to a healthier school.", image: "https://images.unsplash.com/photo-1538300342682-cf57afb97285?auto=format&fit=crop&w=1200&q=80" },
  { title: "Energy choices", text: "Small decisions can change the energy story of a classroom.", image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=80" },
  { title: "Living systems", text: "Look closer and discover the biodiversity around you.", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80" },
];

function DemoCarousel() {
  const [slide, setSlide] = useState(0);
  const { subscribe } = useGesture();
  const current = demoSlides[slide];
  useEffect(() => subscribe((event) => {
    if (event.command === "SWIPE_LEFT") setSlide((value) => (value + 1) % demoSlides.length);
    if (event.command === "SWIPE_RIGHT") setSlide((value) => (value - 1 + demoSlides.length) % demoSlides.length);
  }), [subscribe]);
  return <section className="mt-10 overflow-hidden rounded-3xl border border-border bg-card shadow-sm"><div className="relative aspect-[16/7] min-h-64"><img src={current.image} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-transparent" /><div className="relative flex h-full max-w-xl flex-col justify-end p-7 text-white md:p-10"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Temporary interaction demo</p><h2 className="mt-3 text-3xl font-black md:text-5xl">{current.title}</h2><p className="mt-3 text-sm text-white/80 md:text-base">{current.text}</p></div><button type="button" aria-label="Previous slide" onClick={() => setSlide((value) => (value - 1 + demoSlides.length) % demoSlides.length)} className="absolute left-4 top-1/2 rounded-full bg-black/40 p-3 text-white hover:bg-black/70"><ArrowLeft className="h-5 w-5" /></button><button type="button" aria-label="Next slide" onClick={() => setSlide((value) => (value + 1) % demoSlides.length)} className="absolute right-4 top-1/2 rounded-full bg-black/40 p-3 text-white hover:bg-black/70"><ArrowRight className="h-5 w-5" /></button></div><div className="flex items-center justify-center gap-2 p-4">{demoSlides.map((item, index) => <button key={item.title} type="button" aria-label={`Show ${item.title}`} onClick={() => setSlide(index)} className={`h-2 rounded-full transition-all ${index === slide ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"}`} />)}</div></section>;
}

export default function Experiences() {
  const { emitCommand, lastEvent, pointer, subscribe } = useGesture();
  const [selectedCommand, setSelectedCommand] = useState<GestureCommand | null>(null);
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") emitCommand({ command: "SWIPE_LEFT", confidence: 1 });
      if (event.key === "ArrowRight") emitCommand({ command: "SWIPE_RIGHT", confidence: 1 });
      if (event.key === "ArrowUp") emitCommand({ command: "SWIPE_UP", confidence: 1 });
      if (event.key === "ArrowDown") emitCommand({ command: "SWIPE_DOWN", confidence: 1 });
      if (event.key === "Enter") emitCommand({ command: "SELECT", confidence: 1 });
      if (event.key === "Escape") emitCommand({ command: "BACK", confidence: 1 });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [emitCommand]);

  useEffect(() => {
    if (lastEvent) setSelectedCommand(lastEvent.command);
  }, [lastEvent]);

  useEffect(() => subscribe((event) => {
    if (event.command === "SWIPE_UP") window.scrollBy({ top: -window.innerHeight * 0.55, behavior: "smooth" });
    if (event.command === "SWIPE_DOWN") window.scrollBy({ top: window.innerHeight * 0.55, behavior: "smooth" });
    if (event.command === "ZOOM_IN") setZoom((value) => Math.min(1.35, Number((value + 0.1).toFixed(2))));
    if (event.command === "ZOOM_OUT") setZoom((value) => Math.max(0.75, Number((value - 0.1).toFixed(2))));
    if (event.command === "SELECT") {
      const x = (event.x === undefined ? (pointer?.x ?? 0.5) : 1 - event.x) * window.innerWidth;
      const y = (event.y ?? pointer?.y ?? 0.5) * window.innerHeight;
      const target = document.elementFromPoint(x, y) as HTMLElement | null;
      const interactive = target?.closest("button, a, input, textarea, select, [role='button']") as HTMLElement | null;
      if (interactive) interactive.click(); else setSelected((value) => !value);
    }
    if (event.command === "PAUSE") setPaused((value) => !value);
  }), [pointer, subscribe]);

  return <div className="min-h-screen bg-background"><Navigation /><main className="container px-6 pb-20 pt-12 md:pt-20"><section className="max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Interactive learning</p><h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Experiences</h1><p className="mt-6 text-lg leading-relaxed text-muted-foreground">Gesture-ready simulations with real page interaction. The camera is optional and keyboard, mouse, and touch controls remain available.</p></section><div className="mt-10 max-w-3xl"><GestureModeToggle /></div><DemoCarousel /><div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm"><span className="font-bold text-primary">Latest command:</span> {selectedCommand || "None yet"} <span className="ml-4">Zoom: {Math.round(zoom * 100)}% · {paused ? "Paused" : "Running"}</span></div><section className="mt-10 grid gap-5 md:grid-cols-3"><article className="rounded-2xl border border-border bg-card p-6"><Hand className="h-7 w-7 text-primary" /><h2 className="mt-5 text-xl font-bold">Gesture commands</h2><p className="mt-2 text-sm text-muted-foreground">Pinch clicks buttons. Swipes change the carousel or scroll. Two hands zoom the stage.</p><div className="mt-4 flex flex-wrap gap-2">{commands.map((command) => <button key={command} type="button" onClick={() => emitCommand({ command, confidence: 1 })} className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${selectedCommand === command ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{command}</button>)}</div></article><article className="rounded-2xl border border-border bg-card p-6 md:col-span-2"><MousePointer2 className="h-7 w-7 text-primary" /><h2 className="mt-5 text-xl font-bold">Live interaction stage</h2><div className="mt-5 origin-top rounded-2xl border border-primary/20 bg-gradient-to-br from-emerald-100 via-cyan-50 to-amber-50 p-8 transition-transform duration-300 dark:from-emerald-950/50 dark:via-cyan-950/50 dark:to-amber-950/50" style={{ transform: `scale(${zoom})` }}><div className={`mx-auto max-w-md rounded-2xl border-2 p-8 text-center transition ${selected ? "border-primary bg-primary/15 shadow-xl" : "border-border bg-card"}`}><p className="text-5xl" aria-hidden="true">🌍</p><h3 className="mt-4 text-2xl font-black">Sustainable systems</h3><p className="mt-2 text-sm text-muted-foreground">Use pinch to click, open palm to pause, and two hands to zoom.</p><p className="mt-5 text-xs font-bold uppercase tracking-widest text-primary">{paused ? "Simulation paused" : "Simulation running"}</p></div></div></article></section></main></div>;
}
