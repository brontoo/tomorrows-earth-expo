import { useEffect, useRef, useState } from "react";
import { init3DPod } from "./threeScene";
import { initConstellationCanvas } from "./animations";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Battery, Recycle, ArrowRight } from "lucide-react";

export default function EcoJourney() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const podContainerRef = useRef<HTMLDivElement>(null);
  
  // نظام التحكم في مراحل اللعبة
  const [stage, setStage] = useState<"intro" | "map_view" | "mission_1">("intro");

  useEffect(() => {
    // تشغيل النجوم والخلفية
    if (canvasRef.current) {
      const starPoints = [
        { x: window.innerWidth * 0.2, y: window.innerHeight * 0.3 },
        { x: window.innerWidth * 0.35, y: window.innerHeight * 0.15 },
        { x: window.innerWidth * 0.65, y: window.innerHeight * 0.2 },
        { x: window.innerWidth * 0.8, y: window.innerHeight * 0.35 }
      ];
      initConstellationCanvas(canvasRef.current, starPoints);
    }

    // تشغيل الـ 3D (بو غصن حالياً - وقريباً الروبوت)
    if (podContainerRef.current) {
      init3DPod(podContainerRef.current);
    }
  }, []);

  const handleBeginMission = () => {
    // هنا يمكننا لاحقاً إضافة كود GSAP لتحريك الكاميرا نحو الخريطة
    setStage("map_view");
  };

  return (
    <div className="relative w-full h-screen bg-[#04100d] overflow-hidden font-sans">
      {/* طبقة الخلفية النجمية */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-50" />
      
      {/* طبقة العرض ثلاثي الأبعاد (الشخصية والخريطة) */}
      <div ref={podContainerRef} className="absolute inset-0 z-10 pointer-events-none" />

      {/* طبقة واجهة المستخدم (UI Overlay) */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
        
        <AnimatePresence mode="wait">
          {/* المرحلة الأولى: شاشة الترحيب */}
          {stage === "intro" && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
              className="text-center pointer-events-auto mt-64"
            >
              <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4 tracking-tight drop-shadow-2xl">
                Eco-Bot <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff88] to-[#00b3ff]">Awakens</span>
              </h1>
              <p className="text-[#a7f3d0] text-xl mb-8 max-w-lg mx-auto drop-shadow-md">
                The UAE needs your help to restore the environment. Join the mission to clean, recycle, and power the future.
              </p>
              <button 
                onClick={handleBeginMission}
                className="group relative px-8 py-4 bg-[#00ff88]/10 hover:bg-[#00ff88]/20 border border-[#00ff88]/50 rounded-full text-[#00ff88] font-bold text-lg transition-all duration-300 backdrop-blur-md overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#00ff88]/0 via-[#00ff88]/10 to-[#00ff88]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="flex items-center gap-2">
                  Begin Eco Mission <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </motion.div>
          )}

          {/* المرحلة الثانية: خريطة الإمارات السبع */}
          {stage === "map_view" && (
            <motion.div 
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 pointer-events-auto"
            >
              {/* لوحة تحكم علوية تظهر طاقة الروبوت */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-6 bg-[#041018]/80 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-full shadow-2xl">
                <div className="flex items-center gap-2 text-white">
                  <Battery className="text-[#00ff88]" /> <span className="font-bold">Energy: 45%</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <Recycle className="text-[#00b3ff]" /> <span className="font-bold">Scrap: 0/100</span>
                </div>
              </div>

              {/* بطاقة المهمة أسفل الشاشة */}
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-black/60 backdrop-blur-2xl border border-[#00ff88]/30 p-6 rounded-3xl flex items-center justify-between"
              >
                <div>
                  <h3 className="text-[#00ff88] font-bold text-xl mb-1 flex items-center gap-2">
                    <MapPin size={20} /> Abu Dhabi - Mangrove Cleanup
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Detecting plastic waste in the Eastern Mangroves. The Eco-Bot needs your guidance to sort the materials.
                  </p>
                </div>
                <button 
                  onClick={() => setStage("mission_1")}
                  className="bg-[#00ff88] text-black px-6 py-3 rounded-xl font-bold hover:bg-white transition-colors shrink-0 ml-4"
                >
                  Start Scan
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* المرحلة الثالثة: المهمة الأولى */}
          {stage === "mission_1" && (
            <motion.div 
              key="mission"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/40 backdrop-blur-sm"
            >
              <div className="bg-[#061814] border border-[#00ff88]/30 p-8 rounded-3xl max-w-md w-full text-center">
                <Recycle size={48} className="text-[#00ff88] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Sorting Mini-Game</h2>
                <p className="text-gray-400 mb-6">Here we will integrate the actual React mini-game for waste sorting.</p>
                <button 
                  onClick={() => setStage("map_view")}
                  className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 py-3 rounded-xl font-bold transition-colors"
                >
                  Back to Map
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
      </div>
    </div>
  );
}