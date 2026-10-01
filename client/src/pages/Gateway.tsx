import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Gamepad2, Globe } from "lucide-react";

export default function Gateway() {
  const [, setLocation] = useLocation();

  // دالة التوجيه الذكية: تحفظ خيار المستخدم وتأخذه لصفحة الدخول
  const handleSelection = (destinationPath: string) => {
    // تشفير المسار لضمان عدم حدوث أخطاء في الرابط
    const encodedPath = encodeURIComponent(destinationPath);
    setLocation(`/login?redirectTo=${encodedPath}`);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#04100d] overflow-hidden font-[family-name:var(--font-inter)]">
      
      {/* خلفية جمالية بسيطة (تأثير النجوم أو الإضاءة) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0a2922] via-[#04100d] to-[#04100d] opacity-80" />
      
      <div className="relative z-10 flex flex-col items-center w-full max-w-5xl px-6">
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff88] to-[#00b3ff]">Tomorrow's Earth Expo</span>
          </h1>
          <p className="text-[#a7f3d0] text-lg md:text-xl font-medium">
            Um Al Emarat School • Choose your experience
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          
          {/* المربع الأول: بوابة اللعبة (Eco-Journey) */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ scale: 1.03, translateY: -8 }}
            whileTap={{ scale: 0.98 }}
           onClick={() => handleSelection("/eco-journey")} // استبدل المسار بمسار اللعبة الحقيقي
            className="group relative cursor-pointer rounded-3xl p-[2px] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88] to-[#0a2922] opacity-40 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative h-full w-full bg-[#061814]/90 backdrop-blur-xl rounded-[22px] p-8 flex flex-col items-center text-center border border-[#00ff88]/20 group-hover:border-[#00ff88]/60 transition-colors">
              <div className="w-20 h-20 rounded-full bg-[#00ff88]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 group-hover:shadow-[0_0_30px_rgba(0,255,136,0.4)]">
                <Gamepad2 size={40} className="text-[#00ff88]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Eco-Journey Game</h2>
              <p className="text-gray-400 leading-relaxed">
                Join Bu Ghosn on an interactive 3D adventure across the 7 Emirates. Complete challenges and save the environment.
              </p>
              <div className="mt-8 text-[#00ff88] font-semibold flex items-center gap-2 group-hover:gap-4 transition-all">
                Start Playing <span aria-hidden="true">→</span>
              </div>
            </div>
          </motion.div>

          {/* المربع الثاني: البوابة الأكاديمية (الموقع الرئيسي) */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            whileHover={{ scale: 1.03, translateY: -8 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelection("/dashboard")} // مسار لوحة تحكم الطالب/المعلم
            className="group relative cursor-pointer rounded-3xl p-[2px] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00b3ff] to-[#041018] opacity-40 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative h-full w-full bg-[#041018]/90 backdrop-blur-xl rounded-[22px] p-8 flex flex-col items-center text-center border border-[#00b3ff]/20 group-hover:border-[#00b3ff]/60 transition-colors">
              <div className="w-20 h-20 rounded-full bg-[#00b3ff]/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 group-hover:shadow-[0_0_30px_rgba(0,179,255,0.4)]">
                <Globe size={40} className="text-[#00b3ff]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Expo Platform</h2>
              <p className="text-gray-400 leading-relaxed">
                Access the main academic platform. Explore student projects, submit research, and view teacher analytics.
              </p>
              <div className="mt-8 text-[#00b3ff] font-semibold flex items-center gap-2 group-hover:gap-4 transition-all">
                Enter Expo <span aria-hidden="true">→</span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}