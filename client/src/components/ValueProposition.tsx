import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { Lightbulb, Users, Vote, BookOpen, Film, ChevronLeft, ChevronRight, X } from "lucide-react";

interface ExperienceFeature {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  iconColor: string;
  backTitle: string;
  backDescription: string;
}

interface ExperienceCardProps extends ExperienceFeature {
  onRequestOpen?: () => void;
  heightClassName?: string;
  hintText?: string;
}

function ExperienceCard({
  icon: Icon,
  title,
  description,
  iconColor,
  backTitle,
  backDescription,
  onRequestOpen,
  heightClassName = "h-[23rem]",
  hintText,
}: ExperienceCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const rotateXRaw = useMotionValue(0);
  const rotateYRaw = useMotionValue(0);
  const rotateX = useSpring(rotateXRaw, { stiffness: 240, damping: 20, mass: 0.5 });
  const rotateY = useSpring(rotateYRaw, { stiffness: 240, damping: 20, mass: 0.5 });
  const openOnly = typeof onRequestOpen === "function";

  const activateCard = () => {
    if (openOnly) {
      onRequestOpen();
      return;
    }
    setIsFlipped((value) => !value);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    rotateYRaw.set((x - 0.5) * 16);
    rotateXRaw.set((0.5 - y) * 16);
  };

  const resetTilt = () => {
    rotateXRaw.set(0);
    rotateYRaw.set(0);
  };

  return (
    <div className={`${heightClassName} [perspective:1200px]`} onMouseMove={handleMouseMove} onMouseLeave={resetTilt}>
      <motion.div style={{ rotateX, rotateY }} className="h-full w-full">
        <motion.div
          className="relative h-full w-full cursor-pointer [transform-style:preserve-3d]"
          animate={{ rotateY: openOnly ? 0 : isFlipped ? 180 : 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          onClick={activateCard}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              activateCard();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`${openOnly ? "Open card" : "Flip card"}: ${title}`}
        >
          <div className="absolute inset-0 glass-card p-10 rounded-[2.5rem] flex flex-col items-center text-center border-white/20 shadow-2xl [backface-visibility:hidden]">
            <div className={`${iconColor} mb-8 p-6 glass-card rounded-3xl transition-transform duration-500`}>
              <Icon size={48} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-black mb-4 tracking-tight text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">{description}</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-6">{hintText ?? (openOnly ? "Click to open" : "Click to flip")}</p>
          </div>

          <div className="absolute inset-0 rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-white/95 via-slate-50/95 to-cyan-50/95 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-10 shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-center text-center">
            <p className="text-[10px] uppercase tracking-widest font-black text-cyan-700 dark:text-cyan-300 mb-4">Why It Matters</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{backTitle}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-4 leading-relaxed font-medium">{backDescription}</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-6">Click again to return</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function ValueProposition() {
  const features: ExperienceFeature[] = [
    {
      icon: Lightbulb,
      title: "Innovation Hub",
      description: "Discover groundbreaking sustainability projects from students across the school. Explore ideas that are shaping a better future.",
      iconColor: "text-primary",
      backTitle: "Ideas Become Real Projects",
      backDescription: "Students turn environmental challenges into practical solutions with clear goals, mentorship, and visible impact.",
    },
    {
      icon: Users,
      title: "Dashboard",
      description: "Track your project progress, receive feedback, and collaborate with your team in one centralized, high-tech workspace.",
      iconColor: "text-leaf-green",
      backTitle: "Your Project Command Center",
      backDescription: "Every update, comment, and milestone stays organized so teams can move faster and make better decisions.",
    },
    {
      icon: Vote,
      title: "Voting System",
      description: "Cast your vote for the most impactful projects and help determine the winners of the People's Choice Award.",
      iconColor: "text-digital-cyan",
      backTitle: "Community Voice Drives Momentum",
      backDescription: "Public voting celebrates meaningful work and gives students direct feedback from peers and the school community.",
    },
    {
      icon: BookOpen,
      title: "Resources",
      description: "Access comprehensive guides, rubrics, and resources to help you develop and present your sustainability project.",
      iconColor: "text-orange-500",
      backTitle: "From Draft to Polished Showcase",
      backDescription: "Structured references and rubrics help students improve project quality with confidence and consistency.",
    },
    {
      icon: Film,
      title: "Cinema",
      description: "Watch inspiring sustainability documentaries and student project highlights that showcase innovation in action.",
      iconColor: "text-rose-500",
      backTitle: "Stories That Inspire Action",
      backDescription: "Visual storytelling connects ideas to real-world outcomes and motivates the next round of changemakers.",
    },
  ];

  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [direction, setDirection] = useState(0);

  const openModal = (index: number) => {
    setDirection(0);
    setActiveCard(index);
  };

  const closeModal = () => {
    setActiveCard(null);
  };

  const showNextCard = () => {
    setDirection(1);
    setActiveCard((current) => {
      if (current === null) return 0;
      return (current + 1) % features.length;
    });
  };

  const showPrevCard = () => {
    setDirection(-1);
    setActiveCard((current) => {
      if (current === null) return 0;
      return (current - 1 + features.length) % features.length;
    });
  };

  useEffect(() => {
    if (activeCard === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
      if (event.key === "ArrowRight") showNextCard();
      if (event.key === "ArrowLeft") showPrevCard();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeCard]);

  return (
    <section className="branch-transparent-section py-24 relative overflow-hidden bg-transparent">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-20 animate-fadeIn">
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight hero-text-glow">What You'll Experience</h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Tomorrow's Earth Expo provides a premium platform to develop, showcase, and celebrate your innovations.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {features.map((feature, index) => (
            <ExperienceCard key={feature.title} {...feature} onRequestOpen={() => openModal(index)} hintText="Click to open" />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activeCard !== null && (
          <motion.div
            className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <div className="h-full w-full flex items-center justify-center">
              <motion.div
                className="relative w-full max-w-xl"
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={closeModal}
                  className="absolute -top-14 right-0 md:-right-1 h-11 w-11 rounded-full border border-white/35 bg-white/15 text-white hover:bg-white/25 transition-colors flex items-center justify-center"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>

                <button
                  type="button"
                  onClick={showPrevCard}
                  className="absolute left-0 -translate-x-[85%] top-1/2 -translate-y-1/2 hidden md:flex h-12 w-12 rounded-full border border-white/35 bg-white/15 text-white hover:bg-white/25 transition-colors items-center justify-center"
                  aria-label="Previous card"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={showNextCard}
                  className="absolute right-0 translate-x-[85%] top-1/2 -translate-y-1/2 hidden md:flex h-12 w-12 rounded-full border border-white/35 bg-white/15 text-white hover:bg-white/25 transition-colors items-center justify-center"
                  aria-label="Next card"
                >
                  <ChevronRight size={20} />
                </button>

                <AnimatePresence custom={direction} mode="wait">
                  <motion.div
                    key={activeCard}
                    custom={direction}
                    variants={{
                      enter: (dir: number) => ({ x: dir >= 0 ? 120 : -120, opacity: 0 }),
                      center: { x: 0, opacity: 1 },
                      exit: (dir: number) => ({ x: dir >= 0 ? -120 : 120, opacity: 0 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ExperienceCard {...features[activeCard]} heightClassName="h-[24rem] sm:h-[26rem] md:h-[28rem]" />
                  </motion.div>
                </AnimatePresence>

                <div className="mt-5 flex md:hidden items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={showPrevCard}
                    className="h-10 px-4 rounded-full border border-white/35 bg-white/15 text-white hover:bg-white/25 transition-colors flex items-center gap-1.5"
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button
                    type="button"
                    onClick={showNextCard}
                    className="h-10 px-4 rounded-full border border-white/35 bg-white/15 text-white hover:bg-white/25 transition-colors flex items-center gap-1.5"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
