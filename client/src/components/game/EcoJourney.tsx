// src/components/game/EcoJourney.tsx
// النسخة الكاملة (نفس نسختك المحلية vanilla) بعد نقلها إلى React بشكل سليم.
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { initFloatingParallax, initConstellationCanvas } from "./animations";
import { init3DPod, characterModel } from "./threeScene";
import "./EcoJourney.css";

// استيراد الصور
import p1 from "../../assets/illustrations/p1.png";
import p2 from "../../assets/illustrations/p2.png";
import p3 from "../../assets/illustrations/p3.png";
import p4 from "../../assets/illustrations/p4.png";
import p5 from "../../assets/illustrations/p5.png";
import p6 from "../../assets/illustrations/p6.png";

export default function EcoJourney() {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
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

        const startX = width / 2;
        const startY = height * 0.72;
        const endY = height * 0.42;

        const startXPercent = 0.1;
        const endXPercent = 0.9;
        const stepX = (endXPercent - startXPercent) / 6;

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
        const lineItems: { path: SVGPathElement; group: SVGGElement; length: number }[] = [];
        const ringElements: SVGCircleElement[] = [];

        for (let i = 0; i < 7; i++) {
          const endX = width * (startXPercent + i * stepX);
          const emirate = emiratesData[i];

          const controlX = startX + (endX - startX) * 0.5;
          const controlY = startY - (startY - endY) * 0.45;

          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          const dStr = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
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
            y: endY,
            scale: 0,
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

          lineItems.push({ path, group: positionWrapper, length });
        }

        const linesTl = gsap.timeline();

        lineItems.forEach((item, index) => {
          linesTl
            .to(
              item.path,
              { strokeDashoffset: 0, duration: 1.2, ease: "power2.out" },
              index * 0.25
            )
            .to(
              item.group,
              { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.5)" },
              "-=0.6"
            );

          gsap.to(item.path, {
            strokeDashoffset: -item.length,
            duration: 8,
            repeat: -1,
            ease: "none",
            delay: 2.5 + index * 0.25,
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

          finalTransitionTl
            .to(
              "#lines-svg",
              {
                y: "22vh",
                scale: 0.8,
                transformOrigin: "center center",
                duration: 1.4,
                ease: "power3.inOut",
              },
              0
            )
            .to(
              "#character-group",
              { y: "42vh", scale: 0.38, duration: 1.4, ease: "power3.inOut" },
              0
            );

          finalTransitionTl.add(() => {
            drawJourneyMap();
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

        const nodes = [
          { id: 1, x: width * 0.15, y: height * 0.8, status: "active", mission: "Waste Audit" },
          { id: 2, x: width * 0.3, y: height * 0.65, status: "locked", mission: "Water Conservation" },
          { id: 3, x: width * 0.25, y: height * 0.4, status: "locked", mission: "Renewable Energy" },
          { id: 4, x: width * 0.45, y: height * 0.25, status: "locked", mission: "Forest Biodiversity" },
          { id: 5, x: width * 0.65, y: height * 0.45, status: "locked", mission: "Ocean Protection" },
          { id: 6, x: width * 0.8, y: height * 0.3, status: "locked", mission: "Sustainable Food" },
          { id: 7, x: width * 0.9, y: height * 0.6, status: "locked", mission: "Climate Innovation" },
        ];

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
          { opacity: 0, scale: 1.2, filter: "blur(10px)", duration: 0.8, ease: "power2.inOut" },
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
              { width: "100%", duration: slideDuration, ease: "none" },
              "startSlide" + index
            );

            storyTl.fromTo(
              titles,
              { opacity: 0, scale: 0.8, y: 20 },
              { opacity: 1, scale: 1, y: 0, duration: 0.8, stagger: 0.4, ease: "back.out(1.5)" },
              "startSlide" + index
            );

            storyTl.fromTo(
              desc,
              { opacity: 0, y: 20 },
              { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
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
    };
  }, []);

  return (
    <section ref={containerRef} className="hero-section">
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
