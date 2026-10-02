// src/components/game/EcoJourney.tsx
// النسخة الكاملة (نفس نسختك المحلية vanilla) بعد نقلها إلى React بشكل سليم.
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import gsap from "gsap";
import { initFloatingParallax, initConstellationCanvas } from "./animations";
import { init3DPod, characterModel } from "./threeScene";
import { trpc } from "@/lib/trpc";
import { useAuthContext } from "@/contexts/AuthContext";
import "./EcoJourney.css";
// دفتر الميدان: طبقة تجميلية إضافية (لا تُلغي أي قاعدة سابقة من EcoJourney.css)
import "./fieldJournal.css";
import {
  journalSfx,
  stampIn,
  paperShake,
  puffAt,
  inkRing,
  typewriter,
  prefersReducedMotion,
} from "@/lib/journalMotion";

// استيراد الصور
import p1 from "../../assets/illustrations/p1.png";
import p2 from "../../assets/illustrations/p2.png";
import p3 from "../../assets/illustrations/p3.png";
import p4 from "../../assets/illustrations/p4.png";
import p5 from "../../assets/illustrations/p5.png";
import p6 from "../../assets/illustrations/p6.png";

export default function EcoJourney() {
  const containerRef = useRef<HTMLElement>(null);
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuthContext();
  const isStudent = isAuthenticated && user?.role === "student";

  // دفتر الميدان: حالة كتم الصوت (إضافة مستقلة لا تغيّر أي منطق قائم)
  const [soundMuted, setSoundMuted] = useState(false);

  // مسار المهام يقرأ المهام الحقيقية من قاعدة البيانات.
  // للزائر غير المسجّل يبقى الشكل الافتراضي كما هو (لا يتغير شيء).
  const missionsQuery = trpc.missions.getAll.useQuery(undefined, { staleTime: 60_000 });
  const passportQuery = trpc.passport.getMine.useQuery(undefined, {
    enabled: isStudent,
    staleTime: 30_000,
  });

  // نحتفظ بأحدث بيانات في ref لأن منطق اللعبة يعمل داخل useEffect مرة واحدة.
  const progressRef = useRef<{ missions: any[]; states: Map<number, string> }>({
    missions: [],
    states: new Map(),
  });
  progressRef.current = {
    missions: Array.isArray(missionsQuery.data) ? (missionsQuery.data as any[]).slice(0, 7) : [],
    states: new Map<number, string>(
      ((passportQuery.data?.missionStates ?? []) as any[]).map((row) => [row.missionId, row.status]),
    ),
  };

  useEffect(() => {
    // اللعبة شاشة كاملة: اقفل تمرير الصفحة أثناءها فقط
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100%";
    document.documentElement.style.height = "100%";

    // 1. تهيئة مشهد Three.js (نمرر العنصر نفسه وليس نصاً)
    const podElement = document.getElementById("pod-container") as HTMLDivElement | null;
    const disposePod = podElement ? init3DPod(podElement) : undefined;

    // 2. العناصر العائمة (نفس منطق المشروع المحلي: يعتمد على data-speed)
    initFloatingParallax(".floating-asteroid");

    // 3. نجوم الكوكبة
    const starPoints = [
      { x: window.innerWidth * 0.2, y: window.innerHeight * 0.3 },
      { x: window.innerWidth * 0.35, y: window.innerHeight * 0.15 },
      { x: window.innerWidth * 0.65, y: window.innerHeight * 0.2 },
      { x: window.innerWidth * 0.8, y: window.innerHeight * 0.35 },
    ];
    const canvas = document.getElementById("star-canvas") as HTMLCanvasElement | null;
    if (canvas) initConstellationCanvas(canvas, starPoints);

    // 4. تفاعل الماوس مع الشخصية فقط (تجنّباً لتعارض GSAP مع العناصر العائمة)
    const handleMouseMove = (e: MouseEvent) => {
      const mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      const mouseY = (e.clientY / window.innerHeight - 0.5) * 2;

      if (characterModel) {
        gsap.to(characterModel.rotation, {
          y: mouseX * 0.4,
          x: mouseY * 0.15,
          duration: 1.2,
          ease: "power1.out",
        });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);

    let ctx: gsap.Context | undefined;

    // 5. كل الأنيميشن والتسلسل داخل gsap.context مربوط بحاوية الصفحة
    ctx = gsap.context(() => {
      let currentStage = 1;

      const triggerMapPhase = () => {
        if (currentStage >= 3) return;
        currentStage = 3;
        const tl = gsap.timeline();

        tl.to(
          ".story-slide-group:last-child .story-title, .story-slide-group:last-child .story-desc",
          { opacity: 0, y: -30, duration: 0.5, stagger: 0.1, ease: "power2.inOut" },
          0
        );
        tl.to("#progress-container", { opacity: 0, y: 20, duration: 0.5 }, 0);

        tl.to(
          "#character-group",
          { y: "28vh", scale: 0.65, duration: 1.2, ease: "back.out(1.2)" },
          "-=0.2"
        );

        tl.to("#split-left", { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" }, "-=0.5")
          .to("#split-right", { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" }, "-=0.8")
          .to(
            "#combined-map-container",
            { opacity: 1, scale: 1, duration: 1.2, ease: "back.out(1.5)" },
            "-=0.6"
          );

        setTimeout(() => {
          const combinedMap = document.getElementById("combined-map-container");
          if (combinedMap) {
            combinedMap.style.pointerEvents = "auto";
            combinedMap.addEventListener("click", triggerStageFour, { once: true });
          }
        }, 1500);
      };

      const animateDashedSevenLines = () => {
        const svg = document.getElementById("lines-svg");
        if (!svg) return;

        const width = window.innerWidth;
        const height = window.innerHeight;
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

        // ===== دفتر الميدان: خريطة الإمارات المجمّعة تنزلق إلى أقصى اليسار،
        //       ثم تتساقط الإمارات السبع من أعلى واحدة تلو الأخرى (أبوظبي أولًا)
        //       ويرتسم مسار القلم بين كل إمارة والتي تليها. =====
        gsap.to("#combined-map-container", {
          // إزاحة محسوبة لتبقى الخريطة ظاهرة في أقصى اليسار
          // (GSAP يحتفظ بـtranslateX(-50%) كمركّبة xPercent منفصلة)
          // ملاحظة: لا نلمس scale هنا — يتولّاه تايم‑لاين المرحلة الرابعة
          // (GSAP يحتفظ بـtranslateX(-50%) كمركّبة xPercent مقدارها -325px عند عرض 1600)
          x: -window.innerWidth * 0.31,
          duration: 1.1,
          ease: "power2.inOut",
        });

        const nodeSpots = [
          // سلسلة أفقية في منتصف الشاشة (مُزاحة قليلًا لليسار): أبوظبي ← … ← الفجيرة
          { x: 0.39, y: 0.62 },
          { x: 0.52, y: 0.55 },
          { x: 0.63, y: 0.48 },
          { x: 0.72, y: 0.42 },
          { x: 0.8, y: 0.45 },
          { x: 0.87, y: 0.52 },
          { x: 0.93, y: 0.6 },
        ];
        // نقطة الوصل تبدأ من حدّ الخريطة المجمّعة اليمنى (بعد انزلاقها لليسار)
        const mapX = width * 0.28;
        const mapY = height * 0.56;
        const fallFrom = height * 0.78;

        const emiratesData = [
          { name: "Abu Dhabi", file: "/AD.svg", size: 100 },
          { name: "Dubai", file: "/D.svg", size: 85 },
          { name: "Sharjah", file: "/SHJ.svg", size: 90 },
          { name: "Ajman", file: "/AJ.svg", size: 70 },
          { name: "Umm Al Quwain", file: "/UMQ.svg", size: 75 },
          { name: "Ras Al Khaimah", file: "/RAK.svg", size: 85 },
          { name: "Fujairah", file: "/FUJ.svg", size: 90 },
        ];

        svg.innerHTML = "";
        const lineItems: { path: SVGPathElement; group: SVGGElement; length: number; y: number }[] = [];
        const ringElements: SVGCircleElement[] = [];

        for (let i = 0; i < 7; i++) {
          const spot = nodeSpots[i];
          const endX = width * spot.x;
          const endY = height * spot.y;
          const emirate = emiratesData[i];

          // المسار: من الخريطة المجمّعة إلى أبوظبي، ثم بين كل إمارة والتي تليها
          const fromX = i === 0 ? mapX : width * nodeSpots[i - 1].x;
          const fromY = i === 0 ? mapY : height * nodeSpots[i - 1].y;
          const controlX = (fromX + endX) / 2;
          const controlY = Math.min(fromY, endY) - Math.abs(endY - fromY) * 0.3 - 40;

          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          const dStr = `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${endX} ${endY}`;
          path.setAttribute("d", dStr);
          path.setAttribute("stroke", "rgba(0, 255, 136, 0.6)");
          path.setAttribute("stroke-width", "2.5");
          path.setAttribute("stroke-dasharray", "8 8");
          path.setAttribute("fill", "none");
          path.setAttribute("stroke-linecap", "round");
          path.setAttribute("filter", "drop-shadow(0px 0px 5px rgba(0, 255, 136, 0.8))");

          const positionWrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
          gsap.set(positionWrapper, {
            x: endX,
            // تبدأ عالية فوق الشاشة ثم تتساقط إلى موضعها (أثر «السقوط على الخريطة»)
            y: endY - fallFrom,
            scale: 0.7,
            opacity: 0,
            transformOrigin: "center center",
          });

          const emirateGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
          emirateGroup.setAttribute("class", "emirate-group");

          const baseRadius = 60;
          const nodeBase = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          nodeBase.setAttribute("cx", "0");
          nodeBase.setAttribute("cy", "0");
          nodeBase.setAttribute("r", baseRadius.toString());
          nodeBase.setAttribute("class", "node-base");

          const nodeRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          nodeRing.setAttribute("cx", "0");
          nodeRing.setAttribute("cy", "0");
          nodeRing.setAttribute("r", (baseRadius + 10).toString());
          nodeRing.setAttribute("class", "node-ring");
          ringElements.push(nodeRing);

          const padding = 50;
          const foreignObject = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "foreignObject"
          );
          foreignObject.setAttribute("width", (emirate.size + padding).toString());
          foreignObject.setAttribute("height", (emirate.size + padding).toString());
          foreignObject.setAttribute("x", (-(emirate.size / 2) - padding / 2).toString());
          foreignObject.setAttribute("y", (-(emirate.size / 2) - padding / 2).toString());
          foreignObject.style.overflow = "visible";

          const hologramDiv = document.createElement("div");
          hologramDiv.className = "emirate-hologram-wrapper";
          hologramDiv.style.width = `${emirate.size}px`;
          hologramDiv.style.height = `${emirate.size}px`;
          hologramDiv.style.margin = `${padding / 2}px auto`;
          // setProperty أأمن من webkitMaskImage في TypeScript
          hologramDiv.style.setProperty("-webkit-mask-image", `url('${emirate.file}')`);
          hologramDiv.style.setProperty("mask-image", `url('${emirate.file}')`);
          foreignObject.appendChild(hologramDiv);

          const dx = endX - controlX;
          const dy = endY - controlY;
          let angle = Math.atan2(dy, dx) * (180 / Math.PI);
          if (angle > 90 || angle < -90) angle += 180;
          angle = angle * 0.7;
          // ميل خفيف فقط حتى تبقى أسماء الإمارات مقروءة
          angle = Math.max(-14, Math.min(14, angle));

          const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
          label.setAttribute("x", "0");
          label.setAttribute("y", (baseRadius + 25).toString());
          label.setAttribute("class", "emirate-label");
          label.setAttribute("transform", `rotate(${angle}, 0, ${baseRadius + 25})`);
          label.textContent = emirate.name;

          emirateGroup.appendChild(nodeRing);
          emirateGroup.appendChild(nodeBase);
          emirateGroup.appendChild(foreignObject);
          emirateGroup.appendChild(label);

          positionWrapper.appendChild(emirateGroup);
          svg.appendChild(path);
          svg.appendChild(positionWrapper);

          const length = path.getTotalLength();
          path.style.strokeDasharray = `8 8`;
          path.style.strokeDashoffset = length.toString();

          lineItems.push({ path, group: positionWrapper, length, y: endY });
        }

        const linesTl = gsap.timeline();

        lineItems.forEach((item, index) => {
          linesTl
            .to(
              item.path,
              { strokeDashoffset: 0, duration: 0.7, ease: "power2.out" },
              index * 0.2
            )
            .to(
              item.group,
              { opacity: 1, scale: 1, y: item.y, duration: 0.72, ease: "back.out(1.35)" },
              "-=0.5"
            );

          gsap.to(item.path, {
            strokeDashoffset: -item.length,
            duration: 8,
            repeat: -1,
            ease: "none",
            delay: 2.5 + index * 0.2,
          });
        });

        ringElements.forEach((ring, index) => {
          gsap.to(ring, {
            rotation: 360,
            transformOrigin: "center center",
            duration: 10 + (index % 3),
            repeat: -1,
            ease: "none",
          });
        });

        // بعد اكتمال رسم الخطوط: إنزال المشهد ثم رسم مسار المهام
        linesTl.add(() => {
          const finalTransitionTl = gsap.timeline();

          finalTransitionTl.to(
            "#character-group",
            { y: "38vh", scale: 0.38, duration: 1.4, ease: "power3.inOut" },
            0
          );

          finalTransitionTl.add(() => {
            // ===== دفتر الميدان =====
            // ألغينا مسار المراحل المرقّم: دوائر الإمارات السبع هي المراحل الفعلية.
            // نُظهر فقط بادج «You Are Here» فوق إمارة أبوظبي (أول عقدة في السلسلة).
            void drawJourneyMap;

            const container = document.getElementById("journey-container");
            const indicator = document.getElementById("player-indicator");
            const indicatorLabel = document.getElementById("current-mission-name");
            const firstMission = progressRef.current.missions[0];

            if (indicatorLabel && firstMission) {
              indicatorLabel.textContent = `Mission 1: ${firstMission.title}`;
            }

            if (container) {
              container.style.top = "0";
              container.style.left = "0";
              container.style.width = "100%";
              container.style.height = "100%";
              gsap.to(container, { opacity: 1, duration: 0.8, ease: "power2.out" });
            }

            if (indicator) {
              // نفس موضع أبوظبي (أول عنصر في nodeSpots) مع ارتفاع البادج فوق الدائرة
              gsap.set(indicator, {
                left: window.innerWidth * 0.42,
                top: window.innerHeight * 0.62 - 122,
                opacity: 0,
              });
              gsap.to(indicator, { opacity: 1, duration: 0.6, delay: 0.35, ease: "power2.out" });
              journalSfx.pin();
            }
          }, "+=0.5");
        }, "+=0.5");
      };

      const drawJourneyMap = () => {
        const container = document.getElementById("journey-container");
        const svg = document.getElementById("journey-svg") as SVGSVGElement | null;
        const indicator = document.getElementById("player-indicator");

        if (!container || !svg || !indicator) return;

        gsap.to(container, { opacity: 1, duration: 1, ease: "power2.out" });

        const width = container.clientWidth;
        const height = container.clientHeight;
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

        // مواضع العُقد السبع على المسار (كما في النسخة المحلية)
        const nodePositions = [
          { x: 0.15, y: 0.8 },
          { x: 0.3, y: 0.65 },
          { x: 0.25, y: 0.4 },
          { x: 0.45, y: 0.25 },
          { x: 0.65, y: 0.45 },
          { x: 0.8, y: 0.3 },
          { x: 0.9, y: 0.6 },
        ];

        const fallbackTitles = [
          "Waste Audit",
          "Water Conservation",
          "Renewable Energy",
          "Forest Biodiversity",
          "Ocean Protection",
          "Sustainable Food",
          "Climate Innovation",
        ];

        const progress = progressRef.current;
        const doneStatuses = new Set(["completed", "verified"]);
        const realMissions = progress.missions;
        const firstOpenIndex = realMissions.findIndex(
          (mission: any) => !doneStatuses.has(progress.states.get(mission.id) ?? ""),
        );

        const nodes = nodePositions.map((position, index) => {
          const mission = realMissions[index];
          let status: string;
          if (!mission || firstOpenIndex === -1) {
            // إما لا توجد بيانات حقيقية، أو أنجز الطالب كل المهام
            status = mission ? "completed" : index === 0 ? "active" : "locked";
          } else if (index < firstOpenIndex) {
            status = "completed";
          } else if (index === firstOpenIndex) {
            status = "active";
          } else {
            status = "locked";
          }

          return {
            id: index + 1,
            x: width * position.x,
            y: height * position.y,
            status,
            mission: mission?.title ?? fallbackTitles[index],
            slug: mission?.slug ?? null,
          };
        });

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        let dStr = `M ${nodes[0].x} ${nodes[0].y}`;

        for (let i = 0; i < nodes.length - 1; i++) {
          const current = nodes[i];
          const next = nodes[i + 1];
          const midX = (current.x + next.x) / 2;
          dStr += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
        }

        path.setAttribute("d", dStr);
        path.setAttribute("class", "eco-path-line");
        svg.appendChild(path);

        const nodeElements: SVGGElement[] = [];
        nodes.forEach((node) => {
          const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
          group.setAttribute("class", `stage-node node-${node.status}`);
          group.setAttribute("transform", `translate(${node.x}, ${node.y}) scale(0)`);

          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("cx", "0");
          circle.setAttribute("cy", "0");
          circle.setAttribute("r", node.status === "active" ? "22" : "18");

          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.textContent = node.id.toString();

          group.appendChild(circle);
          group.appendChild(text);
          svg.appendChild(group);

          // النقر على عقدة غير مقفلة يفتح صفحة المهمة الحقيقية
          if (node.slug) {
            group.style.cursor = node.status === "locked" ? "not-allowed" : "pointer";
            group.addEventListener("click", () => {
              if (node.status !== "locked") navigate(`/missions/${node.slug}`);
            });
          }

          nodeElements.push(group);

          if (node.status === "active") {
            indicator.style.left = `${node.x}px`;
            indicator.style.top = `${node.y}px`;
            const missionLabel = document.getElementById("current-mission-name");
            if (missionLabel) missionLabel.textContent = `Mission ${node.id}: ${node.mission}`;
          }
        });

        const mapTl = gsap.timeline();

        const pathLength = path.getTotalLength();
        path.style.strokeDasharray = pathLength.toString();
        path.style.strokeDashoffset = pathLength.toString();

        mapTl.to(path, { strokeDashoffset: 0, duration: 2, ease: "power2.inOut" });

        mapTl.to(nodeElements, { scale: 1, duration: 0.6, stagger: 0.15, ease: "back.out(1.5)" }, "-=1.5");

        mapTl.to(indicator, { opacity: 1, y: -10, duration: 0.6, ease: "power2.out" }, "-=0.5");

        gsap.to(indicator, {
          y: 0,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      };

      const triggerStageFour = () => {
        if (currentStage === 4) return;
        currentStage = 4;
        const tl = gsap.timeline();

        tl.to(
          "#combined-map-container",
          // كانت تتلاشى وتُطمس — الآن تبقى ظاهرة وتستقر كخريطة ميدانية على اليسار
          { opacity: 1, scale: 0.66, filter: "none", duration: 0.8, ease: "power2.inOut" },
          0
        ).to(
          ["#split-left", "#split-right"],
          { opacity: 0, y: -20, duration: 0.6, ease: "power2.inOut" },
          0
        );

        tl.to(
          "#character-group",
          { y: "36vh", scale: 0.45, duration: 1.2, ease: "power3.inOut" },
          0
        );

        tl.add(() => {
          animateDashedSevenLines();
        }, 0.5);
      };

      // المرحلة الأولى: زر البدء -> توسيط الشخصية -> عرض القصة
      const startBtn = document.getElementById("start-btn");
      if (startBtn) {
        startBtn.addEventListener("click", () => {
          if (currentStage !== 1) return;
          currentStage = 2;
          const tl = gsap.timeline();

          tl.to("#hero-content", { opacity: 0, y: -30, duration: 0.5, ease: "power2.inOut" });
          tl.to(
            "#character-group",
            { y: "-10vh", scale: 1.1, duration: 1.2, ease: "back.out(1.2)" },
            "-=0.3"
          );

          // حركة الشخصية ثلاثية الأبعاد.
          // مهم: ملف GLB قد لا يكون جاهزاً لحظة النقر، لذا ننتظره بدل تجاهل الحركة.
          const animateCharacterForStory = () => {
            if (!characterModel) return false;
            gsap.to(characterModel.position, {
              x: 0,
              y: -0.85,
              z: 0.5,
              duration: 1.2,
              ease: "back.out(1.2)",
            });
            gsap.to(characterModel.scale, {
              x: 1.4,
              y: 1.4,
              z: 1.4,
              duration: 1.2,
              ease: "back.out(1.2)",
            });
            return true;
          };
          if (!animateCharacterForStory()) {
            const waitStartedAt = Date.now();
            const waitForModel = window.setInterval(() => {
              if (animateCharacterForStory() || Date.now() - waitStartedAt > 10000) {
                window.clearInterval(waitForModel);
              }
            }, 100);
          }

          tl.to(
            "#radar-ring",
            { opacity: 1, scale: 1, rotation: 180, duration: 1.2, ease: "power3.out" },
            "-=1.2"
          );

          tl.to("#progress-container", { opacity: 1, duration: 0.5 }, "-=0.5");

          const slideGroups = document.querySelectorAll(".story-slide-group");
          const fills = document.querySelectorAll(".progress-fill");

          const slideDuration = 6;
          const storyTl = gsap.timeline({ delay: 0.5 });

          slideGroups.forEach((group, index) => {
            const isLast = index === slideGroups.length - 1;
            const titles = group.querySelectorAll(".story-title");
            const desc = group.querySelector(".story-desc");

            storyTl.to(
              fills[index],
              {
                width: "100%",
                duration: slideDuration,
                ease: "none",
                // دفتر الميدان: صوت قلب صفحة عند بدء الشريحة
                onStart: () => journalSfx.flip(),
              },
              "startSlide" + index
            );

            storyTl.fromTo(
              titles,
              { opacity: 0, scale: 0.8, y: 20 },
              {
                opacity: 1,
                scale: 1,
                y: 0,
                duration: 0.8,
                stagger: 0.4,
                ease: "back.out(1.5)",
                // دفتر الميدان: خدش قلم عند ظهور العنوان
                onStart: () => journalSfx.pencil(),
              },
              "startSlide" + index
            );

            storyTl.fromTo(
              desc,
              { opacity: 0, y: 20 },
              {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power2.out",
                // دفتر الميدان: الوصف يُكتب حرفًا بحرف
                onStart: () => {
                  void typewriter(desc as HTMLElement | null, 22);
                },
              },
              `startSlide${index}+=${0.4 + titles.length * 0.4}`
            );

            if (!isLast) {
              storyTl.to(
                [titles, desc],
                { opacity: 0, y: -30, duration: 0.6, stagger: 0.1, ease: "power2.in" },
                `startSlide${index}+=${slideDuration - 0.8}`
              );
            } else {
              storyTl.add(() => {
                triggerMapPhase();
              }, `startSlide${index}+=${slideDuration}`);
            }
          });
        });
      }
    }, containerRef);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (ctx) ctx.revert();
      if (disposePod) disposePod();

      // مغادرة اللعبة: أعد التمرير لبقية صفحات المنصة
      // (CSS اللعبة يثبّت body عند overflow:hidden فيبقى مؤثرًا بعد الانتقال)
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
      document.body.style.height = "auto";
      document.documentElement.style.height = "auto";
    };
  }, []);

  /**
   * دفتر الميدان — طبقة الحركة والصوت (إضافية بالكامل).
   *
   * تعمل بالمراقبة والاستماع فقط ولا تُعدّل أي منطق قائم:
   *  - ضغط زر البدء  → طرقة ختم + اهتزاز الورق
   *  - ظهور عقد الإمارات السبع → تتختم واحدة تلو الأخرى مع غبار وحلقة حبر
   *  - ظهور عقد المهام → تتختم كذلك
   *  - النقر على أي عقدة → دبوس + حلقة حبر (السلوك الأصلي للنقر يبقى كما هو)
   */
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const timers: number[] = [];
    const cleanups: Array<() => void> = [];
    const visual = () => !prefersReducedMotion();

    // 1) زر البدء: ختم مطاطي على الورق
    const startBtn = document.getElementById("start-btn");
    const storyContainer = document.getElementById("story-container");
    const heroContent = document.getElementById("hero-content");
    // قبل بدء القصة: لا لوح ورقي (كي لا تظهر بطاقة فارغة)
    storyContainer?.classList.remove("fj-story-active");
    const handleStartClick = () => {
      journalSfx.stamp();
      if (visual()) {
        paperShake(root, 2);
        stampIn(startBtn, { intensity: 0.5 });
      }
      // مهم: بطاقة البداية تصبح شفافة لكنها تبقى تحجب النقر فوق الإمارات
      // (كانت تمنع النقر على أبوظبي ودبي والشارقة). نُعطّل تفاعلها فورًا.
      if (heroContent) heroContent.style.pointerEvents = "none";
      // بعد انزياح شاشة البدء: أظهر لوح الورق خلف نص القصة
      const showPanel = window.setTimeout(() => storyContainer?.classList.add("fj-story-active"), 900);
      // وبعد انتهاء الشريحتين: أخفِه ليظهر مسار الخرائط
      const hidePanel = window.setTimeout(() => storyContainer?.classList.remove("fj-story-active"), 15000);
      timers.push(showPanel, hidePanel);
    };
    startBtn?.addEventListener("click", handleStartClick);
    cleanups.push(() => startBtn?.removeEventListener("click", handleStartClick));

    // 2) عقد الإمارات: كاسكيد ختم
    const stampEmirates = () => {
      const groups = Array.from(document.querySelectorAll(".emirate-group"));
      if (!groups.length) return;
      journalSfx.flip();
      // الحاوية المجمّعة كانت تلتقط النقر فوق العقد (z-index 15): نُعطّلها الآن
      const mapBox = document.getElementById("combined-map-container");
      if (mapBox) mapBox.style.pointerEvents = "none";
      groups.forEach((group, index) => {
        const timer = window.setTimeout(() => {
          if (!group.isConnected) return;
          journalSfx.stamp();
          if (visual()) {
            stampIn(group, { intensity: 0.9 });
            puffAt(group, 4);
            inkRing(group);
          }
        }, 420 + index * 150);
        timers.push(timer);
      });
    };
    const linesSvg = document.getElementById("lines-svg");
    if (linesSvg) {
      const observer = new MutationObserver(() => {
        if (document.querySelectorAll(".emirate-group").length) {
          observer.disconnect();
          stampEmirates();
        }
      });
      observer.observe(linesSvg, { childList: true, subtree: true });
      cleanups.push(() => observer.disconnect());
    }

    // 3) عقد المهام على مسار الرحلات
    const journeySvg = document.getElementById("journey-svg");
    if (journeySvg) {
      const journeyObserver = new MutationObserver(() => {
        const nodes = Array.from(journeySvg.querySelectorAll(".stage-node"));
        if (!nodes.length) return;
        journeyObserver.disconnect();
        nodes.forEach((node, index) => {
          const timer = window.setTimeout(() => {
            if (!node.isConnected) return;
            journalSfx.pin();
            if (visual()) stampIn(node, { intensity: 0.6 });
          }, index * 110);
          timers.push(timer);
        });
      });
      journeyObserver.observe(journeySvg, { childList: true, subtree: true });
      cleanups.push(() => journeyObserver.disconnect());
    }

    // 4) لمس أي عقدة: دبوس + حلقة حبر (capture فقط، لا يمنع النقر الأصلي)
    const handleNodePointer = (event: Event) => {
      const target = event.target as Element | null;
      const node =
        target && typeof target.closest === "function" ? target.closest(".emirate-group, .stage-node") : null;
      if (!node) return;
      journalSfx.pin();
      if (visual()) inkRing(node, true);
      if (node.classList.contains("stage-node")) journalSfx.chime();
    };
    root.addEventListener("pointerdown", handleNodePointer, true);
    cleanups.push(() => root.removeEventListener("pointerdown", handleNodePointer, true));

    // 5) دوائر الإمارات = المراحل الفعلية: النقر يفتح مهمة تلك الإمارة
    const openEmirateMission = (event: Event) => {
      const target = event.target as Element | null;
      const node =
        target && typeof target.closest === "function" ? target.closest(".emirate-group") : null;
      if (!node) return;
      const groups = Array.from(document.querySelectorAll(".emirate-group"));
      const index = groups.indexOf(node);
      const mission = progressRef.current.missions[index];
      if (mission && (mission as { slug?: string }).slug) {
        navigate(`/missions/${(mission as { slug?: string }).slug}`);
      }
    };
    root.addEventListener("click", openEmirateMission);
    cleanups.push(() => root.removeEventListener("click", openEmirateMission));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      cleanups.forEach((fn) => fn());
      // إعادة تفاعل بطاقة البداية عند مغادرة الصفحة (حتى لا يبقى معطّلًا)
      if (heroContent) heroContent.style.pointerEvents = "";
    };
  }, []);

  return (
    <section ref={containerRef} className="hero-section">
      {/* ===== دفتر الميدان: طبقة زينة بصرية (لا تتفاعل ولا تؤثر على أي منطق) ===== */}
      <div className="fj-deco" aria-hidden="true">
        <span className="fj-grain" />
        <span className="fj-fibers" />
        <span className="fj-tape fj-tape-1" />
        <span className="fj-tape fj-tape-2" />
        <span className="fj-clip" />
        <span className="fj-coffee" />
        <span className="fj-colorbar">
          <i style={{ background: "#f3e8d4" }} />
          <i style={{ background: "#5d7d4a" }} />
          <i style={{ background: "#c2912b" }} />
          <i style={{ background: "#ab4a26" }} />
          <i style={{ background: "#2b5a55" }} />
          <i style={{ background: "#22302a" }} />
        </span>
      </div>

      {/* زر كتم الصوت (عنصر جديد مستقل) */}
      <button
        type="button"
        className="fj-sound"
        data-muted={soundMuted ? "1" : "0"}
        onClick={() => setSoundMuted(journalSfx.toggle())}
        aria-label={soundMuted ? "Unmute sound" : "Mute sound"}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9v6h3l5 4V5L7 9H4z" />
          {soundMuted ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M16 8.5a5 5 0 010 7" />}
        </svg>
        <span>{soundMuted ? "SOUND OFF" : "SOUND ON"}</span>
      </button>

      <canvas id="star-canvas"></canvas>

      <img
        src={p1}
        className="floating-asteroid particle-p1"
        style={{ top: "15%", left: "10%" }}
        data-speed="0.08"
        alt=""
      />
      <img
        src={p2}
        className="floating-asteroid particle-p2"
        style={{ top: "25%", right: "12%" }}
        data-speed="0.05"
        alt=""
      />
      <img
        src={p3}
        className="floating-asteroid particle-p3"
        style={{ bottom: "18%", left: "8%" }}
        data-speed="0.09"
        alt=""
      />
      <img
        src={p4}
        className="floating-asteroid particle-p4"
        style={{ bottom: "20%", right: "10%" }}
        data-speed="0.06"
        alt=""
      />
      <img
        src={p5}
        className="floating-asteroid particle-p5"
        style={{ top: "10%", right: "35%" }}
        data-speed="0.04"
        alt=""
      />
      <img
        src={p6}
        className="floating-asteroid particle-p6"
        style={{ bottom: "12%", left: "30%" }}
        data-speed="0.07"
        alt=""
      />

      {/* النصوص الرئيسية للبداية */}
      <div className="hero-content" id="hero-content">
        <h1 className="hero-title">
          Explore the UAE.
          <br />
          Protect Our Future.
        </h1>
        <p
          style={{
            color: "#a7f3d0",
            marginBottom: "25px",
            fontSize: "1.2rem",
            fontWeight: 500,
          }}
        >
          Um Al Emarat School | Teacher: Riham Saleh
        </p>
        <button className="cta-button" id="start-btn">
          <span>Begin Eco Mission</span>
          <div className="btn-arrow">→</div>
        </button>
      </div>

      {/* مجموعة الشخصية والدائرة الخضراء */}
      <div
        id="character-group"
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          zIndex: 5,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <div className="radar-ring" id="radar-ring"></div>
        <div id="pod-container" className="pod-wrapper"></div>
      </div>

      {/* حاوية عرض القصة (بو غصن) */}
      <div id="story-container">
        <div className="story-slide-group">
          <div
            className="story-title"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              marginBottom: "5px",
              color: "#ffffff",
              textShadow: "0 0 15px rgba(255, 255, 255, 0.5)",
            }}
          >
            MEET BU GHOSN
          </div>
          <div
            className="story-title"
            style={{
              fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
              color: "#00ff88",
              marginBottom: "15px",
              fontWeight: 700,
              textShadow: "0 0 15px rgba(0, 255, 136, 0.5)",
            }}
          >
            بو غصن
          </div>
          <div className="story-desc" style={{ color: "#ffffff" }}>
            Your official eco-guide for this adventure.
          </div>
        </div>

        <div className="story-slide-group">
          <div
            className="story-title"
            style={{
              color: "#ffffff",
              textShadow: "0 0 25px rgba(255, 255, 255, 0.45)",
              fontSize: "clamp(1.9rem, 3.4vw, 2.9rem)",
              marginBottom: "15px",
              lineHeight: 1.3,
            }}
          >
            HELP BU GHOSN SAVE HIS FRIENDS ACROSS THE UAE.
          </div>
          <div className="story-desc" style={{ color: "#ffffff" }}>
            Take action, earn points, and become a changemaker.
          </div>
        </div>
      </div>

      {/* شريط التقدم */}
      <div className="progress-container" id="progress-container">
        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>
      </div>

      {/* الخريطة المجمعة */}
      <div id="combined-map-container">
        <div className="combined-map-hologram"></div>
      </div>

      {/* الشاشة الثانية (تظهر مع الخريطة المجمعة) */}
      <div className="split-screen" id="split-screen">
        <div className="split-text split-left" id="split-left">
          7 Emirates.
          <br />7 Eco Challenges.
        </div>
        <div
          className="split-text split-right"
          id="split-right"
          style={{ fontSize: "1.6rem", color: "#00ff88" }}
        >
          Click the map
          <br />
          to deploy challenges.
        </div>
      </div>

      {/* الخطوط المنقوطة والخرائط الفردية */}
      <svg id="lines-svg" className="lines-svg"></svg>

      {/* مسار اللعبة التفاعلي */}
      <div id="journey-container">
        <svg id="journey-svg" width="100%" height="100%"></svg>
        <div id="player-indicator" className="player-indicator" style={{ opacity: 0 }}>
          <div className="indicator-card">
            <div className="indicator-title">You Are Here</div>
            <div className="indicator-mission" id="current-mission-name">
              Mission 1: Waste Audit
            </div>
          </div>
          <div className="indicator-arrow"></div>
        </div>
      </div>
    </section>
  );
}
