import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import gsap from "gsap";
import { useAuth } from "../../_core/hooks/useAuth";
import { supabase } from "../../lib/supabase";
import "./EcoJourney.css";

// استيراد الصور العائمة (تأكد من مطابقة الأسماء لما وضعته في المجلد)
import p1 from "../../assets/illustrations/p1.png";
import p2 from "../../assets/illustrations/p2.png";
import p3 from "../../assets/illustrations/p3.png";

// إذا قمت بنقل ملفات threeScene.ts و animations.ts إلى نفس المجلد، قم بإلغاء تعليق هذه السطور:
import { init3DPod, characterModel } from "./threeScene";
import {  initConstellationCanvas } from "./animations";

export default function EcoJourney() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [completedMissions, setCompletedMissions] = useState<number[]>([]);
  const [currentStage, setCurrentStage] = useState(1);

  // المراجع (Refs) لربط DOM بـ GSAP و Three.js
  const containerRef = useRef<HTMLDivElement>(null);
  const podContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgLinesRef = useRef<SVGSVGElement>(null);
  const journeySvgRef = useRef<SVGSVGElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  // 1. جلب بيانات اللاعب من Supabase
  useEffect(() => {
    const fetchProgress = async () => {
      if (user) {
        // افترضنا وجود جدول user_progress، عدّله حسب هيكلة قاعدة بياناتك
        const { data } = await supabase
          .from("user_progress")
          .select("completed_missions")
          .eq("user_id", user.id)
          .single();
        if (data) setCompletedMissions(data.completed_missions || []);
      }
    };
    fetchProgress();
  }, [user]);

  // 2. تهيئة البيئة والأنيميشن
  useEffect(() => {
    if (podContainerRef.current) init3DPod(podContainerRef.current);
    
    const starPoints = [
      {x: window.innerWidth * 0.2, y: window.innerHeight * 0.3},
      {x: window.innerWidth * 0.35, y: window.innerHeight * 0.15},
      {x: window.innerWidth * 0.65, y: window.innerHeight * 0.2},
      {x: window.innerWidth * 0.8, y: window.innerHeight * 0.35}
    ];
    if (canvasRef.current) initConstellationCanvas(canvasRef.current, starPoints);

    const ctx = gsap.context(() => {
      // تفاعل الماوس مع العناصر والخلفية
      window.addEventListener("mousemove", handleMouseMove);
    }, containerRef);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      ctx.revert(); // تنظيف الأنيميشن عند الخروج من الصفحة
    };
  }, []);

  const handleMouseMove = (e: MouseEvent) => {
    const mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    const mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    gsap.to(".floating-asteroid", {
      x: mouseX * 25,
      y: mouseY * 25,
      duration: 1,
      ease: "power2.out",
    });
    // if (characterModel) {
    //   gsap.to(characterModel.rotation, { y: mouseX * 0.4, x: mouseY * 0.15, duration: 1.2 });
    // }
  };

  // 3. تسلسل أحداث اللعبة (القصة -> الخريطة -> المسار)
  const startMission = () => {
    if (currentStage !== 1) return;
    setCurrentStage(2);

    const tl = gsap.timeline();
    tl.to("#hero-content", { opacity: 0, y: -30, duration: 0.5 })
      .to("#character-group", { y: "-10vh", scale: 1.1, duration: 1.2, ease: "back.out(1.2)" }, "-=0.3")
      .to("#radar-ring", { opacity: 1, scale: 1, rotation: 180, duration: 1.2 }, "-=1.2");

    // بعد انتهاء القصة، استدعِ الانتقال للخريطة
    setTimeout(() => triggerMapPhase(), 6000);
  };

  const triggerMapPhase = () => {
    setCurrentStage(3);
    const tl = gsap.timeline();
    tl.to(".story-slide-group", { opacity: 0, y: -30, duration: 0.5 })
      .to("#character-group", { y: "28vh", scale: 0.65, duration: 1.2, ease: "back.out(1.2)" })
      .to("#combined-map-container", { opacity: 1, scale: 1, duration: 1.2 }, "-=0.6");
  };

  const triggerStageFour = () => {
    if (currentStage === 4) return;
    setCurrentStage(4);
    const tl = gsap.timeline();
    tl.to("#combined-map-container", { opacity: 0, scale: 1.2, filter: "blur(10px)", duration: 0.8 })
      .to("#character-group", { y: "36vh", scale: 0.45, duration: 1.2, ease: "power3.inOut" });

    // استدعاء رسم المسار
    setTimeout(() => drawJourneyMap(), 1000);
  };

  const drawJourneyMap = () => {
    const svg = journeySvgRef.current;
    if (!svg) return;
    
    gsap.to("#journey-container", { opacity: 1, duration: 1 });

    const width = svg.clientWidth || window.innerWidth * 0.9;
    const height = svg.clientHeight || window.innerHeight * 0.6;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const nodes = [
      { id: 1, x: width * 0.15, y: height * 0.80, mission: "Waste Audit" },
      { id: 2, x: width * 0.30, y: height * 0.65, mission: "Water Conservation" },
      { id: 3, x: width * 0.25, y: height * 0.40, mission: "Renewable Energy" },
      { id: 4, x: width * 0.45, y: height * 0.25, mission: "Forest Biodiversity" },
      { id: 5, x: width * 0.65, y: height * 0.45, mission: "Ocean Protection" },
      { id: 6, x: width * 0.80, y: height * 0.30, mission: "Sustainable Food" },
      { id: 7, x: width * 0.90, y: height * 0.60, mission: "Climate Innovation" }
    ];

    let dStr = `M ${nodes[0].x} ${nodes[0].y}`;
    for (let i = 0; i < nodes.length - 1; i++) {
      const midX = (nodes[i].x + nodes[i + 1].x) / 2;
      dStr += ` C ${midX} ${nodes[i].y}, ${midX} ${nodes[i + 1].y}, ${nodes[i + 1].x} ${nodes[i + 1].y}`;
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", dStr);
    path.setAttribute("class", "eco-path-line");
    svg.appendChild(path);

    nodes.forEach((node) => {
      // تحديد حالة المرحلة بناءً على بيانات اللاعب من Supabase
      const isCompleted = completedMissions.includes(node.id);
      const isActive = completedMissions.length + 1 === node.id;
      const status = isCompleted ? "completed" : isActive ? "active" : "locked";

      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("class", `stage-node node-${status}`);
      group.setAttribute("transform", `translate(${node.x}, ${node.y}) scale(0)`);
      
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("r", isActive ? "22" : "18");

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.textContent = node.id.toString();

      group.appendChild(circle);
      group.appendChild(text);
      
      // التوجيه عند النقر على المرحلة
      group.style.cursor = status === "locked" ? "not-allowed" : "pointer";
      group.addEventListener("click", () => {
        if (status !== "locked") setLocation(`/mission/${node.id}`);
      });

      svg.appendChild(group);
      
      if (isActive && indicatorRef.current) {
        indicatorRef.current.style.left = `${node.x}px`;
        indicatorRef.current.style.top = `${node.y}px`;
        const missionLabel = document.getElementById("current-mission-name");
        if (missionLabel) missionLabel.textContent = `Mission ${node.id}: ${node.mission}`;
      }
      
      gsap.to(group, { scale: 1, duration: 0.6, delay: 1 + node.id * 0.1, ease: "back.out(1.5)" });
    });
  };

  return (
    <div ref={containerRef} className="hero-section relative w-full h-screen bg-[#04100d] overflow-hidden font-[family-name:var(--font-inter)]">
      <canvas ref={canvasRef} id="star-canvas" className="absolute inset-0 z-0"></canvas>
      
      <img src={p1} className="floating-asteroid absolute z-0 w-12 opacity-60" style={{ top: '15%', left: '10%' }} alt="" />
      <img src={p2} className="floating-asteroid absolute z-0 w-8 opacity-40" style={{ top: '25%', right: '12%' }} alt="" />
      <img src={p3} className="floating-asteroid absolute z-0 w-16 opacity-50" style={{ bottom: '18%', left: '8%' }} alt="" />

      {currentStage === 1 && (
        <div id="hero-content" className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">Explore the UAE.<br/>Protect Our Future.</h1>
          <button onClick={startMission} className="px-8 py-4 bg-[#00ff88] text-[#04100d] rounded-full font-bold text-lg hover:scale-105 transition-transform">
            Begin Eco Mission →
          </button>
        </div>
      )}

      <div id="character-group" className="absolute z-10 w-[600px] h-[600px] left-1/2 -translate-x-1/2 flex justify-center items-center pointer-events-none">
        <div id="radar-ring" className="radar-ring opacity-0 scale-50"></div>
        <div ref={podContainerRef} className="pod-wrapper"></div>
      </div>

      <div id="combined-map-container" className="absolute z-30 opacity-0 scale-50 pointer-events-none" onClick={triggerStageFour}>
        <div className="combined-map-hologram w-[400px] h-[400px] bg-cover bg-center cursor-pointer" style={{ backgroundImage: "url('/new uae.svg')" }}></div>
      </div>

      <svg ref={svgLinesRef} id="lines-svg" className="absolute inset-0 z-20 w-full h-full pointer-events-none"></svg>

      <div id="journey-container" className="absolute top-[5%] left-[5%] w-[90%] h-[60vh] z-40 opacity-0 pointer-events-none">
        <svg ref={journeySvgRef} id="journey-svg" className="w-full h-full"></svg>
        <div ref={indicatorRef} id="player-indicator" className="player-indicator opacity-0 transition-all duration-300">
          <div className="indicator-card">
            <div className="indicator-title">You Are Here</div>
            <div className="indicator-mission" id="current-mission-name">Loading...</div>
          </div>
          <div className="indicator-arrow"></div>
        </div>
      </div>
    </div>
  );
}